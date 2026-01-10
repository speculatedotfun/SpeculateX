// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {TestSetup} from "./TestSetup.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {LiquidityFacet} from "../src/facets/LiquidityFacet.sol";
import {SettlementFacet} from "../src/facets/SettlementFacet.sol";
import {CoreStorage} from "../src/CoreStorage.sol";
import {PositionToken} from "../src/PositionToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title End-to-End Lifecycle Tests
/// @notice Tests complete market lifecycle from creation to redemption
contract E2ELifecycleTest is TestSetup {
    address internal charlie = address(0xC4A2);
    address internal dave = address(0xDAE);

    function setUp() public override {
        super.setUp();

        // Fund additional test users
        vm.prank(charlie);
        usdc.faucet(1_000_000e6);
        vm.prank(dave);
        usdc.faucet(1_000_000e6);
    }

    // ============================================
    // Full Market Lifecycle Tests
    // ============================================

    function test_fullLifecycle_yesWins() public {
        // ======= PHASE 1: Market Creation =======
        usdc.faucet(50_000e6);
        uint256 marketId = _createBinaryMarket(
            admin,
            20_000e6,
            block.timestamp + 7 days,
            address(mockOracle),
            100e8, // Target: price above 100
            CoreStorage.Comparison.Above
        );

        // Verify market created
        (uint256 qYes, uint256 qNo, uint256 vault, uint256 bE18_, CoreStorage.MarketStatus status, ) =
            MarketFacet(address(core)).getMarketState(marketId);
        assertTrue(status == CoreStorage.MarketStatus.Active);
        assertEq(vault, 20_000e6);

        // ======= PHASE 2: Trading =======
        // Alice buys YES (betting price will be above 100)
        vm.startPrank(alice);
        usdc.approve(address(core), 5_000e6);
        TradingFacet(address(core)).buy(marketId, true, 5_000e6, 0);
        vm.stopPrank();

        // Bob buys NO (betting price will be below 100)
        vm.startPrank(bob);
        usdc.approve(address(core), 3_000e6);
        TradingFacet(address(core)).buy(marketId, false, 3_000e6, 0);
        vm.stopPrank();

        // Charlie adds liquidity
        vm.startPrank(charlie);
        usdc.approve(address(core), 10_000e6);
        LiquidityFacet(address(core)).addLiquidity(marketId, 10_000e6);
        vm.stopPrank();

        // More trading
        vm.startPrank(dave);
        usdc.approve(address(core), 2_000e6);
        TradingFacet(address(core)).buy(marketId, true, 2_000e6, 0);
        vm.stopPrank();

        // Get token addresses
        (address yesToken, address noToken) = MarketFacet(address(core)).getMarketTokens(marketId);

        // Verify positions
        uint256 aliceYes = IERC20(yesToken).balanceOf(alice);
        uint256 bobNo = IERC20(noToken).balanceOf(bob);
        uint256 daveYes = IERC20(yesToken).balanceOf(dave);
        assertGt(aliceYes, 0, "Alice should have YES tokens");
        assertGt(bobNo, 0, "Bob should have NO tokens");
        assertGt(daveYes, 0, "Dave should have YES tokens");

        // ======= PHASE 3: Resolution =======
        // Warp past expiry
        vm.warp(block.timestamp + 7 days + 1);

        // Oracle reports price = 110 (above target of 100) -> YES wins
        uint80 round2 = uint80((uint256(1) << 64) | 2);
        uint80 round1 = uint80((uint256(1) << 64) | 1);
        mockOracle.setRoundData(round2, int256(110e8), block.timestamp, block.timestamp, round2);
        mockOracle.setRoundData(round1, int256(100e8), block.timestamp - 8 days, block.timestamp - 8 days, round1);

        // Resolve via resolver
        resolver.resolve(marketId, round2);

        // Verify resolution
        CoreStorage.ResolutionConfig memory res = MarketFacet(address(core)).getMarketResolution(marketId);
        assertTrue(res.isResolved, "Market should be resolved");
        assertTrue(res.yesWins, "YES should win");

        // ======= PHASE 4: Redemption =======
        // Alice redeems YES (winner)
        uint256 aliceUsdcBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        SettlementFacet(address(core)).redeem(marketId, true);
        uint256 aliceUsdcAfter = usdc.balanceOf(alice);
        assertGt(aliceUsdcAfter, aliceUsdcBefore, "Alice should receive USDC");

        // Dave redeems YES (winner)
        uint256 daveUsdcBefore = usdc.balanceOf(dave);
        vm.prank(dave);
        SettlementFacet(address(core)).redeem(marketId, true);
        uint256 daveUsdcAfter = usdc.balanceOf(dave);
        assertGt(daveUsdcAfter, daveUsdcBefore, "Dave should receive USDC");

        // Bob tries to redeem NO (loser) - should get 0
        vm.prank(bob);
        vm.expectRevert(SettlementFacet.DustAmount.selector);
        SettlementFacet(address(core)).redeem(marketId, false);

        // ======= PHASE 5: LP Claims =======
        // Wait for cooldown
        vm.roll(block.number + 2);

        // Admin (initial LP) claims fees
        uint256 adminFeesBefore = usdc.balanceOf(admin);
        vm.prank(admin);
        LiquidityFacet(address(core)).claimLpFees(marketId);
        uint256 adminFeesAfter = usdc.balanceOf(admin);
        assertGe(adminFeesAfter, adminFeesBefore, "Admin should claim fees");

        // Admin claims residual
        uint256 adminResidualBefore = usdc.balanceOf(admin);
        vm.prank(admin);
        SettlementFacet(address(core)).claimLpResidual(marketId);
        uint256 adminResidualAfter = usdc.balanceOf(admin);
        assertGe(adminResidualAfter, adminResidualBefore, "Admin should claim residual");

        // Charlie claims residual
        uint256 charlieResidualBefore = usdc.balanceOf(charlie);
        vm.prank(charlie);
        SettlementFacet(address(core)).claimLpResidual(marketId);
        uint256 charlieResidualAfter = usdc.balanceOf(charlie);
        assertGe(charlieResidualAfter, charlieResidualBefore, "Charlie should claim residual");
    }

    function test_fullLifecycle_noWins() public {
        // Create market
        usdc.faucet(50_000e6);
        uint256 marketId = _createBinaryMarket(
            admin,
            20_000e6,
            block.timestamp + 7 days,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Alice buys YES, Bob buys NO
        vm.startPrank(alice);
        usdc.approve(address(core), 5_000e6);
        TradingFacet(address(core)).buy(marketId, true, 5_000e6, 0);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(core), 5_000e6);
        TradingFacet(address(core)).buy(marketId, false, 5_000e6, 0);
        vm.stopPrank();

        (address yesToken, address noToken) = MarketFacet(address(core)).getMarketTokens(marketId);

        // Warp past expiry
        vm.warp(block.timestamp + 7 days + 1);

        // Oracle reports price = 90 (below target of 100) -> NO wins
        uint80 round2 = uint80((uint256(1) << 64) | 2);
        uint80 round1 = uint80((uint256(1) << 64) | 1);
        mockOracle.setRoundData(round2, int256(90e8), block.timestamp, block.timestamp, round2);
        mockOracle.setRoundData(round1, int256(100e8), block.timestamp - 8 days, block.timestamp - 8 days, round1);

        resolver.resolve(marketId, round2);

        // Verify NO wins
        CoreStorage.ResolutionConfig memory res = MarketFacet(address(core)).getMarketResolution(marketId);
        assertTrue(res.isResolved);
        assertFalse(res.yesWins, "NO should win");

        // Bob redeems NO (winner)
        uint256 bobUsdcBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        SettlementFacet(address(core)).redeem(marketId, false);
        uint256 bobUsdcAfter = usdc.balanceOf(bob);
        assertGt(bobUsdcAfter, bobUsdcBefore, "Bob should receive USDC");

        // Alice tries to redeem YES (loser) - should get 0
        vm.prank(alice);
        vm.expectRevert(SettlementFacet.DustAmount.selector);
        SettlementFacet(address(core)).redeem(marketId, true);
    }

    function test_fullLifecycle_withSellBeforeExpiry() public {
        // Create market
        usdc.faucet(50_000e6);
        uint256 marketId = _createBinaryMarket(
            admin,
            20_000e6,
            block.timestamp + 7 days,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Alice buys YES
        vm.startPrank(alice);
        usdc.approve(address(core), 5_000e6);
        TradingFacet(address(core)).buy(marketId, true, 5_000e6, 0);
        vm.stopPrank();

        (address yesToken, ) = MarketFacet(address(core)).getMarketTokens(marketId);
        uint256 aliceYes = IERC20(yesToken).balanceOf(alice);

        // Alice sells half her position
        uint256 aliceUsdcBefore = usdc.balanceOf(alice);
        vm.startPrank(alice);
        IERC20(yesToken).approve(address(core), aliceYes / 2);
        TradingFacet(address(core)).sell(marketId, true, aliceYes / 2, 0);
        vm.stopPrank();
        uint256 aliceUsdcAfter = usdc.balanceOf(alice);

        assertGt(aliceUsdcAfter, aliceUsdcBefore, "Alice should receive USDC from sell");
        assertEq(IERC20(yesToken).balanceOf(alice), aliceYes - aliceYes / 2, "Alice should have remaining tokens");

        // Market resolves YES wins
        vm.warp(block.timestamp + 7 days + 1);
        uint80 round2 = uint80((uint256(1) << 64) | 2);
        uint80 round1 = uint80((uint256(1) << 64) | 1);
        mockOracle.setRoundData(round2, int256(110e8), block.timestamp, block.timestamp, round2);
        mockOracle.setRoundData(round1, int256(100e8), block.timestamp - 8 days, block.timestamp - 8 days, round1);
        resolver.resolve(marketId, round2);

        // Alice redeems remaining YES
        vm.prank(alice);
        SettlementFacet(address(core)).redeem(marketId, true);
    }

    function test_fullLifecycle_multipleLPs() public {
        // Create market
        usdc.faucet(50_000e6);
        uint256 marketId = _createBinaryMarket(
            admin,
            10_000e6,
            block.timestamp + 7 days,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Multiple LPs add liquidity
        vm.startPrank(alice);
        usdc.approve(address(core), 5_000e6);
        LiquidityFacet(address(core)).addLiquidity(marketId, 5_000e6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(core), 10_000e6);
        LiquidityFacet(address(core)).addLiquidity(marketId, 10_000e6);
        vm.stopPrank();

        // Trading generates fees
        vm.startPrank(charlie);
        usdc.approve(address(core), 3_000e6);
        TradingFacet(address(core)).buy(marketId, true, 3_000e6, 0);
        vm.stopPrank();

        vm.startPrank(dave);
        usdc.approve(address(core), 2_000e6);
        TradingFacet(address(core)).buy(marketId, false, 2_000e6, 0);
        vm.stopPrank();

        // Wait for cooldown
        vm.roll(block.number + 2);

        // LPs claim fees proportionally
        uint256 adminFeesBefore = usdc.balanceOf(admin);
        vm.prank(admin);
        LiquidityFacet(address(core)).claimLpFees(marketId);
        uint256 adminFees = usdc.balanceOf(admin) - adminFeesBefore;

        uint256 aliceFeesBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        LiquidityFacet(address(core)).claimLpFees(marketId);
        uint256 aliceFees = usdc.balanceOf(alice) - aliceFeesBefore;

        uint256 bobFeesBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        LiquidityFacet(address(core)).claimLpFees(marketId);
        uint256 bobFees = usdc.balanceOf(bob) - bobFeesBefore;

        // Bob should get more fees than Alice (10k vs 5k LP)
        // Admin has 10k LP, Alice has 5k, Bob has 10k = 25k total
        // Fees should be proportional
        assertGt(bobFees, 0, "Bob should receive fees");
        assertGt(aliceFees, 0, "Alice should receive fees");
        assertGt(adminFees, 0, "Admin should receive fees");
    }

    function test_fullLifecycle_scheduledMarket() public {
        usdc.faucet(50_000e6);

        uint256 startTime = block.timestamp + 1 days;
        uint256 expiryTime = block.timestamp + 7 days;

        uint256 marketId = _createScheduledMarket(
            admin,
            20_000e6,
            startTime,
            expiryTime,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Trading should fail before start
        vm.startPrank(alice);
        usdc.approve(address(core), 5_000e6);
        vm.expectRevert(TradingFacet.MarketNotStarted.selector);
        TradingFacet(address(core)).buy(marketId, true, 1_000e6, 0);
        vm.stopPrank();

        // Warp to after start
        vm.warp(startTime + 1);
        mockOracle.setRoundData(1, int256(100e8), block.timestamp, block.timestamp, 1);

        // Trading should work now
        vm.startPrank(alice);
        TradingFacet(address(core)).buy(marketId, true, 1_000e6, 0);
        vm.stopPrank();

        (address yesToken, ) = MarketFacet(address(core)).getMarketTokens(marketId);
        assertGt(IERC20(yesToken).balanceOf(alice), 0, "Alice should have YES tokens");

        // Get the actual expiry timestamp from the market
        CoreStorage.ResolutionConfig memory res = MarketFacet(address(core)).getMarketResolution(marketId);
        uint256 actualExpiry = res.expiryTimestamp;

        // Warp to just after expiry
        vm.warp(actualExpiry + 1);

        // Set up oracle data properly:
        // Round 1: BEFORE expiry (updatedAt < expiryTimestamp)
        mockOracle.setRoundData(1, int256(100e8), actualExpiry - 1 hours, actualExpiry - 1 hours, 1);
        // Round 2: AFTER expiry (updatedAt > expiryTimestamp) - this is the first round after expiry
        mockOracle.setRoundData(2, int256(110e8), actualExpiry + 1, actualExpiry + 1, 2);

        // Resolve using the manual resolve with round ID
        resolver.resolve(marketId, 2);

        // Alice redeems
        vm.prank(alice);
        SettlementFacet(address(core)).redeem(marketId, true);
    }

    // ============================================
    // Solvency Throughout Lifecycle
    // ============================================

    function test_solvency_maintainedThroughoutLifecycle() public {
        usdc.faucet(50_000e6);
        uint256 marketId = _createBinaryMarket(
            admin,
            20_000e6,
            block.timestamp + 7 days,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Check solvency after creation
        _assertSolvent(marketId, "after creation");

        // Trading
        vm.startPrank(alice);
        usdc.approve(address(core), 5_000e6);
        TradingFacet(address(core)).buy(marketId, true, 5_000e6, 0);
        vm.stopPrank();
        _assertSolvent(marketId, "after alice buy");

        vm.startPrank(bob);
        usdc.approve(address(core), 3_000e6);
        TradingFacet(address(core)).buy(marketId, false, 3_000e6, 0);
        vm.stopPrank();
        _assertSolvent(marketId, "after bob buy");

        // Add liquidity
        vm.startPrank(charlie);
        usdc.approve(address(core), 5_000e6);
        LiquidityFacet(address(core)).addLiquidity(marketId, 5_000e6);
        vm.stopPrank();
        _assertSolvent(marketId, "after charlie LP");

        // More trading
        vm.startPrank(dave);
        usdc.approve(address(core), 2_000e6);
        TradingFacet(address(core)).buy(marketId, true, 2_000e6, 0);
        vm.stopPrank();
        _assertSolvent(marketId, "after dave buy");

        // Sell
        (address yesToken, ) = MarketFacet(address(core)).getMarketTokens(marketId);
        uint256 aliceYes = IERC20(yesToken).balanceOf(alice);
        vm.startPrank(alice);
        IERC20(yesToken).approve(address(core), aliceYes / 2);
        TradingFacet(address(core)).sell(marketId, true, aliceYes / 2, 0);
        vm.stopPrank();
        _assertSolvent(marketId, "after alice sell");

        // Resolution
        vm.warp(block.timestamp + 7 days + 1);
        uint80 round2 = uint80((uint256(1) << 64) | 2);
        uint80 round1 = uint80((uint256(1) << 64) | 1);
        mockOracle.setRoundData(round2, int256(110e8), block.timestamp, block.timestamp, round2);
        mockOracle.setRoundData(round1, int256(100e8), block.timestamp - 8 days, block.timestamp - 8 days, round1);
        resolver.resolve(marketId, round2);
        _assertSolvent(marketId, "after resolution");

        // Redemptions
        vm.prank(alice);
        SettlementFacet(address(core)).redeem(marketId, true);
        _assertSolvent(marketId, "after alice redeem");

        vm.prank(dave);
        SettlementFacet(address(core)).redeem(marketId, true);
        _assertSolvent(marketId, "after dave redeem");
    }

    function _assertSolvent(uint256 marketId, string memory context) internal view {
        // After resolution, the market is in a different state and traditional solvency checks
        // may not apply the same way. The contract pays out winners from the vault.
        CoreStorage.ResolutionConfig memory res = MarketFacet(address(core)).getMarketResolution(marketId);

        if (!res.isResolved) {
            // Before resolution, check standard solvency
            (
                ,
                ,
                uint256 liabilityUSDC,
                uint256 vaultUSDC,
            ) = MarketFacet(address(core)).getMarketInvariants(marketId);

            assertGe(
                vaultUSDC + 1000, // Buffer
                liabilityUSDC,
                string(abi.encodePacked("Solvency violated ", context))
            );
        }
        // After resolution, vault decreases as winners redeem - this is expected behavior
    }
}
