// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {TestSetup} from "./TestSetup.sol";
import {CoreStorage} from "../src/CoreStorage.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {LiquidityFacet} from "../src/facets/LiquidityFacet.sol";

contract LiquidityPriceInvariantTest is TestSetup {
    function test_addLiquidity_keepsSpotPriceStable() public {
        // Create a market with initial liquidity.
        usdc.faucet(10_000e6);
        uint256 id = _createBinaryMarket(
            admin,
            1_000e6,
            block.timestamp + 30 days,
            address(0),
            0,
            CoreStorage.Comparison.Above
        );

        // Push price away from 50/50 by buying YES.
        vm.startPrank(admin);
        usdc.approve(address(core), type(uint256).max);
        // Keep this small enough to avoid triggering the instant jump safety check.
        TradingFacet(address(core)).buy(id, true, 100e6, 0);
        vm.stopPrank();

        uint256 pBefore = TradingFacet(address(core)).spotPriceYesE18(id);

        // Add liquidity; this should increase b but preserve the spot price.
        vm.startPrank(alice);
        usdc.faucet(10_000e6);
        usdc.approve(address(core), type(uint256).max);
        LiquidityFacet(address(core)).addLiquidity(id, 5_000e6);
        vm.stopPrank();

        uint256 pAfter = TradingFacet(address(core)).spotPriceYesE18(id);

        // Exact equality is expected (we scale q's by b ratio).
        assertEq(pAfter, pBefore, "spot price changed after addLiquidity");
    }
}


