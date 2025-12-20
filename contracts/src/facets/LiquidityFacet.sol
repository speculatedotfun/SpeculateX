// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "../CoreStorage.sol";

contract LiquidityFacet is CoreStorage {
    using SafeERC20 for IERC20;

    event LiquidityAdded(uint256 indexed id, address indexed lp, uint256 usdcAdd, uint256 newB);
    event LiquidityRemoved(uint256 indexed id, address indexed lp, uint256 usdcRemove, uint256 newB);
    event LpFeesClaimed(uint256 indexed id, address indexed lp, uint256 amount);

    error InvalidMarket();
    error MarketNotActive();
    error InsufficientSeed();
    error InsufficientShares();
    error SolvencyIssue();
    error CannotRemoveLastLiquidity();
    error LiquidityTooLow();
    error QTooLarge();

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

            // Enforce MAX_SHARES cap to prevent extreme q values
            if (qYesNew > MAX_SHARES || qNoNew > MAX_SHARES) revert QTooLarge();

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
        _claimLpFees(id, msg.sender);
    }

    function _claimLpFees(uint256 id, address lp) internal {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();

        uint256 share = lpShares[id][lp];
        uint256 pending = (share * accFeePerUSDCE18[id]) / 1e18 - lpFeeDebt[id][lp];

        if (pending == 0) return;
        if (pending > m.lpFeesUSDC) revert SolvencyIssue();

        lpFeeDebt[id][lp] += pending;
        m.lpFeesUSDC -= pending;

        IERC20(usdc).safeTransfer(lp, pending);
        emit LpFeesClaimed(id, lp, pending);
    }

    function removeLiquidity(uint256 id, uint256 usdcRemove) external nonReentrant whenNotPaused {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (lpShares[id][msg.sender] < usdcRemove) revert InsufficientShares();

        // 1. Claim any pending fees first to simplify accounting
        _claimLpFees(id, msg.sender);

        // 2. Solvency check: ensure vault can still cover worst-case liability after withdrawal
        uint256 lockedYes = m.yes.balanceOf(address(this));
        uint256 lockedNo  = m.no.balanceOf(address(this));
        uint256 cirYes = m.qYes > lockedYes ? (m.qYes - lockedYes) : 0;
        uint256 cirNo  = m.qNo  > lockedNo  ? (m.qNo  - lockedNo)  : 0;
        uint256 maxLiability = (cirYes > cirNo ? cirYes : cirNo) / 1e12;
        uint256 bufferUSDC = 1000; // 0.001 USDC (6 decimals)
        
        if (m.usdcVault - usdcRemove + bufferUSDC < maxLiability) revert SolvencyIssue();

        // 3. Check minimum liquidity floor (prevent bE18 == 0)
        uint256 newTotalLp = m.totalLpUsdc - usdcRemove;
        if (m.status == MarketStatus.Active && newTotalLp < MIN_LP_USDC) revert LiquidityTooLow();

        // 4. Update LP records
        lpShares[id][msg.sender] -= usdcRemove;
        m.totalLpUsdc = newTotalLp;
        m.usdcVault -= usdcRemove;

        // 5. Recalculate b and scale down q's
        uint256 oldB = m.bE18;
        uint256 ln2E18 = 693147180559945309;
        uint256 newB = (m.totalLpUsdc * liquidityMultiplierE18 * USDC_TO_E18) / ln2E18;

        if (oldB > 0 && newB < oldB) {
            // qNew = qOld * newB / oldB
            uint256 qYesNew = Math.mulDiv(m.qYes, newB, oldB);
            uint256 qNoNew  = Math.mulDiv(m.qNo,  newB, oldB);

            // Enforce MAX_SHARES cap (though scaling down shouldn't exceed, this is defensive)
            if (qYesNew > MAX_SHARES || qNoNew > MAX_SHARES) revert QTooLarge();

            uint256 dYes = m.qYes > qYesNew ? (m.qYes - qYesNew) : 0;
            uint256 dNo  = m.qNo  > qNoNew  ? (m.qNo  - qNoNew)  : 0;

            // Burn from router (address(this))
            // Must burn full amount to preserve spot price - revert if insufficient locked shares
            if (dYes > 0) {
                uint256 bal = m.yes.balanceOf(address(this));
                if (bal < dYes) revert SolvencyIssue(); // Insufficient locked shares to preserve price
                m.yes.burn(address(this), dYes);
                m.qYes = qYesNew;
            } else {
                m.qYes = qYesNew;
            }
            
            if (dNo > 0) {
                uint256 bal = m.no.balanceOf(address(this));
                if (bal < dNo) revert SolvencyIssue(); // Insufficient locked shares to preserve price
                m.no.burn(address(this), dNo);
                m.qNo = qNoNew;
            } else {
                m.qNo = qNoNew;
            }
        }

        m.bE18 = newB;

        // 6. Update fee debt for the remaining shares
        lpFeeDebt[id][msg.sender] = (lpShares[id][msg.sender] * accFeePerUSDCE18[id]) / 1e18;

        // 7. Transfer USDC back
        IERC20(usdc).safeTransfer(msg.sender, usdcRemove);

        emit LiquidityRemoved(id, msg.sender, usdcRemove, m.bE18);
    }
}
