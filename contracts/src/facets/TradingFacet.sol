// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../CoreStorage.sol";
import "../LMSRMath.sol";

contract TradingFacet is CoreStorage {
    using SafeERC20 for IERC20;

    event Buy(uint256 indexed id, address indexed user, bool isYes, uint256 usdcIn, uint256 sharesOut, uint256 pYesE6);
    event Sell(uint256 indexed id, address indexed user, bool isYes, uint256 sharesIn, uint256 usdcOut, uint256 pYesE6);

    error InvalidMarket();
    error MarketNotActive();
    error MaxTradeExceeded();
    error DustAmount();
    error SlippageExceeded();
    error SolvencyIssue();
    error BackingInsufficient();
    error ExtremeImbalance();
    error BuyQuoteFailed();
    error Expired();

    function spotPriceYesE18(uint256 id) public view returns (uint256) {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        return LMSRMath.calculateSpotPrice(m.qYes, m.qNo, m.bE18);
    }

    function spotPriceYesE6(uint256 id) public view returns (uint256) {
        return spotPriceYesE18(id) / 1e12;
    }

    function getMaxJumpE18(uint256 id) public view returns (uint256) {
        Market storage m = markets[id];
        if (address(m.yes) == address(0)) revert InvalidMarket();
        return m.maxJumpE18 > 0 ? m.maxJumpE18 : maxInstantJumpE18;
    }

    function buy(uint256 id, bool isYes, uint256 usdcIn, uint256 minSharesOut) external {
        // Backwards-compatible entrypoint (no deadline).
        buy(id, isYes, usdcIn, minSharesOut, 0);
    }

    function buy(uint256 id, bool isYes, uint256 usdcIn, uint256 minSharesOut, uint256 deadline)
        public
        nonReentrant
        whenNotPaused
    {
        if (deadline != 0 && block.timestamp > deadline) revert Expired();
        Market storage m = markets[id];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp >= m.resolution.expiryTimestamp) revert MarketNotActive();
        if (usdcIn == 0) revert DustAmount();
        if (usdcIn > maxUsdcPerTrade) revert MaxTradeExceeded();

        uint256 feeT = (usdcIn * m.feeTreasuryBps) / BPS;
        uint256 feeL = (usdcIn * m.feeLpBps) / BPS;
        uint256 feeV = (usdcIn * m.feeVaultBps) / BPS;
        uint256 net  = usdcIn - feeT - feeL - feeV;

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), usdcIn);

        if (feeT > 0) IERC20(usdc).safeTransfer(treasury, feeT);

        if (feeL > 0 && m.totalLpUsdc > 0) {
            uint256 feeToDistribute = feeL + lpFeeDustUSDC[id];
            uint256 toAdd = (feeToDistribute * 1e18) / m.totalLpUsdc;
            
            if (toAdd > 0) {
                accFeePerUSDCE18[id] += toAdd;
                uint256 distributed = (toAdd * m.totalLpUsdc) / 1e18;
                lpFeeDustUSDC[id] = feeToDistribute - distributed;
            } else {
                lpFeeDustUSDC[id] = feeToDistribute;
            }
            m.lpFeesUSDC += feeL;
        }

        if (feeV > 0) m.usdcVault += feeV;
        m.usdcVault += net;

        uint256 netE18 = net * USDC_TO_E18;

        uint256 qSide = isYes ? m.qYes : m.qNo;
        uint256 qOther = isYes ? m.qNo : m.qYes;

        (bool ok, uint256 sharesOut) = LMSRMath.tryFindSharesOut(qSide, qOther, netE18, m.bE18);
        if (!ok) {
            sharesOut = _sharesOutBisection(qSide, qOther, netE18, m.bE18);
        }

        if (sharesOut < dustSharesE18) revert DustAmount();
        if (sharesOut < minSharesOut) revert SlippageExceeded();

        // Only the bought side increases.
        if (isYes) {
            if (m.qYes + sharesOut > MAX_SHARES) revert ExtremeImbalance();
        } else {
            if (m.qNo + sharesOut > MAX_SHARES) revert ExtremeImbalance();
        }

        _enforceSafety(m, isYes, sharesOut, true, m.usdcVault);

        if (isYes) {
            m.qYes += sharesOut;
            m.yes.mint(msg.sender, sharesOut);
        } else {
            m.qNo += sharesOut;
            m.no.mint(msg.sender, sharesOut);
        }

        emit Buy(id, msg.sender, isYes, usdcIn, sharesOut, spotPriceYesE6(id));
    }

    /**
     * @dev Buy liveness: bounded bisection that never depends on the analytic exp-domain solver.
     * Finds smallest d such that cost(qSide+d,qOther)-cost(qSide,qOther) >= netE18.
     */
    function _sharesOutBisection(uint256 qSide, uint256 qOther, uint256 netE18, uint256 bE18) internal pure returns (uint256) {
        if (netE18 == 0) return 0;

        uint256 baseCost = LMSRMath.calculateCost(qSide, qOther, bE18);

        uint256 maxD = MAX_SHARES > qSide ? (MAX_SHARES - qSide) : 0;
        if (maxD == 0) revert ExtremeImbalance();

        // Exponential search for an upper bound (capped) so bisection range stays tight.
        uint256 lo = 0;
        uint256 hi = 1;
        for (uint256 i = 0; i < 64; i++) {
            if (hi > maxD) hi = maxD;

            uint256 hiCost = LMSRMath.calculateCost(qSide + hi, qOther, bE18);
            uint256 hiDelta = hiCost > baseCost ? (hiCost - baseCost) : 0;
            if (hiDelta >= netE18) break;

            if (hi == maxD) revert BuyQuoteFailed();

            lo = hi + 1;
            // double, but avoid overflow / exceeding maxD
            if (hi > maxD / 2) {
                hi = maxD;
            } else {
                hi = hi * 2;
            }
        }
        // If still not bounded after 64 iterations, fail predictably.
        {
            uint256 checkCost = LMSRMath.calculateCost(qSide + hi, qOther, bE18);
            uint256 checkDelta = checkCost > baseCost ? (checkCost - baseCost) : 0;
            if (checkDelta < netE18) revert BuyQuoteFailed();
        }

        // Bisection within [lo, hi]
        for (uint256 i = 0; i < 64 && lo < hi; i++) {
            uint256 mid = (lo + hi) / 2;
            uint256 midCost = LMSRMath.calculateCost(qSide + mid, qOther, bE18);
            uint256 midDelta = midCost > baseCost ? (midCost - baseCost) : 0;
            if (midDelta >= netE18) hi = mid;
            else lo = mid + 1;
        }

        return hi;
    }

    function sell(uint256 id, bool isYes, uint256 sharesIn, uint256 minUsdcOut) external {
        // Backwards-compatible entrypoint (no deadline).
        sell(id, isYes, sharesIn, minUsdcOut, 0);
    }

    function sell(uint256 id, bool isYes, uint256 sharesIn, uint256 minUsdcOut, uint256 deadline)
        public
        nonReentrant
        whenNotPaused
    {
        if (deadline != 0 && block.timestamp > deadline) revert Expired();
        Market storage m = markets[id];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (block.timestamp >= m.resolution.expiryTimestamp) revert MarketNotActive();
        if (sharesIn < dustSharesE18) revert DustAmount();

        uint256 qSide = isYes ? m.qYes : m.qNo;
        if (sharesIn > qSide) revert SolvencyIssue();

        uint256 oldCost = LMSRMath.calculateCost(m.qYes, m.qNo, m.bE18);
        uint256 newQYes = isYes ? (m.qYes - sharesIn) : m.qYes;
        uint256 newQNo  = isYes ? m.qNo : (m.qNo - sharesIn);
        uint256 newCost = LMSRMath.calculateCost(newQYes, newQNo, m.bE18);

        uint256 refundE18 = oldCost - newCost;
        uint256 usdcOut = refundE18 / USDC_TO_E18;

        if (usdcOut < minUsdcOut) revert SlippageExceeded();
        if (usdcOut > m.usdcVault) revert SolvencyIssue();

        // Calculate post-deduction vault for safety checks
        uint256 vaultAfter = m.usdcVault - usdcOut;
        _enforceSafety(m, isYes, sharesIn, false, vaultAfter);

        m.usdcVault = vaultAfter;

        if (isYes) {
            m.qYes -= sharesIn;
            m.yes.burn(msg.sender, sharesIn);
        } else {
            m.qNo -= sharesIn;
            m.no.burn(msg.sender, sharesIn);
        }

        IERC20(usdc).safeTransfer(msg.sender, usdcOut);
        emit Sell(id, msg.sender, isYes, sharesIn, usdcOut, spotPriceYesE6(id));
    }

    function _enforceSafety(Market storage m, bool isYes, uint256 delta, bool isBuy, uint256 vaultValue) internal view {
        uint256 nextQYes = m.qYes;
        uint256 nextQNo  = m.qNo;

        if (isBuy) {
            if (isYes) nextQYes += delta; else nextQNo += delta;
        } else {
            if (isYes) nextQYes -= delta; else nextQNo -= delta;
        }

        if (nextQYes > MAX_SHARES || nextQNo > MAX_SHARES) revert ExtremeImbalance();

        // vault must cover worst-case payout for *circulating* supply.
        // We may hold "locked" shares on the router (address(this)) to preserve spot price when liquidity changes.
        // Those locked shares must NOT count towards user payouts / liabilities.
        uint256 lockedYes = m.yes.balanceOf(address(this));
        uint256 lockedNo  = m.no.balanceOf(address(this));

        uint256 cirYes = nextQYes > lockedYes ? (nextQYes - lockedYes) : 0;
        uint256 cirNo  = nextQNo  > lockedNo  ? (nextQNo  - lockedNo)  : 0;

        uint256 maxCir = cirYes > cirNo ? cirYes : cirNo;
        uint256 liabilityUSDC = maxCir / 1e12;

        uint256 bufferUSDC = 1000; // 0.001 USDC (6 decimals)
        if (vaultValue + bufferUSDC < liabilityUSDC) revert BackingInsufficient();

        if (vaultValue < m.priceBandThresholdUSDC) {
            uint256 pOld = LMSRMath.calculateSpotPrice(m.qYes, m.qNo, m.bE18);
            uint256 pNew = LMSRMath.calculateSpotPrice(nextQYes, nextQNo, m.bE18);

            uint256 diff = pOld > pNew ? (pOld - pNew) : (pNew - pOld);
            uint256 cap = m.maxJumpE18 > 0 ? m.maxJumpE18 : maxInstantJumpE18;
            if (diff > cap) revert SolvencyIssue();
        }
    }
}
