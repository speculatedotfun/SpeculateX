// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PositionToken.sol";

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

        // ✅ במקום string: hash בלבד (חוסך גם code + storage)
        bytes32 questionHash;
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
    uint256 public constant MIN_TIMELOCK_DELAY = 24 hours;
    uint256 public opNonce;

    enum OpStatus { None, Scheduled, Executed, Cancelled }
    struct Op {
        bytes32 tag;
        bytes32 dataHash;
        uint256 readyAt;
        OpStatus status;
    }
    mapping(bytes32 => Op) public ops;

    // tags
    bytes32 public constant OP_SET_FACET   = keccak256("OP_SET_FACET");
    bytes32 public constant OP_SET_TREASURY= keccak256("OP_SET_TREASURY");
    bytes32 public constant OP_SET_RESOLVER= keccak256("OP_SET_RESOLVER");
    bytes32 public constant OP_PAUSE       = keccak256("OP_PAUSE");
    bytes32 public constant OP_UNPAUSE     = keccak256("OP_UNPAUSE");
}
