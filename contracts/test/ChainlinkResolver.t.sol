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

        // Expire market
        vm.warp(block.timestamp + 1 days + 5 hours);
        uint256 nowTs = block.timestamp;
        uint256 updatedAt = nowTs - 4 hours; // 1 hour after expiry (so it's valid for resolution timing)
        // expiry was at +24h. now is +29h. updatedAt is +25h.
        
        feed8.setRoundData(2, int256(110e8), updatedAt, updatedAt, 2);

        // This Foundry version expects full revert data for custom errors.
        vm.expectRevert(abi.encodeWithSelector(ChainlinkResolver.Stale.selector, updatedAt, nowTs, 2 hours));
        resolver.resolve(id, 2);
    }

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


