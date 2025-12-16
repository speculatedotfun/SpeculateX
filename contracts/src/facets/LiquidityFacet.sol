// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../CoreStorage.sol";

contract LiquidityFacet is CoreStorage {
    using SafeERC20 for IERC20;

    event LiquidityAdded(uint256 indexed id, address indexed lp, uint256 usdcAdd, uint256 newB);
    event LpFeesClaimed(uint256 indexed id, address indexed lp, uint256 amount);

    error InvalidMarket();
    error MarketNotActive();
    error InsufficientSeed();
    error SolvencyIssue();

    function addLiquidity(uint256 id, uint256 usdcAdd) external nonReentrant whenNotPaused {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (usdcAdd < minLiquidityAdd) revert InsufficientSeed();

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), usdcAdd);

        m.usdcVault += usdcAdd;

        lpFeeDebt[id][msg.sender] += (usdcAdd * accFeePerUSDCE18[id]) / 1e18;

        lpShares[id][msg.sender] += usdcAdd;
        m.totalLpUsdc += usdcAdd;

        uint256 ln2E18 = 693147180559945309;
        m.bE18 = (m.totalLpUsdc * liquidityMultiplierE18 * USDC_TO_E18) / ln2E18;

        emit LiquidityAdded(id, msg.sender, usdcAdd, m.bE18);
    }

    function claimLpFees(uint256 id) external nonReentrant {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();

        uint256 share = lpShares[id][msg.sender];
        uint256 pending = (share * accFeePerUSDCE18[id]) / 1e18 - lpFeeDebt[id][msg.sender];

        if (pending == 0) return;
        if (pending > m.lpFeesUSDC) revert SolvencyIssue();

        lpFeeDebt[id][msg.sender] += pending;
        m.lpFeesUSDC -= pending;

        IERC20(usdc).safeTransfer(msg.sender, pending);
        emit LpFeesClaimed(id, msg.sender, pending);
    }
}
