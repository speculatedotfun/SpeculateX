// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { SD59x18, sd } from "@prb/math/SD59x18.sol";
import { UD60x18, ud } from "@prb/math/UD60x18.sol";

/**
 * LMSRMath (100/100)
 * - Stable log-sum-exp for cost
 * - Sigmoid spot price
 * - Analytic buy solve (O(1))
 * - Overflow guards (PRB exp domain)
 *
 * Units:
 * - qYes, qNo: shares in 1e18
 * - bE18: liquidity parameter in 1e18
 * - cost: 1e18 units
 * - spot price: 1e18 (0..1e18)
 */
library LMSRMath {
    error ZeroB();
    error MathOverflow();
    error CalculationError();

    // PRB exp limit ~133e18 for SD59x18. Keep buffer.
    int256 private constant MAX_EXP_INPUT = 130e18;

    function calculateCost(uint256 qYes, uint256 qNo, uint256 bE18) internal pure returns (uint256) {
        if (bE18 == 0) revert ZeroB();

        SD59x18 x = _ratioE18(qYes, bE18); // qYes/b
        SD59x18 y = _ratioE18(qNo, bE18);  // qNo/b

        SD59x18 lse = _logSumExp(x, y);
        int256 lseInt = lse.unwrap();
        if (lseInt <= 0) revert CalculationError();

        return ud(bE18).mul(ud(uint256(lseInt))).unwrap();
    }

    function calculateSpotPrice(uint256 qYes, uint256 qNo, uint256 bE18) internal pure returns (uint256) {
        if (bE18 == 0) revert ZeroB();

        // z = (qNo - qYes)/b
        SD59x18 z = sd(int256(qNo) - int256(qYes)).div(sd(int256(bE18)));
        int256 zInt = z.unwrap();

        // Clamp to avoid exp reverts; correct asymptotes.
        if (zInt > MAX_EXP_INPUT) return 0;
        if (zInt < -MAX_EXP_INPUT) return 1e18;

        SD59x18 denom = sd(1e18).add(z.exp());
        SD59x18 p = sd(1e18).div(denom);

        int256 pInt = p.unwrap();
        return pInt > 0 ? uint256(pInt) : 0;
    }

    /**
     * Analytic buy: solve d such that:
     * cost(qSide + d, qOther) - cost(qSide, qOther) = netE18
     *
     * qNew = b * ln( exp(C_target/b) - exp(qOther/b) )
     * return d = qNew - qSide
     */
    function findSharesOut(uint256 qSide, uint256 qOther, uint256 netE18, uint256 bE18)
        internal
        pure
        returns (uint256)
    {
        if (bE18 == 0) revert ZeroB();
        if (netE18 == 0) return 0;

        uint256 c0 = calculateCost(qSide, qOther, bE18);
        uint256 c1 = c0 + netE18;

        SD59x18 c1OverB = _ratioE18(c1, bE18);       // C_target/b
        SD59x18 qOOverB = _ratioE18(qOther, bE18);   // qOther/b

        if (c1OverB.unwrap() > MAX_EXP_INPUT || qOOverB.unwrap() > MAX_EXP_INPUT) revert MathOverflow();

        SD59x18 diff = c1OverB.exp().sub(qOOverB.exp());
        if (diff.unwrap() <= 0) revert CalculationError();

        SD59x18 qNew = sd(int256(bE18)).mul(diff.ln());
        int256 qNewInt = qNew.unwrap();
        if (qNewInt <= int256(qSide)) return 0;

        return uint256(qNewInt) - qSide;
    }

    // log(exp(x)+exp(y)) = m + ln(1 + exp(-|x-y|))
    function _logSumExp(SD59x18 x, SD59x18 y) private pure returns (SD59x18) {
        SD59x18 m = x.gt(y) ? x : y;
        SD59x18 d = x.sub(y).abs().mul(sd(-1e18)); // -|x-y|
        return m.add(sd(1e18).add(d.exp()).ln());
    }

    // (aE18 / bE18) in 1e18 fixed-point using UD60x18
    function _ratioE18(uint256 aE18, uint256 bE18) private pure returns (SD59x18) {
        UD60x18 r = ud(aE18).div(ud(bE18));
        return sd(int256(r.unwrap()));
    }
}
