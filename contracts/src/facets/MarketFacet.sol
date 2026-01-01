// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/IAccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../CoreStorage.sol";
import "../PositionToken.sol";
import "../interfaces/AggregatorV3Interface.sol";

contract MarketFacet is CoreStorage {
    using SafeERC20 for IERC20;

    event MarketCreated(
        uint256 indexed id,
        address yes,
        address no,
        bytes32 questionHash,
        string question,
        uint256 initUsdc,
        uint256 expiryTimestamp
    );

    event ScheduledMarketCreated(
        uint256 indexed id,
        address yes,
        address no,
        bytes32 questionHash,
        string question,
        uint256 initUsdc,
        uint256 startTime,
        uint256 expiryTimestamp
    );

    error InvalidMarket();
    error InvalidExpiry();
    error InvalidStartTime();
    error InsufficientSeed();
    error InvalidOracle();
    error InvalidOracleFeed();
    error UnsupportedFeedDecimals();
    error TargetOutOfRange(uint256 targetValue, uint256 priceNow, uint8 oracleDecimals);

    uint256 public constant MAX_MARKET_DURATION = 365 days;
    uint256 public constant MIN_MARKET_DURATION = 1 hours; // L-06 Fix: Minimum 1 hour duration
    uint256 public constant MAX_ORACLE_AGE = 4 hours;

    modifier onlyRole(bytes32 role) {
        require(IAccessControl(address(this)).hasRole(role, msg.sender), "NO_ROLE");
        _;
    }

    function createMarket(
        string memory question,
        string memory yesName,
        string memory yesSymbol,
        string memory noName,
        string memory noSymbol,
        uint256 initUsdc,
        uint256 expiryTimestamp,
        address oracleFeed,
        bytes32 priceFeedId,
        uint256 targetValue,
        Comparison comparison
    ) external whenNotPaused onlyRole(MARKET_CREATOR_ROLE) returns (uint256 id) {
        if (bytes(question).length == 0 || bytes(question).length > 1000) revert InvalidMarket();
        if (bytes(yesName).length == 0 || bytes(yesName).length > 100) revert InvalidMarket();
        if (bytes(noName).length == 0 || bytes(noName).length > 100) revert InvalidMarket();
        if (bytes(yesSymbol).length == 0 || bytes(yesSymbol).length > 20) revert InvalidMarket();
        if (bytes(noSymbol).length == 0 || bytes(noSymbol).length > 20) revert InvalidMarket();

        if (initUsdc < minMarketSeed) revert InsufficientSeed();
        if (expiryTimestamp <= block.timestamp) revert InvalidExpiry();
        // L-06 Fix: Enforce minimum market duration to prevent unusable markets
        if (expiryTimestamp < block.timestamp + MIN_MARKET_DURATION) revert InvalidExpiry();
        if (expiryTimestamp > block.timestamp + MAX_MARKET_DURATION) revert InvalidExpiry();
        if (oracleFeed == address(0)) revert InvalidOracle(); // Every market must be resolvable

        id = ++marketCount;

        PositionToken yes = new PositionToken(yesName, yesSymbol, address(this));
        PositionToken no  = new PositionToken(noName,  noSymbol,  address(this));

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), initUsdc);

        uint256 ln2E18 = 693147180559945309;
        uint256 bE18_  = (initUsdc * liquidityMultiplierE18 * USDC_TO_E18) / ln2E18;

        OracleType oType = oracleFeed == address(0) ? OracleType.None : OracleType.ChainlinkFeed;
        bytes32 qh = keccak256(bytes(question));

        // Basic guardrails for Chainlink markets:
        // - record `feed.decimals()` on-chain
        // - normalize targetValue to 1e18 for consistency
        // - sanity-check targetValue magnitude against the current price to catch common 1e6 vs 1e8 mistakes
        uint8 oracleDecimals = 0;
        uint256 normalizedTarget = targetValue;

        if (oType == OracleType.ChainlinkFeed) {
            AggregatorV3Interface feed = AggregatorV3Interface(oracleFeed);
            oracleDecimals = feed.decimals();
            
            // Reject feeds the resolver will refuse (decimals > 18)
            if (oracleDecimals > 18) revert UnsupportedFeedDecimals();

            (, int256 answer, uint256 startedAt, uint256 updatedAt, ) = feed.latestRoundData();
            if (answer <= 0 || startedAt == 0 || updatedAt == 0) revert InvalidOracleFeed();
            // Avoid timestamp underflow and reject feeds that report a future timestamp.
            if (updatedAt > block.timestamp) revert InvalidOracleFeed();
            if (block.timestamp - updatedAt > MAX_ORACLE_AGE) revert InvalidOracleFeed();

            uint256 priceNow = uint256(answer);

            // Allow wide range, but still catch most scaling mistakes:
            // require target in [price/50, price*50]
            uint256 minTarget = priceNow / 50;
            if (minTarget == 0) minTarget = 1;
            uint256 maxTarget = priceNow * 50;
            if (targetValue < minTarget || targetValue > maxTarget) {
                revert TargetOutOfRange(targetValue, priceNow, oracleDecimals);
            }

            // Normalize targetValue to 1e18
            if (oracleDecimals == 18) {
                normalizedTarget = targetValue;
            } else if (oracleDecimals < 18) {
                normalizedTarget = targetValue * (10**(18 - oracleDecimals));
            } else {
                normalizedTarget = targetValue / (10**(oracleDecimals - 18));
            }
        }

        markets[id] = Market({
            yes: yes,
            no: no,
            qYes: 0,
            qNo: 0,
            bE18: bE18_,
            usdcVault: initUsdc,
            feeTreasuryBps: defaultFeeTreasuryBps,
            feeLpBps: defaultFeeLpBps,
            feeVaultBps: defaultFeeVaultBps,
            status: MarketStatus.Active,
            questionHash: qh,
            question: question,
            creator: msg.sender,
            totalLpUsdc: initUsdc,
            lpFeesUSDC: 0,
            residualUSDC: 0,
            priceBandThresholdUSDC: 10_000e6,
            maxJumpE18: 0,
            resolution: ResolutionConfig({
                startTime: 0, // Immediate start for backward compatibility
                expiryTimestamp: expiryTimestamp,
                oracleType: oType,
                oracleAddress: oracleFeed,
                priceFeedId: priceFeedId,
                targetValue: normalizedTarget,
                comparison: comparison,
                yesWins: false,
                isResolved: false,
                oracleDecimals: oracleDecimals
            })
        });

        lpShares[id][msg.sender] = initUsdc;

        emit MarketCreated(id, address(yes), address(no), qh, question, initUsdc, expiryTimestamp);
    }

    /**
     * @notice Create a scheduled market that starts trading at a future time
     * @param startTime When trading becomes active (must be >= now and < expiryTimestamp)
     * @dev If startTime is 0 or <= block.timestamp, trading starts immediately
     */
    function createScheduledMarket(
        string memory question,
        string memory yesName,
        string memory yesSymbol,
        string memory noName,
        string memory noSymbol,
        uint256 initUsdc,
        uint256 startTime,
        uint256 expiryTimestamp,
        address oracleFeed,
        bytes32 priceFeedId,
        uint256 targetValue,
        Comparison comparison
    ) external whenNotPaused onlyRole(MARKET_CREATOR_ROLE) returns (uint256 id) {
        if (bytes(question).length == 0 || bytes(question).length > 1000) revert InvalidMarket();
        if (bytes(yesName).length == 0 || bytes(yesName).length > 100) revert InvalidMarket();
        if (bytes(noName).length == 0 || bytes(noName).length > 100) revert InvalidMarket();
        if (bytes(yesSymbol).length == 0 || bytes(yesSymbol).length > 20) revert InvalidMarket();
        if (bytes(noSymbol).length == 0 || bytes(noSymbol).length > 20) revert InvalidMarket();

        if (initUsdc < minMarketSeed) revert InsufficientSeed();

        // Validate startTime: if provided (non-zero and future), must be before expiry
        uint256 effectiveStartTime = startTime;
        if (startTime != 0 && startTime > block.timestamp) {
            // Scheduled market: startTime must be before expiry with at least MIN_MARKET_DURATION of trading
            if (startTime >= expiryTimestamp) revert InvalidStartTime();
            if (expiryTimestamp < startTime + MIN_MARKET_DURATION) revert InvalidStartTime();
        } else {
            // Immediate start
            effectiveStartTime = 0;
        }

        if (expiryTimestamp <= block.timestamp) revert InvalidExpiry();
        // L-06 Fix: Enforce minimum market duration to prevent unusable markets
        if (expiryTimestamp < block.timestamp + MIN_MARKET_DURATION) revert InvalidExpiry();
        if (expiryTimestamp > block.timestamp + MAX_MARKET_DURATION) revert InvalidExpiry();
        if (oracleFeed == address(0)) revert InvalidOracle();

        id = ++marketCount;

        PositionToken yes = new PositionToken(yesName, yesSymbol, address(this));
        PositionToken no  = new PositionToken(noName,  noSymbol,  address(this));

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), initUsdc);

        uint256 ln2E18 = 693147180559945309;
        uint256 bE18_  = (initUsdc * liquidityMultiplierE18 * USDC_TO_E18) / ln2E18;

        OracleType oType = oracleFeed == address(0) ? OracleType.None : OracleType.ChainlinkFeed;
        bytes32 qh = keccak256(bytes(question));

        uint8 oracleDecimals = 0;
        uint256 normalizedTarget = targetValue;

        if (oType == OracleType.ChainlinkFeed) {
            AggregatorV3Interface feed = AggregatorV3Interface(oracleFeed);
            oracleDecimals = feed.decimals();

            if (oracleDecimals > 18) revert UnsupportedFeedDecimals();

            (, int256 answer, uint256 startedAt, uint256 updatedAt, ) = feed.latestRoundData();
            if (answer <= 0 || startedAt == 0 || updatedAt == 0) revert InvalidOracleFeed();
            if (updatedAt > block.timestamp) revert InvalidOracleFeed();
            if (block.timestamp - updatedAt > MAX_ORACLE_AGE) revert InvalidOracleFeed();

            uint256 priceNow = uint256(answer);

            uint256 minTarget = priceNow / 50;
            if (minTarget == 0) minTarget = 1;
            uint256 maxTarget = priceNow * 50;
            if (targetValue < minTarget || targetValue > maxTarget) {
                revert TargetOutOfRange(targetValue, priceNow, oracleDecimals);
            }

            if (oracleDecimals == 18) {
                normalizedTarget = targetValue;
            } else if (oracleDecimals < 18) {
                normalizedTarget = targetValue * (10**(18 - oracleDecimals));
            } else {
                normalizedTarget = targetValue / (10**(oracleDecimals - 18));
            }
        }

        markets[id] = Market({
            yes: yes,
            no: no,
            qYes: 0,
            qNo: 0,
            bE18: bE18_,
            usdcVault: initUsdc,
            feeTreasuryBps: defaultFeeTreasuryBps,
            feeLpBps: defaultFeeLpBps,
            feeVaultBps: defaultFeeVaultBps,
            status: MarketStatus.Active,
            questionHash: qh,
            question: question,
            creator: msg.sender,
            totalLpUsdc: initUsdc,
            lpFeesUSDC: 0,
            residualUSDC: 0,
            priceBandThresholdUSDC: 10_000e6,
            maxJumpE18: 0,
            resolution: ResolutionConfig({
                startTime: effectiveStartTime,
                expiryTimestamp: expiryTimestamp,
                oracleType: oType,
                oracleAddress: oracleFeed,
                priceFeedId: priceFeedId,
                targetValue: normalizedTarget,
                comparison: comparison,
                yesWins: false,
                isResolved: false,
                oracleDecimals: oracleDecimals
            })
        });

        lpShares[id][msg.sender] = initUsdc;

        emit ScheduledMarketCreated(id, address(yes), address(no), qh, question, initUsdc, effectiveStartTime, expiryTimestamp);
    }

    function getMarketState(uint256 id)
        external
        view
        returns (uint256 qYes, uint256 qNo, uint256 vault, uint256 bE18_, MarketStatus status, bytes32 questionHash)
    {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        return (m.qYes, m.qNo, m.usdcVault, m.bE18, m.status, m.questionHash);
    }

    function getMarketResolution(uint256 id) external view returns (ResolutionConfig memory) {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        return m.resolution;
    }

    /**
     * @notice Monitoring helper for ops/bots: exposes key invariants in one call.
     * @dev Circulating supply excludes router-held locked shares used for liquidity scaling.
     * @return cirYes circulating YES shares (1e18)
     * @return cirNo circulating NO shares (1e18)
     * @return liabilityUSDC max(cirYes,cirNo)/1e12 (6 decimals)
     * @return vaultUSDC market vault balance (6 decimals)
     * @return bE18_ LMSR liquidity parameter (1e18)
     */
    function getMarketInvariants(uint256 id)
        external
        view
        returns (uint256 cirYes, uint256 cirNo, uint256 liabilityUSDC, uint256 vaultUSDC, uint256 bE18_)
    {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();

        uint256 lockedYes = m.yes.balanceOf(address(this));
        uint256 lockedNo  = m.no.balanceOf(address(this));

        cirYes = m.qYes > lockedYes ? (m.qYes - lockedYes) : 0;
        cirNo  = m.qNo  > lockedNo  ? (m.qNo  - lockedNo)  : 0;

        uint256 maxCir = cirYes > cirNo ? cirYes : cirNo;
        liabilityUSDC = maxCir / 1e12;
        vaultUSDC = m.usdcVault;
        bE18_ = m.bE18;
    }

    function getMarketQuestion(uint256 id) external view returns (string memory) {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        return m.question;
    }

    function getMarketTokens(uint256 id) external view returns (address yes, address no) {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        return (address(m.yes), address(m.no));
    }
}
