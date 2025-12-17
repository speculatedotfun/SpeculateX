// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

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

        // Preserve the current spot price when increasing liquidity depth:
        // LMSR price depends on (qYes, qNo, b). We change b, so we also scale q's by the same factor.
        // We mint the delta to the router (address(this)) so circulating supply / user balances are unchanged.
        uint256 oldB = m.bE18;
        uint256 ln2E18 = 693147180559945309;
        uint256 newB = (m.totalLpUsdc * liquidityMultiplierE18 * USDC_TO_E18) / ln2E18;

        if (oldB > 0 && newB > oldB) {
            // qNew = qOld * newB / oldB
            uint256 qYesNew = Math.mulDiv(m.qYes, newB, oldB);
            uint256 qNoNew  = Math.mulDiv(m.qNo,  newB, oldB);

            uint256 dYes = qYesNew > m.qYes ? (qYesNew - m.qYes) : 0;
            uint256 dNo  = qNoNew  > m.qNo  ? (qNoNew  - m.qNo)  : 0;

            if (dYes > 0) m.yes.mint(address(this), dYes);
            if (dNo  > 0) m.no.mint(address(this), dNo);

            m.qYes = qYesNew;
            m.qNo  = qNoNew;
        }

        m.bE18 = newB;

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
