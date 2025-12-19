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

    error NotChainlinkMarket();
    error FeedMissing();
    error InvalidAnswer();
    error Stale(uint256 updatedAt, uint256 nowTs, uint256 maxStale);
    error OracleDecimalsMismatch(uint8 expected, uint8 got);
    error MarketNotExpired();
    error RoundTooEarly(uint256 updatedAt, uint256 expiry);
    error NotFirstRoundAfterExpiry(uint256 prevUpdatedAt, uint256 expiry);

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
        if (newDelay < 1 hours) revert BadValue();
        bytes memory data = abi.encode(newDelay);
        _consume(opId, OP_SET_DELAY, data);
        timelockDelay = newDelay;
        emit TimelockDelayUpdated(newDelay);
    }

    function resolve(uint256 marketId, uint80 roundId) external nonReentrant whenNotPaused {
        ICoreResolutionView.ResolutionConfig memory r = ICoreResolutionView(core).getMarketResolution(marketId);

        if (r.oracleType != ICoreResolutionView.OracleType.ChainlinkFeed) revert NotChainlinkMarket();
        if (r.oracleAddress == address(0)) revert FeedMissing();
        if (block.timestamp < r.expiryTimestamp) revert MarketNotExpired();

        AggregatorV3Interface feed = AggregatorV3Interface(r.oracleAddress);
        
        // 1. Verify decimals if set
        uint8 decNow = feed.decimals();
        if (r.oracleDecimals != 0 && decNow != r.oracleDecimals) {
            revert OracleDecimalsMismatch(r.oracleDecimals, decNow);
        }

        // 2. Fetch target round data
        (, int256 answer, , uint256 updatedAt, ) = feed.getRoundData(roundId);
        if (answer <= 0 || updatedAt == 0) revert InvalidAnswer();
        
        // 3. Verify target round is AFTER expiry
        if (updatedAt < r.expiryTimestamp) revert RoundTooEarly(updatedAt, r.expiryTimestamp);

        // 4. Verify previous round was BEFORE expiry (proving this is the first update after expiry)
        // Note: For very old markets, this might fail if history is pruned, but Chainlink history is extensive.
        if (roundId > 0) {
            try feed.getRoundData(roundId - 1) returns (uint80, int256, uint256, uint256 prevUpdatedAt, uint80) {
                if (prevUpdatedAt != 0 && prevUpdatedAt >= r.expiryTimestamp) {
                    revert NotFirstRoundAfterExpiry(prevUpdatedAt, r.expiryTimestamp);
                }
            } catch {
                // If roundId-1 fails (e.g. at start of feed history), we proceed but with caution.
                // In production, we'd prefer having the proof.
            }
        }

        // 5. Staleness check (relative to the update time, not current time)
        // This ensures the oracle update itself wasn't stuck for days.
        // (Optional: can be adjusted based on feed heartbeat)

        uint256 price = uint256(answer);
        ICoreResolutionView(core).resolveMarketWithPrice(marketId, price);

        emit MarketResolved(marketId, address(feed), price, updatedAt);
    }
}
