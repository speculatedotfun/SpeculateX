// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";

contract SpeculateCoreTest is BaseTest {
    function test_Deployment() public {
        assertEq(address(core.usdc()), address(usdc));
        assertEq(core.treasury(), address(treasury));
        assertEq(core.marketCount(), 0);
        assertTrue(core.hasRole(core.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(core.hasRole(core.MARKET_CREATOR_ROLE(), marketCreator));
    }

    function test_CreateMarket() public {
        uint256 marketId = createTestMarket();

        assertEq(core.marketCount(), 1);
        assertEq(marketId, 1);

        // Test market creation - basic checks
        assertEq(core.marketCount(), 1);
    }

    function test_AddLiquidity() public {
        uint256 marketId = createTestMarket();

        vm.prank(liquidityProvider);
        core.addLiquidity(marketId, LIQUIDITY_ADD);

        assertEq(core.lpShares(marketId, liquidityProvider), LIQUIDITY_ADD);
        // Market already has MARKET_SEED (100e6) from creation, plus new liquidity
        assertEq(usdc.balanceOf(address(core)), MARKET_SEED + LIQUIDITY_ADD);
    }

    function test_AddLiquidityMinimum() public {
        uint256 marketId = createTestMarket();

        vm.prank(liquidityProvider);
        vm.expectRevert();
        core.addLiquidity(marketId, 1e6); // 1 USDC < MIN_LIQUIDITY_ADD
    }

    function test_BuyYes() public {
        uint256 marketId = createTestMarketWithLiquidity();
        uint256 usdcIn = 100e6; // 100 USDC

        uint256 usdcBalanceBefore = usdc.balanceOf(trader1);

        vm.prank(trader1);
        core.buyYes(marketId, usdcIn, 0);

        uint256 usdcBalanceAfter = usdc.balanceOf(trader1);

        assertEq(usdcBalanceBefore - usdcBalanceAfter, usdcIn);
        // Token balance check would require token access - simplified for now
    }

    function test_BuyNo() public {
        uint256 marketId = createTestMarketWithLiquidity();
        uint256 usdcIn = 100e6; // 100 USDC

        uint256 usdcBalanceBefore = usdc.balanceOf(trader1);

        vm.prank(trader1);
        core.buyNo(marketId, usdcIn, 0);

        uint256 usdcBalanceAfter = usdc.balanceOf(trader1);

        assertEq(usdcBalanceBefore - usdcBalanceAfter, usdcIn);
    }

    function test_SellYes() public {
        uint256 marketId = createTestMarketWithLiquidity();
        uint256 usdcIn = 100e6; // 100 USDC

        vm.prank(trader1);
        core.buyYes(marketId, usdcIn, 0);

        // Test that sell requires proper token amount (simplified)
        vm.prank(trader1);
        vm.expectRevert(); // Should revert with insufficient tokens or similar
        core.sellYes(marketId, 1000e18, 0); // Try to sell more than owned
    }

    function test_SellNo() public {
        uint256 marketId = createTestMarketWithLiquidity();
        uint256 usdcIn = 100e6; // 100 USDC

        vm.prank(trader1);
        core.buyNo(marketId, usdcIn, 0);

        // Test that sell requires proper token amount (simplified)
        vm.prank(trader1);
        vm.expectRevert(); // Should revert with insufficient tokens or similar
        core.sellNo(marketId, 1000e18, 0); // Try to sell more than owned
    }

    function test_SpotPriceCalculation() public {
        uint256 marketId = createTestMarketWithLiquidity();

        // Initially should be ~50% (balanced market)
        uint256 spotPrice = core.spotPriceYesE18(marketId);
        assertApproxEq(spotPrice, 5e17, 1e16); // ~0.5 with 1% tolerance

        // Buy YES tokens to shift price (use smaller amount to avoid jump cap)
        vm.prank(trader1);
        core.buyYes(marketId, 100e6, 0); // Smaller buy to avoid price jump cap

        uint256 newSpotPrice = core.spotPriceYesE18(marketId);
        assertTrue(newSpotPrice > spotPrice); // Price should increase
    }

    function test_ResolveMarket() public {
        uint256 marketId = createTestMarketWithLiquidity();

        // Buy some YES tokens
        vm.prank(trader1);
        core.buyYes(marketId, 100e6, 0);

        // Fast forward past expiry (market expires in 30 days)
        vm.warp(block.timestamp + 31 days);

        // Resolve market as YES wins
        vm.prank(admin);
        core.resolveMarket(marketId, true);

        // Check market is resolved
        SpeculateCore.ResolutionConfig memory resolution = core.getMarketResolution(marketId);
        assertTrue(resolution.isResolved);
        assertTrue(resolution.yesWins);
    }

    function test_ClaimLpFees() public {
        uint256 marketId = createTestMarketWithLiquidity();

        // Generate some trading fees
        vm.prank(trader1);
        core.buyYes(marketId, 100e6, 0);

        vm.prank(trader2);
        core.buyNo(marketId, 100e6, 0);

        // Check that claiming fees doesn't revert
        vm.prank(liquidityProvider);
        core.claimLpFees(marketId);
    }

    function test_PauseUnpause() public {
        uint256 marketId = createTestMarketWithLiquidity();

        // Pause contract
        vm.prank(admin);
        core.pause();

        // Trading should be blocked
        vm.prank(trader1);
        vm.expectRevert();
        core.buyYes(marketId, 100e6, 0);

        // Unpause
        vm.prank(admin);
        core.unpause();

        // Trading should work again
        vm.prank(trader1);
        core.buyYes(marketId, 100e6, 0);
    }

    function test_MaxUsdcPerTrade() public {
        uint256 marketId = createTestMarketWithLiquidity();

        // Try to trade more than max (100,000 USDC + 1)
        vm.prank(trader1);
        vm.expectRevert(); // Should revert with MaxTradeExceeded
        core.buyYes(marketId, 100_001e6, 0);
    }
}
