// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../CoreStorage.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/// @notice Admin operations facet for Diamond pattern
/// @dev Can be added/updated without redeploying the Router
contract AdminFacet is CoreStorage {
    // AccessControl default admin role (0x00) without importing AccessControl storage.
    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
    event UsdcUpdated(address indexed usdc, uint8 decimals);
    event LimitsUpdated(uint256 maxUsdcPerTrade, uint256 minMarketSeed, uint256 minLiquidityAdd);
    event FeesUpdated(uint16 treasuryBps, uint16 lpBps, uint16 vaultBps);
    event PriceBandThresholdUpdated(uint256 thresholdUSDC);
    event MaxInstantJumpUpdated(uint256 maxJumpE18);
    event LpFeeCooldownUpdated(uint256 blocks);

    error ZeroAddress();
    error NotAContract(address addr);
    error BadValue();

    modifier onlyRole(bytes32 role) {
        require(IAccessControl(address(this)).hasRole(role, msg.sender), "NO_ROLE");
        _;
    }

    /// @notice Update USDC token address + decimals via timelock
    /// @param opId The scheduled operation ID
    /// @param newUsdc The new USDC token address
    /// @param newDecimals The token decimals (e.g. 6 or 18)
    function executeSetUsdc(bytes32 opId, address newUsdc, uint8 newDecimals)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (newUsdc == address(0)) revert ZeroAddress();
        if (newUsdc.code.length == 0) revert NotAContract(newUsdc);
        if (newDecimals > 18) revert BadValue();
        bytes memory data = abi.encode(newUsdc, newDecimals);
        _consume(opId, OP_SET_USDC, data);
        usdc = newUsdc;
        usdcDecimals = newDecimals;

        uint256 unit = 10 ** uint256(newDecimals);
        maxUsdcPerTrade = MAX_USDC_PER_TRADE_UNITS * unit;
        minMarketSeed   = MIN_MARKET_SEED_UNITS * unit;
        minLiquidityAdd = MIN_LIQUIDITY_ADD_UNITS * unit;

        emit UsdcUpdated(newUsdc, newDecimals);
    }

    /// @notice Update core USDC limits via timelock (values in whole token units)
    function executeSetLimits(
        bytes32 opId,
        uint256 maxUsdcPerTradeUnits,
        uint256 minMarketSeedUnits,
        uint256 minLiquidityAddUnits
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (maxUsdcPerTradeUnits == 0 || minMarketSeedUnits == 0 || minLiquidityAddUnits == 0) revert BadValue();
        bytes memory data = abi.encode(maxUsdcPerTradeUnits, minMarketSeedUnits, minLiquidityAddUnits);
        _consume(opId, OP_SET_LIMITS, data);

        uint256 unit = _usdcUnit();
        maxUsdcPerTrade = maxUsdcPerTradeUnits * unit;
        minMarketSeed   = minMarketSeedUnits * unit;
        minLiquidityAdd = minLiquidityAddUnits * unit;

        emit LimitsUpdated(maxUsdcPerTrade, minMarketSeed, minLiquidityAdd);
    }

    /// @notice Update fee split via timelock (bps)
    function executeSetFees(
        bytes32 opId,
        uint16 treasuryBps,
        uint16 lpBps,
        uint16 vaultBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (uint256(treasuryBps) + uint256(lpBps) + uint256(vaultBps) > BPS) revert BadValue();
        bytes memory data = abi.encode(treasuryBps, lpBps, vaultBps);
        _consume(opId, OP_SET_FEES, data);

        defaultFeeTreasuryBps = treasuryBps;
        defaultFeeLpBps = lpBps;
        defaultFeeVaultBps = vaultBps;

        emit FeesUpdated(treasuryBps, lpBps, vaultBps);
    }

    /// @notice Update default price band threshold (whole token units)
    function executeSetPriceBandThreshold(bytes32 opId, uint256 thresholdUnits)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (thresholdUnits == 0) revert BadValue();
        bytes memory data = abi.encode(thresholdUnits);
        _consume(opId, OP_SET_PRICE_BAND, data);

        defaultPriceBandThresholdUSDC = thresholdUnits * _usdcUnit();
        emit PriceBandThresholdUpdated(defaultPriceBandThresholdUSDC);
    }

    /// @notice Update max instant jump (E18 scale)
    function executeSetMaxInstantJump(bytes32 opId, uint256 maxJumpE18)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (maxJumpE18 == 0 || maxJumpE18 > 1e18) revert BadValue();
        bytes memory data = abi.encode(maxJumpE18);
        _consume(opId, OP_SET_MAX_JUMP, data);

        maxInstantJumpE18 = maxJumpE18;
        emit MaxInstantJumpUpdated(maxJumpE18);
    }

    /// @notice Update LP fee cooldown blocks
    function executeSetLpFeeCooldown(bytes32 opId, uint256 blocks)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bytes memory data = abi.encode(blocks);
        _consume(opId, OP_SET_LP_COOLDOWN, data);

        lpFeeCooldownBlocks = blocks;
        emit LpFeeCooldownUpdated(blocks);
    }
}

