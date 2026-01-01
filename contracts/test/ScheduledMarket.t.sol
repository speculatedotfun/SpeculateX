// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {TestSetup} from "./TestSetup.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {LiquidityFacet} from "../src/facets/LiquidityFacet.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {CoreStorage} from "../src/CoreStorage.sol";

contract ScheduledMarketTest is TestSetup {

    function test_scheduledMarket_blocksTradeBeforeStart() public {
        usdc.faucet(20_000e6);

        uint256 startTime = block.timestamp + 1 days;
        uint256 expiryTime = block.timestamp + 7 days;

        uint256 id = _createScheduledMarket(
            admin,
            10_000e6,
            startTime,
            expiryTime,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Verify startTime is set
        CoreStorage.ResolutionConfig memory res = MarketFacet(address(core)).getMarketResolution(id);
        assertEq(res.startTime, startTime);

        // Try to buy before market starts - should revert
        vm.startPrank(alice);
        usdc.approve(address(core), 100e6);
        vm.expectRevert(TradingFacet.MarketNotStarted.selector);
        TradingFacet(address(core)).buy(id, true, 100e6, 0);
        vm.stopPrank();
    }

    function test_scheduledMarket_allowsTradeAfterStart() public {
        usdc.faucet(20_000e6);

        uint256 startTime = block.timestamp + 1 days;
        uint256 expiryTime = block.timestamp + 7 days;

        uint256 id = _createScheduledMarket(
            admin,
            10_000e6,
            startTime,
            expiryTime,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Warp to after start time
        vm.warp(startTime + 1);

        // Update oracle to be fresh
        mockOracle.setRoundData(1, int256(100e8), block.timestamp, block.timestamp, 1);

        // Now trading should work
        vm.startPrank(alice);
        usdc.approve(address(core), 100e6);
        TradingFacet(address(core)).buy(id, true, 100e6, 0);
        vm.stopPrank();
    }

    function test_scheduledMarket_blocksSellBeforeStart() public {
        usdc.faucet(20_000e6);

        uint256 startTime = block.timestamp + 1 days;
        uint256 expiryTime = block.timestamp + 7 days;

        uint256 id = _createScheduledMarket(
            admin,
            10_000e6,
            startTime,
            expiryTime,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Try to sell before market starts - should revert
        vm.startPrank(alice);
        vm.expectRevert(TradingFacet.MarketNotStarted.selector);
        TradingFacet(address(core)).sell(id, true, 1e18, 0);
        vm.stopPrank();
    }

    function test_scheduledMarket_allowsAddLiquidityBeforeStart() public {
        usdc.faucet(20_000e6);

        uint256 startTime = block.timestamp + 1 days;
        uint256 expiryTime = block.timestamp + 7 days;

        uint256 id = _createScheduledMarket(
            admin,
            10_000e6,
            startTime,
            expiryTime,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Adding liquidity before market starts should work
        vm.startPrank(alice);
        usdc.approve(address(core), 1000e6);
        LiquidityFacet(address(core)).addLiquidity(id, 1000e6);
        vm.stopPrank();
    }

    function test_scheduledMarket_blocksRemoveLiquidityBeforeStart() public {
        usdc.faucet(20_000e6);

        uint256 startTime = block.timestamp + 1 days;
        uint256 expiryTime = block.timestamp + 7 days;

        uint256 id = _createScheduledMarket(
            admin,
            10_000e6,
            startTime,
            expiryTime,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Wait for cooldown (H-01)
        vm.roll(block.number + 2);

        // Try to remove liquidity before market starts - should revert
        vm.expectRevert(LiquidityFacet.MarketNotStarted.selector);
        LiquidityFacet(address(core)).removeLiquidity(id, 1000e6);
    }

    function test_scheduledMarket_immediateStartWithZero() public {
        usdc.faucet(20_000e6);

        uint256 expiryTime = block.timestamp + 7 days;

        // Create market with startTime = 0 (immediate)
        uint256 id = _createScheduledMarket(
            admin,
            10_000e6,
            0, // immediate start
            expiryTime,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Verify startTime is 0
        CoreStorage.ResolutionConfig memory res = MarketFacet(address(core)).getMarketResolution(id);
        assertEq(res.startTime, 0);

        // Trading should work immediately
        vm.startPrank(alice);
        usdc.approve(address(core), 100e6);
        TradingFacet(address(core)).buy(id, true, 100e6, 0);
        vm.stopPrank();
    }

    function test_scheduledMarket_revertsInvalidStartTime() public {
        usdc.faucet(20_000e6);

        uint256 expiryTime = block.timestamp + 7 days;

        // Try to create market with startTime >= expiryTime - should revert
        vm.startPrank(admin);
        usdc.approve(address(core), 10_000e6);
        vm.expectRevert(MarketFacet.InvalidStartTime.selector);
        MarketFacet(address(core)).createScheduledMarket(
            "Test",
            "YES",
            "YES",
            "NO",
            "NO",
            10_000e6,
            expiryTime + 1, // startTime after expiry
            expiryTime,
            address(mockOracle),
            bytes32(0),
            100e8,
            CoreStorage.Comparison.Above
        );
        vm.stopPrank();
    }

    function test_scheduledMarket_revertsInsufficientDuration() public {
        usdc.faucet(20_000e6);

        uint256 startTime = block.timestamp + 1 days;
        uint256 expiryTime = startTime + 30 minutes; // Less than MIN_MARKET_DURATION (1 hour)

        // Try to create market with less than MIN_MARKET_DURATION between start and expiry
        vm.startPrank(admin);
        usdc.approve(address(core), 10_000e6);
        vm.expectRevert(MarketFacet.InvalidStartTime.selector);
        MarketFacet(address(core)).createScheduledMarket(
            "Test",
            "YES",
            "YES",
            "NO",
            "NO",
            10_000e6,
            startTime,
            expiryTime, // Only 30 min trading window
            address(mockOracle),
            bytes32(0),
            100e8,
            CoreStorage.Comparison.Above
        );
        vm.stopPrank();
    }
}
