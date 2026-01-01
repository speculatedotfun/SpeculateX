// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "./interfaces/AggregatorV3Interface.sol";

interface ICoreResolutionView {
    enum OracleType { None, ChainlinkFeed }
    struct ResolutionConfig {
        uint256 expiryTimestamp;
        OracleType oracleType;
        address oracleAddress;
        bytes32 priceFeedId;
        uint256 targetValue;
        uint8 comparison; // not used here
        bool yesWins;
        bool isResolved;
        uint8 oracleDecimals;
    }
    function getMarketResolution(uint256 id) external view returns (ResolutionConfig memory);
    function resolveMarketWithPrice(uint256 id, uint256 price) external;
}

contract ChainlinkResolver is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public timelockDelay = 24 hours;
    uint256 public maxStaleness  = 2 hours;
    uint256 public opNonce;

    address public core;

    enum OpStatus { None, Scheduled, Executed, Cancelled }
    struct Op {
        bytes32 tag;
        bytes32 dataHash;
        uint256 readyAt;
        OpStatus status;
    }
    mapping(bytes32 => Op) public ops;

    bytes32 public constant OP_SET_CORE      = keccak256("OP_SET_CORE");
    bytes32 public constant OP_SET_STALENESS = keccak256("OP_SET_STALENESS");
    bytes32 public constant OP_SET_DELAY     = keccak256("OP_SET_DELAY");
    bytes32 public constant OP_PAUSE         = keccak256("OP_PAUSE");
    bytes32 public constant OP_UNPAUSE       = keccak256("OP_UNPAUSE");

    event OpScheduled(bytes32 indexed opId, bytes32 indexed tag, uint256 readyAt);
    event OpExecuted(bytes32 indexed opId);
    event OpCancelled(bytes32 indexed opId);

    event CoreUpdated(address indexed newCore);
    event MaxStalenessUpdated(uint256 newMaxStaleness);
    event TimelockDelayUpdated(uint256 newDelay);

    event MarketResolved(uint256 indexed marketId, address indexed feed, uint256 price, uint256 updatedAt);

    error ZeroAddress();
    error BadValue();
    error OpInvalid();
    error OpNotReady(uint256 readyAt);
    error TagMismatch();
    error DataMismatch();
    error OpExpired();

    error NotChainlinkMarket();
    error FeedMissing();
    error InvalidAnswer();
    error Stale(uint256 updatedAt, uint256 nowTs, uint256 maxStale);
    error OracleDecimalsMismatch(uint8 expected, uint8 got);
    error MarketNotExpired();
    error RoundTooEarly(uint256 updatedAt, uint256 expiry);
    error NotFirstRoundAfterExpiry(uint256 prevUpdatedAt, uint256 expiry);
    error IncompleteRound();
    error UnsupportedDecimals();
    error InvalidRoundId();
    error PhaseBoundaryRound(); // M-01 Fix

    uint256 public constant MIN_TIMELOCK = 24 hours;
    uint256 public constant OP_EXPIRY_WINDOW = 7 days;

    constructor(address admin, address core_) {
        if (admin == address(0) || core_ == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        core = core_;
    }

    function scheduleOp(bytes32 tag, bytes calldata data) external onlyRole(ADMIN_ROLE) returns (bytes32 opId) {
        uint256 nonce_ = ++opNonce;
        opId = keccak256(abi.encode("RESOLVER_OP_V1", tag, keccak256(data), nonce_));
        if (ops[opId].status != OpStatus.None) revert OpInvalid();

        ops[opId] = Op({
            tag: tag,
            dataHash: keccak256(data),
            readyAt: block.timestamp + timelockDelay,
            status: OpStatus.Scheduled
        });

        emit OpScheduled(opId, tag, ops[opId].readyAt);
    }

    function _consume(bytes32 opId, bytes32 tag, bytes memory data) internal {
        Op storage op = ops[opId];
        if (op.status != OpStatus.Scheduled) revert OpInvalid();
        if (block.timestamp < op.readyAt) revert OpNotReady(op.readyAt);
        if (block.timestamp > op.readyAt + OP_EXPIRY_WINDOW) revert OpExpired();
        if (op.tag != tag) revert TagMismatch();
        if (op.dataHash != keccak256(data)) revert DataMismatch();
        op.status = OpStatus.Executed;
        emit OpExecuted(opId);
    }

    function executeSetCore(bytes32 opId, address newCore) external onlyRole(ADMIN_ROLE) {
        if (newCore == address(0)) revert ZeroAddress();
        bytes memory data = abi.encode(newCore);
        _consume(opId, OP_SET_CORE, data);
        core = newCore;
        emit CoreUpdated(newCore);
    }

    function executeSetMaxStaleness(bytes32 opId, uint256 newMax) external onlyRole(ADMIN_ROLE) {
        if (newMax == 0) revert BadValue();
        bytes memory data = abi.encode(newMax);
        _consume(opId, OP_SET_STALENESS, data);
        maxStaleness = newMax;
        emit MaxStalenessUpdated(newMax);
    }

    function executeSetDelay(bytes32 opId, uint256 newDelay) external onlyRole(ADMIN_ROLE) {
        if (newDelay < MIN_TIMELOCK) revert BadValue();
        bytes memory data = abi.encode(newDelay);
        _consume(opId, OP_SET_DELAY, data);
        timelockDelay = newDelay;
        emit TimelockDelayUpdated(newDelay);
    }

    function executePause(bytes32 opId) external onlyRole(ADMIN_ROLE) {
        _consume(opId, OP_PAUSE, "");
        _pause();
    }

    function executeUnpause(bytes32 opId) external onlyRole(ADMIN_ROLE) {
        _consume(opId, OP_UNPAUSE, "");
        _unpause();
    }

    function cancelOp(bytes32 opId) external onlyRole(ADMIN_ROLE) {
        Op storage op = ops[opId];
        if (op.status != OpStatus.Scheduled) revert OpInvalid();
        op.status = OpStatus.Cancelled;
        emit OpCancelled(opId);
    }

    /**
     * @notice Parse composite Chainlink round ID into phase and aggregator round
     * @dev Chainlink uses composite IDs: phaseId (upper 16 bits) | aggregatorRoundId (lower 64 bits)
     * @param roundId The composite round ID
     * @return phaseId The phase ID (upper 16 bits)
     * @return aggregatorRoundId The aggregator round ID (lower 64 bits)
     */
    function parseRoundId(uint80 roundId) internal pure returns (uint16 phaseId, uint64 aggregatorRoundId) {
        phaseId = uint16(roundId >> 64);
        aggregatorRoundId = uint64(roundId);
    }

    function resolve(uint256 marketId, uint80 roundId) external nonReentrant whenNotPaused {
        if (roundId == 0) revert InvalidRoundId();

        // M-01 Fix: Parse round ID to check for phase boundaries
        (uint16 phase, uint64 aggregatorRound) = parseRoundId(roundId);
        if (aggregatorRound == 0) revert PhaseBoundaryRound(); // Cannot verify previous round at phase boundary

        ICoreResolutionView.ResolutionConfig memory r = ICoreResolutionView(core).getMarketResolution(marketId);

        if (r.oracleType != ICoreResolutionView.OracleType.ChainlinkFeed) revert NotChainlinkMarket();
        if (r.oracleAddress == address(0)) revert FeedMissing();
        if (block.timestamp < r.expiryTimestamp) revert MarketNotExpired();

        AggregatorV3Interface feed = AggregatorV3Interface(r.oracleAddress);
        
        // 1. Verify decimals if set
        uint8 decNow = feed.decimals();
        if (decNow > 18) revert UnsupportedDecimals();
        if (r.oracleDecimals != 0 && decNow != r.oracleDecimals) {
            revert OracleDecimalsMismatch(r.oracleDecimals, decNow);
        }

        // 2. Fetch target round data
        (uint80 rid, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = feed.getRoundData(roundId);
        if (answer <= 0 || updatedAt == 0) revert InvalidAnswer();
        if (answeredInRound < rid) revert IncompleteRound();
        
        // 3. Verify target round is AFTER expiry
        if (updatedAt < r.expiryTimestamp) revert RoundTooEarly(updatedAt, r.expiryTimestamp);

        // 4. Verify previous round was BEFORE expiry (proving this is the first update after expiry)
        // This is critical to prevent round selection gaming - we must verify first-ness or revert
        // M-01 Fix: Construct previous round ID from same phase to avoid phase boundary issues
        uint80 prevRoundId = (uint80(phase) << 64) | (aggregatorRound - 1);

        // Must be able to fetch previous round to verify first-ness
        try feed.getRoundData(prevRoundId) returns (uint80, int256, uint256, uint256 prevUpdatedAt, uint80) {
            if (prevUpdatedAt >= r.expiryTimestamp) {
                revert NotFirstRoundAfterExpiry(prevUpdatedAt, r.expiryTimestamp);
            }
            // If we reach here, prevUpdatedAt < expiryTimestamp, so this round is the first after expiry
        } catch {
            // If previous round data is missing, we cannot verify first-ness.
            // For security, we must revert rather than allow potentially exploitable resolution.
            revert IncompleteRound();
        }

        // 5. Staleness check
        if (block.timestamp - updatedAt > maxStaleness) {
            revert Stale(updatedAt, block.timestamp, maxStaleness);
        }

        // 6. Normalize price to 1e18
        uint256 rawPrice = uint256(answer);
        uint256 normalizedPrice;
        if (decNow == 18) {
            normalizedPrice = rawPrice;
        } else if (decNow < 18) {
            normalizedPrice = rawPrice * (10**(18 - decNow));
        } else {
            normalizedPrice = rawPrice / (10**(decNow - 18));
        }

        ICoreResolutionView(core).resolveMarketWithPrice(marketId, normalizedPrice);

        emit MarketResolved(marketId, address(feed), normalizedPrice, updatedAt);
    }
}
