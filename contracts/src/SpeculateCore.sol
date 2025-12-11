// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/AggregatorV3Interface.sol";
import "./PositionToken.sol";
import "./LMSRMath.sol"; // Import our new library

// Interface for MockUSDC mint function
interface IMockUSDC {
    function mint(address to, uint256 amount) external;
}

contract SpeculateCore is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ==========================
    // Config / Constants
    // ==========================
    IERC20 public immutable usdc;
    address public treasury;
    address public chainlinkResolver; // <--- Added for security check

    bytes32 public constant MARKET_CREATOR_ROLE = keccak256("MARKET_CREATOR_ROLE");
    uint256 public constant ADMIN_TIMELOCK_DELAY = 2 days;

    // Precision handling
    uint256 public constant USDC_TO_E18 = 1e12;
    uint256 public constant PRICE_DECIMALS_E6 = 1e6; 
    
    // Limits
    uint256 public constant MIN_MARKET_SEED = 500e6; // 500 USDC minimum to create a market
    uint256 public constant MIN_LIQUIDITY_ADD = 500e6; // 500 USDC minimum to add liquidity 
    uint256 public constant DUST_THRESHOLD = 100;
    uint256 public constant ORACLE_STALENESS_THRESHOLD = 3600;

    // Fees (Basis Points)
    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint16 public constant MAX_FEE_BPS_TOTAL = 300;
    uint16 public constant MAX_FEE_BPS_PER = 200;

    // Configurable Global params
    uint256 public liquidityMultiplierE18 = 1e18; 
    uint256 public maxInstantJumpE18 = 15e16; // 15%
    uint256 public maxUsdcPerTrade = 100_000e6;

    // ==========================
    // Structs
    // ==========================
    enum MarketStatus { Active, Resolved, Cancelled }
    enum Comparison { Above, Below, Equals }
    enum OracleType { None, ChainlinkFeed }

    struct ResolutionConfig {
        uint256 expiryTimestamp;
        OracleType oracleType; // Added to match logic
        address oracleAddress;
        bytes32 priceFeedId;   // <--- Added: Critical for ChainlinkResolver
        uint256 targetValue; 
        Comparison comparison;
        bool yesWins;
        bool isResolved;
    }

    struct Market {
        PositionToken yes;
        PositionToken no;
        
        uint256 qYes;
        uint256 qNo;
        uint256 bE18;
        
        uint256 usdcVault;
        
        uint16 feeTreasuryBps; 
        uint16 feeVaultBps; 
        uint16 feeLpBps;
        
        MarketStatus status;
        string question;
        address creator; 
        ResolutionConfig resolution;
        
        uint256 totalLpUsdc; 
        uint256 lpFeesUSDC;
        
        uint256 priceBandThreshold;
        uint256 maxJumpE18;

        uint256 adminProposalTimestamp;
        bool adminProposedYesWins;      
    }

    // ==========================
    // Storage
    // ==========================
    mapping(uint256 => Market) public markets;
    uint256 public marketCount;
    
    mapping(uint256 => mapping(address => uint256)) public lpShares;
    mapping(uint256 => uint256) public accFeePerUSDCE18; 
    mapping(uint256 => mapping(address => uint256)) public lpFeeDebt;
    
    mapping(uint256 => uint256) public accResidualPerUSDCE18; 
    mapping(uint256 => mapping(address => uint256)) public lpResidualDebt;
    mapping(uint256 => uint256) public lpResidualUSDC; 

    // ==========================
    // Events
    // ==========================
    event MarketCreated(uint256 indexed id, string question, uint256 initUsdc);
    event Buy(uint256 indexed id, address indexed user, bool isYes, uint256 usdcIn, uint256 tokensOut, uint256 priceE6);
    event Sell(uint256 indexed id, address indexed user, bool isYes, uint256 tokensIn, uint256 usdcOut, uint256 priceE6);
    event MarketResolved(uint256 indexed id, bool yesWins);
    event MarketCancelled(uint256 indexed id);
    event AdminResolutionProposed(uint256 indexed id, bool result, uint256 execTime);
    event LiquidityAdded(uint256 indexed id, address indexed lp, uint256 amount);
    event Redeemed(uint256 indexed id, address indexed user, uint256 amount);
    event ChainlinkResolverSet(address indexed newResolver);
    event LiquidityParameterUpdated(uint256 indexed id, uint256 newB, uint256 totalLp);
    event LpFeesClaimed(uint256 indexed id, address indexed lp, uint256 amount);
    event ResidualFinalized(uint256 indexed id, uint256 amount, uint256 totalLp);
    event LpResidualClaimed(uint256 indexed id, address indexed lp, uint256 amount);

    // ==========================
    // Errors
    // ==========================
    error InvalidMarket();
    error SlippageExceeded();
    error InsufficientBalance();
    error BackingInsufficient();
    error PriceJumpTooLarge(uint256 pOld, uint256 pNew, uint256 cap);
    error MarketNotActive();
    error TimelockActive();
    error ZeroAddress();
    error InsufficientSeed();
    error InvalidExpiry();
    error DustAmount();
    error MaxTradeExceeded();
    error NoLiquidity();
    error SolvencyIssue();
    error NotAuthorized();

    constructor(address _usdc, address _treasury) {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        treasury = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MARKET_CREATOR_ROLE, msg.sender);
    }

    // =========================================================================
    //                               ADMIN & CONFIG
    // =========================================================================

    function setChainlinkResolver(address _resolver) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_resolver == address(0)) revert ZeroAddress();
        chainlinkResolver = _resolver;
        emit ChainlinkResolverSet(_resolver);
    }

    /**
     * @notice Faucet function to mint USDC for testing
     * @dev Only admins can call this. Mints USDC directly to msg.sender.
     * @param amount Amount of USDC to mint (in 6 decimals)
     */
    function faucet(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IMockUSDC(address(usdc)).mint(msg.sender, amount);
    }

    // =========================================================================
    //                               CORE ACTIONS
    // =========================================================================

    function createMarket(
        string memory question,
        string memory yesName, string memory yesSymbol,
        string memory noName, string memory noSymbol,
        uint256 initUsdc,
        uint256 expiryTimestamp,
        address oracle,
        bytes32 priceFeedId, // <--- Added param
        uint256 targetValue,
        Comparison comparison
    ) external onlyRole(MARKET_CREATOR_ROLE) returns (uint256 id) {
        if (initUsdc < MIN_MARKET_SEED) revert InsufficientSeed();
        if (expiryTimestamp <= block.timestamp) revert InvalidExpiry();

        id = ++marketCount;
        
        PositionToken yes = new PositionToken(yesName, yesSymbol, address(this));
        PositionToken no = new PositionToken(noName, noSymbol, address(this));
        
        yes.grantRole(yes.MINTER_ROLE(), address(this));
        yes.grantRole(yes.BURNER_ROLE(), address(this));
        no.grantRole(no.MINTER_ROLE(), address(this));
        no.grantRole(no.BURNER_ROLE(), address(this));

        usdc.safeTransferFrom(msg.sender, address(this), initUsdc);
        
        Market storage m = markets[id];
        m.yes = yes; m.no = no;
        m.creator = msg.sender;
        m.question = question;
        m.status = MarketStatus.Active;
        m.usdcVault = initUsdc;
        
        m.feeTreasuryBps = 100;
        m.feeLpBps = 100;
        m.feeVaultBps = 0;

        // Calc initial 'b' using Library or constant
        // b = (initUSDC * 1e12 * 1e18) / 0.693...
        uint256 newB = (initUsdc * liquidityMultiplierE18 * USDC_TO_E18) / 693147180559945309;
        m.bE18 = newB;

        OracleType oType = oracle == address(0) ? OracleType.None : OracleType.ChainlinkFeed;

        m.resolution = ResolutionConfig({
            expiryTimestamp: expiryTimestamp,
            oracleType: oType,
            oracleAddress: oracle,
            priceFeedId: priceFeedId, // <--- Saved here
            targetValue: targetValue,
            comparison: comparison,
            yesWins: false,
            isResolved: false
        });
        
        m.priceBandThreshold = 10_000e6; 

        lpShares[id][msg.sender] = initUsdc;
        m.totalLpUsdc = initUsdc;

        emit MarketCreated(id, question, initUsdc);
        emit LiquidityParameterUpdated(id, newB, initUsdc);
    }

    // =========================================================================
    //                                TRADING
    // =========================================================================

    // Wrapper for view functions using library
    function spotPriceYesE18(uint256 id) public view returns (uint256) {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        return LMSRMath.calculateSpotPrice(m.qYes, m.qNo, m.bE18);
    }

    /**
     * @notice Get spot price of Yes token scaled to 1e6
     * @param id Market ID
     * @return Spot price scaled to 1e6 (for USDC decimals compatibility)
     */
    function spotPriceYesE6(uint256 id) public view returns (uint256) {
        return spotPriceYesE18(id) / 1e12; // Convert from E18 to E6
    }

    /**
     * @notice Get spot price of No token scaled to 1e6
     * @param id Market ID
     * @return Spot price scaled to 1e6 (for USDC decimals compatibility)
     * @dev Price of No = 1.0 - Price of Yes
     */
    function spotPriceNoE6(uint256 id) public view returns (uint256) {
        uint256 priceYesE18 = spotPriceYesE18(id);
        uint256 priceNoE18 = 1e18 - priceYesE18; // Price of No = 1 - Price of Yes
        return priceNoE18 / 1e12; // Convert from E18 to E6
    }

    /**
     * @notice Get market state - returns qYes, qNo, vault, b, and spot price
     * @param id Market ID
     * @return qYes Quantity of Yes tokens
     * @return qNo Quantity of No tokens
     * @return vault USDC vault amount
     * @return b Liquidity parameter (scaled to 1e18)
     * @return pYesE6 Spot price of Yes token (scaled to 1e6)
     */
    function getMarketState(uint256 id) public view returns (uint256 qYes, uint256 qNo, uint256 vault, uint256 b, uint256 pYesE6) {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        
        qYes = m.qYes;
        qNo = m.qNo;
        vault = m.usdcVault;
        b = m.bE18;
        pYesE6 = LMSRMath.calculateSpotPrice(m.qYes, m.qNo, m.bE18) / 1e12; // Convert from E18 to E6
    }

    function buy(uint256 id, bool isYes, uint256 usdcIn, uint256 minTokensOut) public nonReentrant whenNotPaused {
        Market storage m = markets[id];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp >= m.resolution.expiryTimestamp) revert MarketNotActive();
        if (usdcIn > maxUsdcPerTrade) revert MaxTradeExceeded();

        uint256 feeT = (usdcIn * m.feeTreasuryBps) / BPS_DENOMINATOR;
        uint256 feeL = (usdcIn * m.feeLpBps) / BPS_DENOMINATOR;
        uint256 feeV = (usdcIn * m.feeVaultBps) / BPS_DENOMINATOR;
        uint256 net = usdcIn - feeT - feeL - feeV;

        usdc.safeTransferFrom(msg.sender, address(this), usdcIn);
        if (feeT > 0) usdc.safeTransfer(treasury, feeT);
        if (feeV > 0) m.usdcVault += feeV;
        if (feeL > 0 && m.totalLpUsdc > 0) {
             accFeePerUSDCE18[id] += (feeL * 1e18) / m.totalLpUsdc;
             m.lpFeesUSDC += feeL;
        }

        m.usdcVault += net;
        uint256 netE18 = net * USDC_TO_E18;
        
        uint256 tokensOut = LMSRMath.findSharesOut(
            isYes ? m.qYes : m.qNo,
            isYes ? m.qNo : m.qYes,
            netE18,
            m.bE18
        );

        if (tokensOut < DUST_THRESHOLD) revert DustAmount();
        if (tokensOut < minTokensOut) revert SlippageExceeded();

        _enforceSafetyChecks(m, isYes, tokensOut, true);

        if (isYes) {
            m.qYes += tokensOut;
            m.yes.mint(msg.sender, tokensOut);
        } else {
            m.qNo += tokensOut;
            m.no.mint(msg.sender, tokensOut);
        }

        // Calculate price for event
        uint256 pAfterE6 = LMSRMath.calculateSpotPrice(m.qYes, m.qNo, m.bE18) / 1e12;
        emit Buy(id, msg.sender, isYes, usdcIn, tokensOut, pAfterE6);
    }

    /**
     * @notice Wrapper function to buy Yes tokens
     * @param id Market ID
     * @param usdcIn Amount of USDC to spend (6 decimals)
     * @param minOut Minimum tokens expected (18 decimals)
     */
    function buyYes(uint256 id, uint256 usdcIn, uint256 minOut) external {
        buy(id, true, usdcIn, minOut);
    }

    /**
     * @notice Wrapper function to buy No tokens
     * @param id Market ID
     * @param usdcIn Amount of USDC to spend (6 decimals)
     * @param minOut Minimum tokens expected (18 decimals)
     */
    function buyNo(uint256 id, uint256 usdcIn, uint256 minOut) external {
        buy(id, false, usdcIn, minOut);
    }

    function sell(uint256 id, bool isYes, uint256 tokensIn, uint256 minUsdcOut) public nonReentrant whenNotPaused {
        Market storage m = markets[id];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (tokensIn < DUST_THRESHOLD) revert DustAmount();
        
        uint256 qSide = isYes ? m.qYes : m.qNo;
        if (tokensIn > qSide) revert InsufficientBalance();

        uint256 oldCost = LMSRMath.calculateCost(m.qYes, m.qNo, m.bE18);
        
        uint256 newQYes = isYes ? m.qYes - tokensIn : m.qYes;
        uint256 newQNo = isYes ? m.qNo : m.qNo - tokensIn;
        
        uint256 newCost = LMSRMath.calculateCost(newQYes, newQNo, m.bE18);
        uint256 refundE18 = oldCost - newCost;
        uint256 usdcOut = refundE18 / USDC_TO_E18;

        if (usdcOut < minUsdcOut) revert SlippageExceeded();
        if (usdcOut > m.usdcVault) revert SolvencyIssue();

        _enforceSafetyChecks(m, isYes, tokensIn, false);

        m.usdcVault -= usdcOut;
        if (isYes) {
            m.qYes -= tokensIn;
            m.yes.burn(msg.sender, tokensIn);
        } else {
            m.qNo -= tokensIn;
            m.no.burn(msg.sender, tokensIn);
        }

        usdc.safeTransfer(msg.sender, usdcOut);
        
        uint256 pAfterE6 = LMSRMath.calculateSpotPrice(m.qYes, m.qNo, m.bE18) / 1e12;
        emit Sell(id, msg.sender, isYes, tokensIn, usdcOut, pAfterE6);
    }

    /**
     * @notice Wrapper function to sell Yes tokens
     * @param id Market ID
     * @param tokensIn Amount of tokens to sell (18 decimals)
     * @param minOut Minimum USDC expected (6 decimals)
     */
    function sellYes(uint256 id, uint256 tokensIn, uint256 minOut) external {
        sell(id, true, tokensIn, minOut);
    }

    /**
     * @notice Wrapper function to sell No tokens
     * @param id Market ID
     * @param tokensIn Amount of tokens to sell (18 decimals)
     * @param minOut Minimum USDC expected (6 decimals)
     */
    function sellNo(uint256 id, uint256 tokensIn, uint256 minOut) external {
        sell(id, false, tokensIn, minOut);
    }

    function _enforceSafetyChecks(Market storage m, bool isYes, uint256 tokensDelta, bool isBuy) internal view {
        uint256 nextQYes = m.qYes;
        uint256 nextQNo = m.qNo;
        
        if (isBuy) {
            if (isYes) nextQYes += tokensDelta; else nextQNo += tokensDelta;
        } else {
            if (isYes) nextQYes -= tokensDelta; else nextQNo -= tokensDelta;
        }

        uint256 maxQ = nextQYes > nextQNo ? nextQYes : nextQNo;
        uint256 liability = (maxQ * PRICE_DECIMALS_E6) / 1e18;
        
        if (m.usdcVault + 10 < liability) revert BackingInsufficient();

        if (m.usdcVault < m.priceBandThreshold) {
            uint256 pOld = LMSRMath.calculateSpotPrice(m.qYes, m.qNo, m.bE18);
            uint256 pNew = LMSRMath.calculateSpotPrice(nextQYes, nextQNo, m.bE18);
            
            uint256 diff = pOld > pNew ? pOld - pNew : pNew - pOld;
            uint256 cap = m.maxJumpE18 > 0 ? m.maxJumpE18 : maxInstantJumpE18;
            
            if (diff > cap) revert PriceJumpTooLarge(pOld, pNew, cap);
        }
    }

    // =========================================================================
    //                            LIQUIDITY & FEES
    // =========================================================================

    function addLiquidity(uint256 id, uint256 usdcAdd) external nonReentrant {
        Market storage m = markets[id];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (usdcAdd < MIN_LIQUIDITY_ADD) revert InsufficientSeed(); // Reusing error

        usdc.safeTransferFrom(msg.sender, address(this), usdcAdd);
        m.usdcVault += usdcAdd;

        lpFeeDebt[id][msg.sender] += (usdcAdd * accFeePerUSDCE18[id]) / 1e18;
        lpShares[id][msg.sender] += usdcAdd;
        m.totalLpUsdc += usdcAdd;

        uint256 newB = (m.totalLpUsdc * liquidityMultiplierE18 * USDC_TO_E18) / 693147180559945309;
        m.bE18 = newB;

        emit LiquidityAdded(id, msg.sender, usdcAdd);
        emit LiquidityParameterUpdated(id, newB, m.totalLpUsdc);
    }

    function claimLpFees(uint256 id) external nonReentrant {
        Market storage m = markets[id];
        uint256 share = lpShares[id][msg.sender];
        uint256 pending = (share * accFeePerUSDCE18[id]) / 1e18 - lpFeeDebt[id][msg.sender];
        
        if (pending > 0) {
            if (pending > m.lpFeesUSDC) revert InsufficientBalance();
            lpFeeDebt[id][msg.sender] += pending;
            m.lpFeesUSDC -= pending;
            usdc.safeTransfer(msg.sender, pending);
            emit LpFeesClaimed(id, msg.sender, pending);
        }
    }

    // =========================================================================
    //                             RESOLUTION
    // =========================================================================

    // --- INTERFACE FOR CHAINLINK RESOLVER ---
    
    // 1. Check if upkeep needed (called by Resolver)
    function checkUpkeep(uint256 id) external view returns (bool upkeepNeeded, bytes memory performData) {
        Market storage m = markets[id];
        // Check if active, expired, not resolved, and is Chainlink type
        upkeepNeeded = (m.status == MarketStatus.Active) && 
                       (block.timestamp >= m.resolution.expiryTimestamp) && 
                       (!m.resolution.isResolved) &&
                       (m.resolution.oracleType == OracleType.ChainlinkFeed);
        
        performData = abi.encode(id);
        return (upkeepNeeded, performData);
    }

    // 2. Get resolution config (called by Resolver)
    function getMarketResolution(uint256 id) external view returns (ResolutionConfig memory) {
        return markets[id].resolution;
    }

    // 3. Resolve with explicit price (called by Resolver)
    function resolveMarketWithPrice(uint256 id, uint256 price) external {
        if (msg.sender != chainlinkResolver && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert NotAuthorized();
        
        Market storage m = markets[id];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp < m.resolution.expiryTimestamp) revert InvalidExpiry(); // Too soon
        if (m.resolution.isResolved) revert MarketNotActive(); // Already done

        bool yesWins;
        if (price > m.resolution.targetValue) {
            yesWins = m.resolution.comparison == Comparison.Above;
        } else if (price < m.resolution.targetValue) {
            yesWins = m.resolution.comparison == Comparison.Below;
        } else {
            yesWins = m.resolution.comparison == Comparison.Equals;
        }

        _finalizeMarket(id, yesWins);
    }

    // --- ADMIN RESOLUTION ---

    function proposeAdminResolution(uint256 id, bool yesWins) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Market storage m = markets[id];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp < m.resolution.expiryTimestamp) revert InvalidExpiry();
        
        m.adminProposalTimestamp = block.timestamp;
        m.adminProposedYesWins = yesWins;
        emit AdminResolutionProposed(id, yesWins, block.timestamp + ADMIN_TIMELOCK_DELAY);
    }

    function executeAdminResolution(uint256 id) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Market storage m = markets[id];
        if (m.adminProposalTimestamp == 0) revert("No proposal");
        if (block.timestamp < m.adminProposalTimestamp + ADMIN_TIMELOCK_DELAY) revert TimelockActive();
        
        _finalizeMarket(id, m.adminProposedYesWins);
        m.adminProposalTimestamp = 0;
    }

    function emergencyCancel(uint256 id) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Market storage m = markets[id];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp <= m.resolution.expiryTimestamp + 30 days) revert("Not stuck");
        
        m.status = MarketStatus.Cancelled;
        m.resolution.isResolved = true;
        emit MarketCancelled(id);
    }

    function _finalizeMarket(uint256 id, bool yesWins) internal {
        Market storage m = markets[id];
        m.resolution.yesWins = yesWins;
        m.resolution.isResolved = true;
        m.status = MarketStatus.Resolved;
        emit MarketResolved(id, yesWins);
        
        PositionToken winner = yesWins ? m.yes : m.no;
        uint256 required = (winner.totalSupply() * PRICE_DECIMALS_E6) / 1e18;
        
        if (m.usdcVault > required) {
            uint256 residue = m.usdcVault - required;
            m.usdcVault = required; 
            if (m.totalLpUsdc > 0) {
                accResidualPerUSDCE18[id] += (residue * 1e18) / m.totalLpUsdc;
                lpResidualUSDC[id] += residue;
                emit ResidualFinalized(id, residue, m.totalLpUsdc);
            }
        }
    }

    // =========================================================================
    //                              REDEMPTION
    // =========================================================================

    function redeem(uint256 id, bool isYes) external nonReentrant {
        Market storage m = markets[id];
        if (!m.resolution.isResolved) revert MarketNotActive();
        
        uint256 bal = isYes ? m.yes.balanceOf(msg.sender) : m.no.balanceOf(msg.sender);
        if (bal == 0) revert InsufficientBalance();

        uint256 payout = 0;
        if (m.status == MarketStatus.Resolved) {
            if (isYes == m.resolution.yesWins) {
                payout = (bal * PRICE_DECIMALS_E6) / 1e18;
            }
        } else if (m.status == MarketStatus.Cancelled) {
            payout = (bal * PRICE_DECIMALS_E6) / 1e18;
        }

        if (payout == 0) revert DustAmount(); // Or lose condition
        if (m.usdcVault < payout) revert InsufficientBalance();

        if (isYes) m.yes.burn(msg.sender, bal);
        else m.no.burn(msg.sender, bal);

        m.usdcVault -= payout;
        usdc.safeTransfer(msg.sender, payout);
        emit Redeemed(id, msg.sender, payout);
    }

    // --- Residual Claims ---
    function pendingLpResidual(uint256 id, address lp) public view returns (uint256) {
        uint256 entitled = (lpShares[id][lp] * accResidualPerUSDCE18[id]) / 1e18;
        return entitled - lpResidualDebt[id][lp];
    }

    function claimLpResidual(uint256 id) external nonReentrant {
        uint256 pending = pendingLpResidual(id, msg.sender);
        if (pending == 0) return;
        uint256 pot = lpResidualUSDC[id];
        if (pending > pot) revert InsufficientBalance();
        
        lpResidualDebt[id][msg.sender] += pending;
        lpResidualUSDC[id] = pot - pending;
        
        usdc.safeTransfer(msg.sender, pending);
        emit LpResidualClaimed(id, msg.sender, pending);
    }
}