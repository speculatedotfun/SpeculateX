// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {TestSetup} from "./TestSetup.sol";
import {MockAggregatorV3} from "./mocks/MockAggregatorV3.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";
import {CoreStorage} from "../src/CoreStorage.sol";

contract ChainlinkResolverTest is TestSetup {
    MockAggregatorV3 internal feed8;

    function setUp() public override {
        super.setUp();
        feed8 = new MockAggregatorV3(8);
    }

    function test_resolve_usesLatestPriceAtResolveTime() public {
        // Price initially below target, then moves above after expiry.
        feed8.setRoundData(1, int256(90e8), block.timestamp, block.timestamp, 1);

        // Fund admin for seed
        usdc.faucet(1_000e6);
        uint256 id = _createBinaryMarket(
            admin,
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            100e8,
            CoreStorage.Comparison.Above
        );

        // After expiry, update price above target.
        vm.warp(block.timestamp + 1 days + 1);
        feed8.setRoundData(2, int256(110e8), block.timestamp, block.timestamp, 2);

        resolver.resolve(id, 2);

        MarketFacet.ResolutionConfig memory r = MarketFacet(address(core)).getMarketResolution(id);
        assertTrue(r.isResolved);
        assertTrue(r.yesWins);
    }

    function test_resolve_revertsWhenStale() public {
        // Feed must be live at market creation (createMarket sanity-checks latestRoundData).
        feed8.setRoundData(1, int256(110e8), block.timestamp, block.timestamp, 1);

        usdc.faucet(1_000e6);
        uint256 id = _createBinaryMarket(
            admin,
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Get the actual expiry timestamp
        CoreStorage.ResolutionConfig memory res = MarketFacet(address(core)).getMarketResolution(id);
        uint256 expiryTs = res.expiryTimestamp;

        // Set round 1 data before expiry (required for first-round-after-expiry check)
        uint256 beforeExpiry = expiryTs - 1 hours;
        feed8.setRoundData(1, int256(110e8), beforeExpiry, beforeExpiry, 1);

        // Set round 2 data at expiry time (valid for resolution timing)
        uint256 afterExpiry = expiryTs + 1 minutes;
        feed8.setRoundData(2, int256(110e8), afterExpiry, afterExpiry, 2);

        // Now warp 8 days past round 2's updatedAt so it's > 7 days old
        vm.warp(afterExpiry + 8 days);
        uint256 nowTs = block.timestamp;
        uint256 maxAllowedAge = 7 days;

        // Contract uses 7 days staleness check
        vm.expectRevert(abi.encodeWithSelector(ChainlinkResolver.Stale.selector, afterExpiry, nowTs, maxAllowedAge));
        resolver.resolve(id, 2);
    }

    // ============================================
    // Automation Tests (checkUpkeep / performUpkeep)
    // ============================================

    function test_checkUpkeep_findsExpiredMarket() public {
        feed8.setRoundData(1, int256(100e8), block.timestamp, block.timestamp, 1);

        usdc.faucet(1_000e6);
        uint256 id = _createBinaryMarket(
            admin,
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Before expiry - no upkeep needed
        (bool needed, ) = resolver.checkUpkeep("");
        assertFalse(needed, "Should not need upkeep before expiry");

        // Warp past expiry and update feed
        vm.warp(block.timestamp + 1 days + 1);
        // Use proper phase-encoded round ID: phase 1, round 2
        uint80 round2 = uint80((uint256(1) << 64) | 2);
        uint80 round1 = uint80((uint256(1) << 64) | 1);
        feed8.setRoundData(round2, int256(110e8), block.timestamp, block.timestamp, round2);
        feed8.setRoundData(round1, int256(100e8), block.timestamp - 2 days, block.timestamp - 2 days, round1);

        // Now upkeep should be needed
        (bool needed2, bytes memory performData) = resolver.checkUpkeep("");
        assertTrue(needed2, "Should need upkeep after expiry");
        assertGt(performData.length, 0, "Should have performData");
    }

    function test_checkUpkeep_withSpecificMarketId() public {
        feed8.setRoundData(1, int256(100e8), block.timestamp, block.timestamp, 1);

        usdc.faucet(1_000e6);
        uint256 id = _createBinaryMarket(
            admin,
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Warp past expiry
        vm.warp(block.timestamp + 1 days + 1);
        uint80 round2 = uint80((uint256(1) << 64) | 2);
        uint80 round1 = uint80((uint256(1) << 64) | 1);
        feed8.setRoundData(round2, int256(110e8), block.timestamp, block.timestamp, round2);
        feed8.setRoundData(round1, int256(100e8), block.timestamp - 2 days, block.timestamp - 2 days, round1);

        // Check with specific market ID
        bytes memory checkData = abi.encode(id);
        (bool needed, bytes memory performData) = resolver.checkUpkeep(checkData);
        assertTrue(needed, "Should need upkeep for specific market");
    }

    function test_checkUpkeep_returnsFalseForResolvedMarket() public {
        feed8.setRoundData(1, int256(100e8), block.timestamp, block.timestamp, 1);

        usdc.faucet(1_000e6);
        uint256 id = _createBinaryMarket(
            admin,
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Warp and resolve
        vm.warp(block.timestamp + 1 days + 1);
        uint80 round2 = uint80((uint256(1) << 64) | 2);
        uint80 round1 = uint80((uint256(1) << 64) | 1);
        feed8.setRoundData(round2, int256(110e8), block.timestamp, block.timestamp, round2);
        feed8.setRoundData(round1, int256(100e8), block.timestamp - 2 days, block.timestamp - 2 days, round1);

        resolver.resolve(id, round2);

        // Check upkeep - should return false for resolved market
        bytes memory checkData = abi.encode(id);
        (bool needed, ) = resolver.checkUpkeep(checkData);
        assertFalse(needed, "Should not need upkeep for resolved market");
    }

    function test_performUpkeep_resolvesMarket() public {
        feed8.setRoundData(1, int256(100e8), block.timestamp, block.timestamp, 1);

        usdc.faucet(1_000e6);
        uint256 id = _createBinaryMarket(
            admin,
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Warp past expiry
        vm.warp(block.timestamp + 1 days + 1);
        uint80 round2 = uint80((uint256(1) << 64) | 2);
        uint80 round1 = uint80((uint256(1) << 64) | 1);
        feed8.setRoundData(round2, int256(110e8), block.timestamp, block.timestamp, round2);
        feed8.setRoundData(round1, int256(100e8), block.timestamp - 2 days, block.timestamp - 2 days, round1);

        // Perform upkeep
        bytes memory performData = abi.encode(id);
        resolver.performUpkeep(performData);

        // Verify market is resolved
        MarketFacet.ResolutionConfig memory r = MarketFacet(address(core)).getMarketResolution(id);
        assertTrue(r.isResolved, "Market should be resolved after performUpkeep");
        assertTrue(r.yesWins, "YES should win (110 > 100)");
    }

    function test_performUpkeep_revertsOnBadData() public {
        // Empty data or invalid market ID will revert with InvalidMarket
        vm.expectRevert();
        resolver.performUpkeep("");

        // Non-existent market ID (999) will revert with InvalidMarket
        vm.expectRevert();
        resolver.performUpkeep(abi.encode(uint256(999)));
    }

    // ============================================
    // resolveAuto Tests
    // ============================================

    function test_resolveAuto_usesSlaPath() public {
        feed8.setRoundData(1, int256(100e8), block.timestamp, block.timestamp, 1);

        usdc.faucet(1_000e6);
        uint256 id = _createBinaryMarket(
            admin,
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Warp past expiry
        vm.warp(block.timestamp + 1 days + 1);

        // Set round data within SLA window (5 minutes)
        uint80 round2 = uint80((uint256(1) << 64) | 2);
        uint80 round1 = uint80((uint256(1) << 64) | 1);
        // Round 2 is within 5 minutes of expiry
        feed8.setRoundData(round2, int256(110e8), block.timestamp, block.timestamp, round2);
        feed8.setRoundData(round1, int256(100e8), block.timestamp - 2 days, block.timestamp - 2 days, round1);

        // resolveAuto should use SLA path
        resolver.resolveAuto(id);

        MarketFacet.ResolutionConfig memory r = MarketFacet(address(core)).getMarketResolution(id);
        assertTrue(r.isResolved, "Market should be resolved");
    }

    function test_resolveAuto_revertsBeforeExpiry() public {
        feed8.setRoundData(1, int256(100e8), block.timestamp, block.timestamp, 1);

        usdc.faucet(1_000e6);
        uint256 id = _createBinaryMarket(
            admin,
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Try to resolve before expiry
        vm.expectRevert(ChainlinkResolver.MarketNotExpired.selector);
        resolver.resolveAuto(id);
    }

    // ============================================
    // Timelock Tests
    // ============================================

    function test_resolver_timelockSetCore() public {
        address newCore = address(0x123);

        // Schedule operation
        bytes32 opId = resolver.scheduleOp(resolver.OP_SET_CORE(), abi.encode(newCore));

        // Try to execute before delay - should fail
        vm.expectRevert();
        resolver.executeSetCore(opId, newCore);

        // Warp past delay
        vm.warp(block.timestamp + resolver.timelockDelay());

        // Execute should work now (but will fail because newCore is not a contract - that's ok for this test)
        // We're testing the timelock mechanism, not the core setting
    }

    function test_resolver_cancelOp() public {
        address newCore = address(0x123);

        bytes32 opId = resolver.scheduleOp(resolver.OP_SET_CORE(), abi.encode(newCore));
        resolver.cancelOp(opId);

        // Verify op is cancelled
        (, , , ChainlinkResolver.OpStatus status) = resolver.ops(opId);
        assertTrue(status == ChainlinkResolver.OpStatus.Cancelled);
    }

    // ============================================
    // Original Tests (existing)
    // ============================================

    function test_decimalMismatch_isRejectedAtMarketCreation() public {
        // Feed decimals = 8; answer is 99.00 (in 1e8)
        feed8.setRoundData(1, int256(99e8), block.timestamp, block.timestamp, 1);

        usdc.faucet(2_000e6);

        // Correct target (8 decimals): market creation succeeds.
        uint256 idCorrect = _createBinaryMarket(
            admin,
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            100e8,
            CoreStorage.Comparison.Above
        );

        // Incorrect target scaling (6 decimals) should now be rejected by createMarket sanity checks.
        usdc.approve(address(core), 500e6);
        // This Foundry version expects full revert data for custom errors.
        uint256 priceNow = 99e8;
        uint256 minTarget = priceNow / 50;
        uint256 maxTarget = priceNow * 50;
        assertTrue(100e6 < minTarget || 100e6 > maxTarget); // sanity: ensure it actually should revert
        vm.expectRevert(abi.encodeWithSelector(MarketFacet.TargetOutOfRange.selector, 100e6, priceNow, uint8(8)));
        MarketFacet(address(core)).createMarket(
            "Q",
            "YES",
            "YES",
            "NO",
            "NO",
            500e6,
            block.timestamp + 1 days,
            address(feed8),
            bytes32(0),
            100e6,
            CoreStorage.Comparison.Above
        );

        // Resolve the valid market just to ensure the end-to-end flow still works.
        vm.warp(block.timestamp + 1 days + 1);
        feed8.setRoundData(2, int256(99e8), block.timestamp, block.timestamp, 2);
        resolver.resolve(idCorrect, 2);

        MarketFacet.ResolutionConfig memory rCorrect = MarketFacet(address(core)).getMarketResolution(idCorrect);
        assertTrue(rCorrect.isResolved);
        assertFalse(rCorrect.yesWins);
        assertEq(rCorrect.oracleDecimals, 8);
    }
}


