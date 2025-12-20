// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PositionToken.sol";

/**
 * @notice Shared storage layout for the SpeculateX Diamond.
 * @dev IMPORTANT: Storage layout must be preserved across all facets.
 * 1. NEVER REORDER existing variables.
 * 2. ONLY APPEND new variables to the end of the contract.
 * 3. Both Router and Facets MUST inherit this exactly as defined.
 * 
 * UNITS:
 * - USDC: 6 decimals (stored in usdcVault, totalLpUsdc, lpFeesUSDC, residualUSDC).
 * - E18: 18 decimals (stored in qYes, qNo, bE18, dustSharesE18, liquidityMultiplierE18, maxJumpE18).
 * - targetValue: In oracle feed decimals (8 for BTC/USD, ETH/USD etc.).
 * 
 * NOTE: Fee-on-transfer tokens are NOT supported. The protocol expects standard ERC20 behavior (specifically USDC).
 */
abstract contract CoreStorage {
    // ===== Roles (use AccessControl in router + facets) =====
    bytes32 public constant MARKET_CREATOR_ROLE = keccak256("MARKET_CREATOR_ROLE");

    // ===== Tokens / addresses =====
    address public usdc;            // IERC20 but store address to reduce facet imports
    address public treasury;
    address public chainlinkResolver;

    // ===== Constants =====
    uint256 public constant USDC_TO_E18 = 1e12;
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_SHARES = 1e60; // 1 trillion * 1 trillion * 1 trillion tokens
    uint256 public constant MIN_LP_USDC = 1e6; // 1 USDC minimum liquidity floor (6 decimals)

    // ===== Global params =====
    uint256 public maxUsdcPerTrade;
    uint256 public minMarketSeed;
    uint256 public minLiquidityAdd;
    uint256 public dustSharesE18;
    uint256 public liquidityMultiplierE18;
    uint256 public maxInstantJumpE18;

    uint16 public defaultFeeTreasuryBps;
    uint16 public defaultFeeLpBps;
    uint16 public defaultFeeVaultBps;

    // ===== Simple pause + reentrancy (lighter than OZ in router) =====
    bool internal _paused;
    uint256 internal _lock; // 0 = unlocked, 1 = locked

    modifier whenNotPaused() {
        require(!_paused, "PAUSED");
        _;
    }

    modifier nonReentrant() {
        require(_lock == 0, "REENTRANCY");
        _lock = 1;
        _;
        _lock = 0;
    }

    // ===== Resolution =====
    enum MarketStatus { Active, Resolved, Cancelled }
    enum Comparison { Above, Below, Equals }
    enum OracleType { None, ChainlinkFeed }

    struct ResolutionConfig {
        uint256 expiryTimestamp;
        OracleType oracleType;
        address oracleAddress;
        bytes32 priceFeedId;
        uint256 targetValue;
        Comparison comparison;
        bool yesWins;
        bool isResolved;
        // Chainlink feed decimals recorded at market creation (0 for OracleType.None).
        // Used as a guardrail to avoid accidental decimal mismatches.
        uint8 oracleDecimals;
    }

    struct Market {
        PositionToken yes;
        PositionToken no;

        uint256 qYes;
        uint256 qNo;
        uint256 bE18;

        uint256 usdcVault; // USDC (6 decimals)

        uint16 feeTreasuryBps;
        uint16 feeLpBps;
        uint16 feeVaultBps;

        MarketStatus status;

        // Store both hash (for indexing) and full question (for frontend)
        bytes32 questionHash;
        string question;
        address creator;

        // LP
        uint256 totalLpUsdc;
        uint256 lpFeesUSDC;

        // Residual
        uint256 residualUSDC;

        // safety
        uint256 priceBandThresholdUSDC;
        uint256 maxJumpE18;

        ResolutionConfig resolution;
    }

    mapping(uint256 => Market) public markets;
    uint256 public marketCount;

    // LP accounting
    mapping(uint256 => mapping(address => uint256)) public lpShares;
    mapping(uint256 => uint256) public accFeePerUSDCE18;
    mapping(uint256 => mapping(address => uint256)) public lpFeeDebt;

    mapping(uint256 => uint256) public accResidualPerUSDCE18;
    mapping(uint256 => mapping(address => uint256)) public lpResidualDebt;

    // ===== Facet routing =====
    mapping(bytes4 => address) public facetOf; // selector => facet

    // ===== Timelock ops (for facet upgrades / admin changes) =====
    // Configurable delay (set in router constructor). For production, use >= 24 hours.
    uint256 public minTimelockDelay;
    uint256 public opNonce;

    enum OpStatus { None, Scheduled, Executed, Cancelled }
    struct Op {
        bytes32 tag;
        bytes32 dataHash;
        uint256 readyAt;
        OpStatus status;
    }
    mapping(bytes32 => Op) public ops;

    event OperationScheduled(bytes32 indexed opId, bytes32 indexed tag, uint256 readyAt);
    event OperationExecuted(bytes32 indexed opId);
    event OperationCancelled(bytes32 indexed opId);

    // tags
    bytes32 public constant OP_SET_FACET   = keccak256("OP_SET_FACET");
    bytes32 public constant OP_SET_TREASURY= keccak256("OP_SET_TREASURY");
    bytes32 public constant OP_SET_RESOLVER= keccak256("OP_SET_RESOLVER");
    bytes32 public constant OP_PAUSE       = keccak256("OP_PAUSE");
    bytes32 public constant OP_UNPAUSE     = keccak256("OP_UNPAUSE");
    bytes32 public constant OP_CANCEL_MARKET= keccak256("OP_CANCEL_MARKET");
    bytes32 public constant OP_RECOVER_ETH = keccak256("OP_RECOVER_ETH");
    bytes32 public constant OP_REMOVE_FACET = keccak256("OP_REMOVE_FACET");

    uint256 public constant OP_EXPIRY_WINDOW = 7 days;

    error OpInvalid();
    error OpNotReady(uint256 readyAt);
    error OpExpired();
    error TagMismatch();
    error DataMismatch();
    error NotAuthorized();

    function _consume(bytes32 opId, bytes32 tag, bytes memory data) internal {
        Op storage op = ops[opId];
        if (op.status != OpStatus.Scheduled) revert OpInvalid();
        if (block.timestamp < op.readyAt) revert OpNotReady(op.readyAt);
        if (block.timestamp > op.readyAt + OP_EXPIRY_WINDOW) revert OpExpired();
        if (op.tag != tag) revert TagMismatch();
        if (op.dataHash != keccak256(data)) revert DataMismatch();

        op.status = OpStatus.Executed;
        emit OperationExecuted(opId);
    }

    function _checkRoleInternal(bytes32 role, address account) internal view {
        // We assume the contract itself (the Diamond) implements IAccessControl
        // This works because facets are called via delegatecall.
        (bool success, bytes memory data) = address(this).staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", role, account)
        );
        if (!success || !abi.decode(data, (bool))) revert NotAuthorized();
    }

    // LP dust tracking (M-02)
    mapping(uint256 => uint256) public lpFeeDustUSDC;
    mapping(uint256 => uint256) public lpResidualDustUSDC;

    // ===== Future Upgrade Gap =====
    uint256 public constant STORAGE_VERSION = 1;
    uint256[50] private __gap;
}
