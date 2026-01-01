// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {TestSetup} from "./TestSetup.sol";
import {LiquidityFacet} from "../src/facets/LiquidityFacet.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {SettlementFacet} from "../src/facets/SettlementFacet.sol";
import {CoreStorage} from "../src/CoreStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LiquidityFacetTest is TestSetup {
    uint256 internal marketId;

    function setUp() public override {
        super.setUp();
        usdc.faucet(50_000e6);
        marketId = _createBinaryMarket(
            admin,
            20_000e6,
            block.timestamp + 7 days,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );
    }

    function test_removeLiquidity_basic() public {
        uint256 addAmount = 10_000e6;
        uint256 removeAmount = 5_000e6;

        // Add liquidity
        vm.startPrank(admin);
        usdc.approve(address(core), addAmount);
        LiquidityFacet(address(core)).addLiquidity(marketId, addAmount);
        vm.stopPrank();

        // Wait for cooldown (H-01 fix)
        vm.roll(block.number + 2);

        uint256 adminBefore = usdc.balanceOf(admin);
        uint256 vaultBefore;
        (, , vaultBefore, , , ) = MarketFacet(address(core)).getMarketState(marketId);

        // Remove liquidity
        vm.startPrank(admin);
        LiquidityFacet(address(core)).removeLiquidity(marketId, removeAmount);
        vm.stopPrank();

        uint256 adminAfter = usdc.balanceOf(admin);
        uint256 vaultAfter;
        (, , vaultAfter, , , ) = MarketFacet(address(core)).getMarketState(marketId);

        assertEq(adminAfter - adminBefore, removeAmount);
        assertEq(vaultBefore - vaultAfter, removeAmount);
    }

    function test_removeLiquidity_revertsOnInsufficientShares() public {
        vm.startPrank(alice);
        usdc.approve(address(core), 10_000e6);
        LiquidityFacet(address(core)).addLiquidity(marketId, 5_000e6);
        
        // Try to remove more than added
        vm.expectRevert(LiquidityFacet.InsufficientShares.selector);
        LiquidityFacet(address(core)).removeLiquidity(marketId, 10_000e6);
        vm.stopPrank();
    }

    function test_removeLiquidity_revertsOnSolvencyViolation() public {
        // Add liquidity
        vm.startPrank(admin);
        usdc.approve(address(core), 20_000e6);
        LiquidityFacet(address(core)).addLiquidity(marketId, 20_000e6);
        vm.stopPrank();

        // Wait for cooldown (H-01 fix)
        vm.roll(block.number + 2);

        // Create positions that would make large removal unsafe
        // Use smaller trades to stay within price jump limits
        vm.startPrank(alice);
        usdc.approve(address(core), 5_000e6);
        TradingFacet(address(core)).buy(marketId, true, 5_000e6, 0);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(core), 5_000e6);
        TradingFacet(address(core)).buy(marketId, false, 5_000e6, 0);
        vm.stopPrank();

        // Try to remove most liquidity - should revert if it would violate solvency
        vm.startPrank(admin);
        vm.expectRevert(); // SolvencyIssue or similar
        LiquidityFacet(address(core)).removeLiquidity(marketId, 35_000e6);
        vm.stopPrank();
    }

    function test_removeLiquidity_revertsOnLastLiquidity() public {
        // Wait for cooldown first (H-01 fix) - market creator is the initial LP
        vm.roll(block.number + 2);

        // Try to remove all liquidity when it's the only liquidity
        vm.startPrank(admin);
        // removeLiquidity enforces a minimum LP floor via LiquidityTooLow()
        vm.expectRevert(LiquidityFacet.LiquidityTooLow.selector);
        LiquidityFacet(address(core)).removeLiquidity(marketId, 20_000e6);
        vm.stopPrank();
    }

    function test_removeLiquidity_preservesPrice() public {
        uint256 addAmount = 10_000e6;
        uint256 removeAmount = 5_000e6;

        // Add liquidity
        vm.startPrank(admin);
        usdc.approve(address(core), addAmount);
        LiquidityFacet(address(core)).addLiquidity(marketId, addAmount);
        vm.stopPrank();

        // Wait for cooldown (H-01 fix)
        vm.roll(block.number + 2);

        // Get price before
        uint256 priceBefore = TradingFacet(address(core)).spotPriceYesE18(marketId);

        // Remove liquidity
        vm.startPrank(admin);
        LiquidityFacet(address(core)).removeLiquidity(marketId, removeAmount);
        vm.stopPrank();

        // Price should be preserved (approximately)
        uint256 priceAfter = TradingFacet(address(core)).spotPriceYesE18(marketId);
        // Allow small deviation due to rounding
        uint256 diff = priceBefore > priceAfter ? priceBefore - priceAfter : priceAfter - priceBefore;
        assertLt(diff, 1e15); // Less than 0.1% deviation
    }

    function test_removeLiquidity_revertsOnInactiveMarket() public {
        // Resolve market first
        vm.warp(block.timestamp + 8 days);
        vm.prank(address(resolver));
        SettlementFacet(address(core)).resolveMarketWithPrice(marketId, 150e8);
        
        vm.startPrank(admin);
        vm.expectRevert(LiquidityFacet.MarketNotActive.selector);
        LiquidityFacet(address(core)).removeLiquidity(marketId, 5_000e6);
        vm.stopPrank();
    }

    function test_addLiquidity_claimFeesAfterRemoval() public {
        // First trade to ensure qYes/qNo > 0 so addLiquidity mints locked shares to the router.
        vm.startPrank(alice);
        usdc.approve(address(core), 1_000e6);
        TradingFacet(address(core)).buy(marketId, true, 1_000e6, 0);
        vm.stopPrank();

        // Add liquidity AFTER trades, so router has locked shares and later removals can preserve price.
        vm.startPrank(admin);
        usdc.approve(address(core), 30_000e6);
        LiquidityFacet(address(core)).addLiquidity(marketId, 30_000e6);
        vm.stopPrank();

        // Wait for cooldown (H-01 fix)
        vm.roll(block.number + 2);

        // Generate fees (LP fee accrual)
        vm.startPrank(alice);
        usdc.approve(address(core), 5_000e6);
        TradingFacet(address(core)).buy(marketId, true, 5_000e6, 0);
        vm.stopPrank();

        // Remove some liquidity (but leave enough for solvency).
        // NOTE: removeLiquidity auto-claims any pending LP fees first.
        vm.startPrank(admin);
        uint256 beforeRemove = usdc.balanceOf(admin);
        LiquidityFacet(address(core)).removeLiquidity(marketId, 1_000e6);
        uint256 afterRemove = usdc.balanceOf(admin);
        assertGt(afterRemove, beforeRemove);

        // Calling claimLpFees again should not revert (it may be 0 if already claimed).
        LiquidityFacet(address(core)).claimLpFees(marketId);
        vm.stopPrank();
    }
}

