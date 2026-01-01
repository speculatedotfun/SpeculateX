// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {TestSetup} from "./TestSetup.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {LiquidityFacet} from "../src/facets/LiquidityFacet.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {CoreStorage} from "../src/CoreStorage.sol";

contract TradingFeesTest is TestSetup {
    function test_buy_feeConservation_andLpFeesClaimable() public {
        // Fund admin for initial seed
        // Use a large seed so vault >= priceBandThresholdUSDC (10_000e6) and the
        // anti-jump safety check doesn't revert this test.
        usdc.faucet(25_000e6);

        uint256 id = _createBinaryMarket(
            admin,
            20_000e6,
            block.timestamp + 7 days,
            address(mockOracle), // Use valid oracle
            100e8, // Valid target value
            CoreStorage.Comparison.Above
        );

        uint256 usdcIn = 1_000e6;
        uint256 feeT = (usdcIn * 100) / 10_000; // 1%
        uint256 feeL = (usdcIn * 100) / 10_000; // 1%
        uint256 net = usdcIn - feeT - feeL;

        uint256 treasuryBefore = usdc.balanceOf(address(treasury));
        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.startPrank(alice);
        usdc.approve(address(core), usdcIn);
        TradingFacet(address(core)).buy(id, true, usdcIn, 0);
        vm.stopPrank();

        uint256 treasuryAfter = usdc.balanceOf(address(treasury));
        uint256 aliceAfter = usdc.balanceOf(alice);

        assertEq(treasuryAfter - treasuryBefore, feeT);
        assertEq(aliceBefore - aliceAfter, usdcIn);

        // Vault should increase by net (seed already included)
        (, , uint256 vault, , , ) = MarketFacet(address(core)).getMarketState(id);
        assertEq(vault, 20_000e6 + net);

        // Wait for cooldown (H-01 fix)
        vm.roll(block.number + 2);

        // LP fees should be claimable by the initial LP (admin)
        uint256 adminBefore = usdc.balanceOf(admin);
        LiquidityFacet(address(core)).claimLpFees(id);
        uint256 adminAfter = usdc.balanceOf(admin);
        assertEq(adminAfter - adminBefore, feeL);
    }
}


