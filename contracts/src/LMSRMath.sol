// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LMSR Math Library
/// @notice Pure math functions for Logarithmic Market Scoring Rule
library LMSRMath {
    uint256 internal constant SCALE = 1e18;
    uint256 internal constant LN2 = 693_147_180_559_945_309;
    uint256 internal constant LOG2_E = 1_442_695_040_888_963_407;
    uint256 internal constant TWO_OVER_LN2 = (2 * SCALE * SCALE) / LN2;

    // --- Core Math ---

    function mul(uint256 x, uint256 y) internal pure returns (uint256) {
        unchecked { return (x * y) / SCALE; }
    }

    function div(uint256 x, uint256 y) internal pure returns (uint256) {
        require(y != 0, "Math: div0");
        unchecked { return (x * SCALE) / y; }
    }

    function exp2(uint256 x) internal pure returns (uint256) {
        if (x > 192 * SCALE) revert("Math: exp2 overflow");
        uint256 intPart = x / SCALE;
        uint256 frac = x % SCALE;
        uint256 res = SCALE;
        uint256 term = SCALE;
        uint256 y = mul(frac, LN2);
        
        // Taylor series expansion
        for (uint8 i = 1; i <= 12;) {
            term = (mul(term, y)) / i;
            res += term;
            unchecked { ++i; }
        }
        
        if (intPart >= 256) revert("Math: exp2 shift overflow");
        return (uint256(1) << intPart) * res;
    }

    function log2(uint256 x) internal pure returns (uint256) {
        require(x > 0, "Math: log2 zero");
        uint256 res = 0;
        if (x >= SCALE << 128) { x >>= 128; res += 128 * SCALE; }
        if (x >= SCALE << 64) { x >>= 64; res += 64 * SCALE; }
        if (x >= SCALE << 32) { x >>= 32; res += 32 * SCALE; }
        if (x >= SCALE << 16) { x >>= 16; res += 16 * SCALE; }
        if (x >= SCALE << 8) { x >>= 8; res += 8 * SCALE; }
        if (x >= SCALE << 4) { x >>= 4; res += 4 * SCALE; }
        if (x >= SCALE << 2) { x >>= 2; res += 2 * SCALE; }
        if (x >= SCALE << 1) { res += SCALE; x >>= 1; }
        
        uint256 z = div(x - SCALE, x + SCALE);
        uint256 z2 = mul(z, z);
        uint256 w = SCALE;
        w += mul(z2, SCALE) / 3;
        uint256 z4 = mul(z2, z2);
        w += mul(z4, SCALE) / 5;
        
        return res + mul(mul(z, w), TWO_OVER_LN2);
    }

    function ln(uint256 x) internal pure returns (uint256) {
        if (x == 0) revert("Math: ln0");
        return mul(log2(x), LN2);
    }

    // --- LMSR Specific ---

    /// @dev Calculates Cost C(q) = max(q) + b * ln(sum(exp((q_i - max(q))/b)))
    /// Simplified for 2 outcomes: max(qY, qN) + b * ln(1 + exp(-|qY-qN|/b))
    function calculateCost(uint256 qY, uint256 qN, uint256 b) internal pure returns (uint256) {
        require(b != 0, "Math: b0");
        uint256 maxQ = qY > qN ? qY : qN;
        uint256 minQ = qY < qN ? qY : qN;
        uint256 pos = div(maxQ - minQ, b);
        uint256 scaled = mul(pos, LOG2_E);
        
        // Optimization: if exp is massive, ln(1+0) -> 0, so result is maxQ
        if (scaled > 192 * SCALE) return maxQ;
        
        uint256 expPos = exp2(scaled);
        uint256 inner = SCALE + div(SCALE, expPos); // 1 + exp(-delta/b)
        return maxQ + mul(b, ln(inner));
    }

    /// @dev Calculates spot price of Yes token
    function calculateSpotPrice(uint256 qY, uint256 qN, uint256 b) internal pure returns (uint256) {
        require(b != 0, "Math: b0");
        if (qY == qN) return 5e17; // 0.5
        
        bool yGreater = qY > qN;
        uint256 absDelta = div(yGreater ? (qY - qN) : (qN - qY), b);
        uint256 scaled = mul(absDelta, LOG2_E);
        
        if (scaled > 192 * SCALE) return yGreater ? SCALE : 0;
        
        uint256 e = exp2(scaled);
        // P_yes = exp(qY/b) / (exp(qY/b) + exp(qN/b))
        // Simplifies to: 1 / (1 + exp(-(qY-qN)/b))
        return yGreater ? div(e, SCALE + e) : div(SCALE, SCALE + e);
    }

    /// @dev Binary search to find how many shares to mint for a given amount of USDC (netE18)
    function findSharesOut(
        uint256 qS, // Shares of the Side being bought
        uint256 qO, // Shares of the Other side
        uint256 netE18, // USDC input scaled to 18 decimals
        uint256 b
    ) internal pure returns (uint256) {
        uint256 baseCost = calculateCost(qS, qO, b);
        uint256 lo = 0;
        uint256 hi = b * 1e6; // Safety upper bound
        
        // 40 iterations give ample precision
        for (uint256 i = 0; i < 40;) {
            uint256 mid = (lo + hi) / 2;
            if (calculateCost(qS + mid, qO, b) - baseCost <= netE18) {
                lo = mid;
            } else {
                hi = mid;
            }
            unchecked { ++i; }
        }
        return lo;
    }
}