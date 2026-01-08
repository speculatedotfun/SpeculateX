// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "./interfaces/AggregatorV3Interface.sol";
import "./interfaces/AutomationCompatibleInterface.sol";

interface ICoreResolutionView {
    enum OracleType { None, ChainlinkFeed }
    struct ResolutionConfig {
        uint256 startTime;      // When trading becomes active (0 = immediate)
        uint256 expiryTimestamp;
        OracleType oracleType;
        address oracleAddress;
        bytes32 priceFeedId;
        uint256 targetValue;
        uint8 comparison; // Comparison enum (not used here)
        bool yesWins;
        bool isResolved;
        uint8 oracleDecimals;
    }
    function getMarketResolution(uint256 id) external view returns (ResolutionConfig memory);
    function resolveMarketWithPrice(uint256 id, uint256 price) external;
    function marketCount() external view returns (uint256);
}

contract ChainlinkResolver is AccessControl, ReentrancyGuard, Pausable, AutomationCompatibleInterface {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public timelockDelay = 24 hours;
    uint256 public maxStaleness  = 2 hours; // kept for backward compatibility / future use
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
    event MarketResolvedTwap(uint256 indexed marketId, address indexed feed, uint256 twapPrice, uint256 windowStart, uint256 windowEnd);
    event MarketResolvedLate(uint256 indexed marketId, address indexed feed, uint256 updatedAt);
    event UpkeepPayload(uint256 len, uint256 w0);

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
    error PhaseBoundaryRound(); // cannot safely compute prev round id (occurs at round 0 or 1, or during phase transitions - rare edge case)

    uint256 public constant MIN_TIMELOCK = 24 hours;
    uint256 public constant OP_EXPIRY_WINDOW = 7 days;

    // =========================
    // Resolution policy knobs
    // =========================
    // SLA: resolve using FIRST Chainlink update after expiry if it arrives within this window
    uint256 public constant RESOLVE_SLA = 5 minutes;

    // TWAP fallback window: [expiry, expiry + TWAP_WINDOW]
    uint256 public constant TWAP_WINDOW = 5 minutes;

    // Lookback limits
    uint256 public constant MAX_LOOKBACK_FIRST = 96;
    uint256 public constant MAX_LOOKBACK_TWAP  = 256;

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
     */
    function parseRoundId(uint80 roundId) internal pure returns (uint16 phaseId, uint64 aggregatorRoundId) {
        phaseId = uint16(roundId >> 64);
        aggregatorRoundId = uint64(roundId);
    }

    // =========================
    // Automation
    // =========================

    /**
     * @notice Chainlink Automation: Check if upkeep is needed
     * @param checkData Encoded marketId (uint256) - if empty, searches first N markets
     * @return upkeepNeeded Whether upkeep is needed
     * @return performData Encoded marketId if upkeep is needed
     */
    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        // If checkData is provided, check specific market
        if (checkData.length >= 32) {
            uint256 marketId = abi.decode(checkData, (uint256));
            return _checkSingleMarket(marketId);
        }

        // Search for first market that needs resolution (limit to 50 to keep checkUpkeep cheap)
        uint256 maxMarketsToCheck = 50;
        uint256 totalMarkets = ICoreResolutionView(core).marketCount();
        uint256 endId = totalMarkets > maxMarketsToCheck ? maxMarketsToCheck : totalMarkets;

        for (uint256 i = 1; i <= endId; i++) {
            (bool needed, bytes memory data) = _checkSingleMarket(i);
            if (needed) return (true, data);
        }

        return (false, "");
    }

    function _checkSingleMarket(uint256 marketId)
        internal
        view
        returns (bool upkeepNeeded, bytes memory performData)
    {
        ICoreResolutionView.ResolutionConfig memory r;
        try ICoreResolutionView(core).getMarketResolution(marketId) returns (ICoreResolutionView.ResolutionConfig memory config) {
            r = config;
        } catch {
            return (false, "");
        }

        if (r.isResolved) return (false, "");
        if (block.timestamp < r.expiryTimestamp) return (false, "");

        // Chainlink market detection (includes your workaround)
        bool isChainlink = (r.oracleType == ICoreResolutionView.OracleType.ChainlinkFeed) ||
            (r.priceFeedId != bytes32(0) && (r.oracleAddress == address(0) || r.oracleAddress == address(1)));
        if (!isChainlink) return (false, "");

        address feedAddress = r.oracleAddress;
        if (feedAddress == address(0) || feedAddress == address(1)) {
            bytes32 feedId = r.priceFeedId;
            assembly { feedAddress := shr(96, feedId) }
            if (feedAddress == address(0) || feedAddress == address(1)) return (false, "");
        }

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        (uint80 latestRoundId, , , uint256 latestUpdatedAt, ) = feed.latestRoundData();

        // Need at least one update after expiry to be resolvable
        if (latestUpdatedAt < r.expiryTimestamp) return (false, "");

        // Avoid resolving extremely old markets via automation
        if (block.timestamp - latestUpdatedAt > 7 days) return (false, "");

        // Pre-filter phase boundary cases to avoid likely revert in resolveAuto
        (, uint64 aggRound) = parseRoundId(latestRoundId);
        if (aggRound <= 1) return (false, ""); // wait for next update to avoid PhaseBoundaryRound revert

        return (true, abi.encode(marketId));
    }

    function performUpkeep(bytes calldata performData) external override {
        if (performData.length < 32) revert BadValue();

        uint256 w0;
        assembly { w0 := calldataload(performData.offset) }

        uint256 marketId;

        // Case A: abi.encode(uint256) => 32 bytes
        if (performData.length == 32) {
            marketId = w0;

        // Case B: abi.encode(uint256,uint256) => 64 bytes (your current case)
        // Note: No check for w0 != 32 to avoid breaking when marketId == 32
        } else if (performData.length == 64) {
            marketId = w0;

        // Case C: wrapped bytes => abi.encode(bytes) where inner is 32 bytes:
        // layout: [0]=0x20 (offset), [1]=0x20 (len), [2]=marketId
        } else if (performData.length >= 96 && w0 == 32) {
            uint256 w1;
            assembly { w1 := calldataload(add(performData.offset, 32)) }
            if (w1 != 32) revert BadValue();

            assembly { marketId := calldataload(add(performData.offset, 64)) }

        } else {
            revert BadValue();
        }

        // Emit event for debugging (see what Keeper actually sends)
        // Note: If resolveAuto reverts, this event won't appear in logs
        emit UpkeepPayload(performData.length, w0);

        resolveAuto(marketId);
    }

    // =========================
    // Auto-resolve policy:
    // 1) FIRST update after expiry within SLA -> resolve(first)
    // 2) else if oracle has updates covering end of TWAP window -> resolve(TWAP [expiry, expiry+TWAP_WINDOW])
    // 3) else -> resolve(first) (late), because TWAP can't be anchored without an update after window end
    // =========================

    function resolveAuto(uint256 marketId) public nonReentrant whenNotPaused {
        ICoreResolutionView.ResolutionConfig memory r = ICoreResolutionView(core).getMarketResolution(marketId);

        if (r.isResolved) return;
        if (block.timestamp < r.expiryTimestamp) revert MarketNotExpired();

        bool isChainlink = (r.oracleType == ICoreResolutionView.OracleType.ChainlinkFeed) ||
            (r.priceFeedId != bytes32(0) && (r.oracleAddress == address(0) || r.oracleAddress == address(1)));
        if (!isChainlink) revert NotChainlinkMarket();

        address feedAddress = r.oracleAddress;
        if (feedAddress == address(0) || feedAddress == address(1)) {
            bytes32 feedId = r.priceFeedId;
            assembly { feedAddress := shr(96, feedId) }
            if (feedAddress == address(0) || feedAddress == address(1)) revert FeedMissing();
        }

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);

        // decimals checks (same spirit as resolve())
        uint8 decNow = feed.decimals();
        if (decNow > 18) revert UnsupportedDecimals();
        if (r.oracleDecimals != 0 && decNow != r.oracleDecimals) {
            revert OracleDecimalsMismatch(r.oracleDecimals, decNow);
        }

        // 1) first round after expiry
        (uint80 firstRid, uint256 firstUpdatedAt) = _firstRoundAfterTs(feed, r.expiryTimestamp, MAX_LOOKBACK_FIRST);

        // 2) SLA path
        if (firstUpdatedAt <= r.expiryTimestamp + RESOLVE_SLA) {
            _resolveWithRound(marketId, firstRid);
            return;
        }

        // 3) TWAP path only if we have an update after the end of the TWAP window (anchor)
        uint256 windowStart = r.expiryTimestamp;
        uint256 windowEnd = r.expiryTimestamp + TWAP_WINDOW;

        (, , , uint256 latestUpdatedAt, ) = feed.latestRoundData();
        if (latestUpdatedAt < windowEnd) {
            // Can't compute TWAP [windowStart, windowEnd] reliably (no round after window end),
            // so fallback to first-after-expiry even though it's late.
            _resolveWithRound(marketId, firstRid);
            // _resolveWithRound emits MarketResolved; we add explicit "late" marker
            emit MarketResolvedLate(marketId, feedAddress, firstUpdatedAt);
            return;
        }

        // Try TWAP computation with fallback to first-after-expiry if it fails (e.g., phase boundary)
        try this.computeTwapExternal(feedAddress, windowStart, windowEnd) returns (uint256 twapPrice1e18) {
            ICoreResolutionView(core).resolveMarketWithPrice(marketId, twapPrice1e18);
            emit MarketResolvedTwap(marketId, feedAddress, twapPrice1e18, windowStart, windowEnd);
        } catch {
            // TWAP failed (phase boundary / missing rounds) -> fallback to first-after-expiry
            _resolveWithRound(marketId, firstRid);
            emit MarketResolvedLate(marketId, feedAddress, firstUpdatedAt);
        }
    }

    /**
     * @notice Find the first round whose updatedAt >= ts, and whose previous round updatedAt < ts
     * @dev Note: If the first round after expiry is round 1 of a new phase, this will revert with PhaseBoundaryRound.
     *      This is a rare edge case (phase transitions are infrequent). Manual resolution may be required.
     */
    function _firstRoundAfterTs(AggregatorV3Interface feed, uint256 ts, uint256 maxSteps)
        internal
        view
        returns (uint80 roundId, uint256 updatedAt)
    {
        (uint80 curRid, , , uint256 curUpdatedAt, ) = feed.latestRoundData();
        if (curUpdatedAt < ts) revert RoundTooEarly(curUpdatedAt, ts);

        for (uint256 i = 0; i < maxSteps; i++) {
            (uint16 phase, uint64 aggRound) = parseRoundId(curRid);
            if (aggRound <= 1) revert PhaseBoundaryRound(); // Cannot verify previous round at phase boundary

            uint80 prevRid = (uint80(phase) << 64) | (aggRound - 1);

            try feed.getRoundData(prevRid) returns (uint80, int256, uint256, uint256 prevUpdatedAt, uint80) {
                if (prevUpdatedAt < ts) {
                    return (curRid, curUpdatedAt);
                }
                curRid = prevRid;
                curUpdatedAt = prevUpdatedAt;
            } catch {
                revert IncompleteRound();
            }
        }

        revert IncompleteRound();
    }

    /**
     * @notice External wrapper for TWAP computation (allows try/catch in resolveAuto)
     * @dev This is needed because internal functions cannot be caught with try/catch
     */
    function computeTwapExternal(address feedAddress, uint256 startTs, uint256 endTs)
        external
        view
        returns (uint256)
    {
        if (feedAddress == address(0) || feedAddress == address(1)) revert FeedMissing();
        return _computeTwap1e18(AggregatorV3Interface(feedAddress), startTs, endTs);
    }

    /**
     * @notice Time-weighted average price (TWAP) over [startTs, endTs], normalized to 1e18
     * @dev Uses step function: previous round's price applies until current round's updatedAt
     *      Requires existence of a round after endTs to anchor the end boundary.
     */
    function _computeTwap1e18(
        AggregatorV3Interface feed,
        uint256 startTs,
        uint256 endTs
    ) internal view returns (uint256 twap1e18) {
        if (endTs <= startTs) revert BadValue();

        (uint80 endRound, uint256 endRoundUpdatedAt) = _firstRoundAfterTs(feed, endTs, MAX_LOOKBACK_FIRST);

        uint8 decNow = feed.decimals();
        if (decNow > 18) revert UnsupportedDecimals();

        uint256 weightedSum = 0;
        uint256 totalDur = 0;

        uint80 curRid = endRound;
        uint256 curUpdatedAt = endRoundUpdatedAt;

        for (uint256 i = 0; i < MAX_LOOKBACK_TWAP; i++) {
            (uint16 phase, uint64 aggRound) = parseRoundId(curRid);
            if (aggRound <= 1) revert PhaseBoundaryRound();

            uint80 prevRid = (uint80(phase) << 64) | (aggRound - 1);

            (uint80 prid, int256 prevAnswer, , uint256 prevUpdatedAt, uint80 prevAnsweredInRound) = feed.getRoundData(prevRid);
            if (prevAnswer <= 0 || prevUpdatedAt == 0) revert InvalidAnswer();
            if (prevAnsweredInRound < prid) revert IncompleteRound();

            uint256 segStart = prevUpdatedAt < startTs ? startTs : prevUpdatedAt;
            uint256 segEnd   = curUpdatedAt > endTs ? endTs : curUpdatedAt;

            if (segEnd > segStart) {
                uint256 dur = segEnd - segStart;

                uint256 raw = uint256(prevAnswer);
                uint256 p1e18;
                if (decNow == 18) {
                    p1e18 = raw;
                } else if (decNow < 18) {
                    p1e18 = raw * (10 ** (18 - decNow));
                } else {
                    p1e18 = raw / (10 ** (decNow - 18));
                }

                weightedSum += p1e18 * dur;
                totalDur += dur;
            }

            if (prevUpdatedAt <= startTs) break;

            curRid = prevRid;
            curUpdatedAt = prevUpdatedAt;
        }

        if (totalDur == 0) revert IncompleteRound();
        return weightedSum / totalDur;
    }

    // =========================
    // Internal resolution logic (without nonReentrant to allow calls from resolveAuto)
    // =========================

    function _resolveWithRound(uint256 marketId, uint80 roundId) internal {
        if (roundId == 0) revert InvalidRoundId();

        (uint16 phase, uint64 aggregatorRound) = parseRoundId(roundId);
        if (aggregatorRound <= 1) revert PhaseBoundaryRound(); // Cannot verify previous round at phase boundary (round 0 or 1)

        ICoreResolutionView.ResolutionConfig memory r = ICoreResolutionView(core).getMarketResolution(marketId);

        bool isChainlink = (r.oracleType == ICoreResolutionView.OracleType.ChainlinkFeed) ||
            (r.priceFeedId != bytes32(0) && (r.oracleAddress == address(0) || r.oracleAddress == address(1)));
        if (!isChainlink) {
            revert NotChainlinkMarket();
        }

        address feedAddress = r.oracleAddress;
        if (feedAddress == address(0) || feedAddress == address(1)) {
            bytes32 feedId = r.priceFeedId;
            assembly { feedAddress := shr(96, feedId) }
            if (feedAddress == address(0) || feedAddress == address(1)) {
                revert FeedMissing();
            }
        }

        if (block.timestamp < r.expiryTimestamp) revert MarketNotExpired();

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);

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

        // 4. Verify previous round was BEFORE expiry
        uint80 prevRoundId = (uint80(phase) << 64) | (aggregatorRound - 1);

        try feed.getRoundData(prevRoundId) returns (uint80, int256, uint256, uint256 prevUpdatedAt, uint80) {
            if (prevUpdatedAt >= r.expiryTimestamp) {
                revert NotFirstRoundAfterExpiry(prevUpdatedAt, r.expiryTimestamp);
            }
        } catch {
            revert IncompleteRound();
        }

        // 5. Staleness check (extremely old)
        uint256 maxAllowedAge = 7 days;
        if (block.timestamp - updatedAt > maxAllowedAge) {
            revert Stale(updatedAt, block.timestamp, maxAllowedAge);
        }

        // 6. Normalize price to 1e18
        uint256 rawPrice = uint256(answer);
        uint256 normalizedPrice = decNow == 18
            ? rawPrice
            : (decNow < 18) ? rawPrice * (10 ** (18 - decNow)) : rawPrice / (10 ** (decNow - 18));

        ICoreResolutionView(core).resolveMarketWithPrice(marketId, normalizedPrice);

        emit MarketResolved(marketId, address(feed), normalizedPrice, updatedAt);
    }

    // =========================
    // Manual / direct resolve using a specific roundId (public wrapper with nonReentrant)
    // =========================

    function resolve(uint256 marketId, uint80 roundId) public nonReentrant whenNotPaused {
        _resolveWithRound(marketId, roundId);
    }
}
