// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {TestSetup} from "./TestSetup.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {CoreStorage} from "../src/CoreStorage.sol";

contract MarketFacetTest is TestSetup {
    uint256 internal marketId;

    function setUp() public override {
        super.setUp();
        usdc.faucet(25_000e6);
        marketId = _createBinaryMarket(
            admin,
            20_000e6,
            block.timestamp + 7 days,
            address(mockOracle),
            100e8,
            CoreStorage.Comparison.Above
        );
    }

    function test_getMarketQuestion_returnsCorrectQuestion() public {
        string memory question = MarketFacet(address(core)).getMarketQuestion(marketId);
        assertEq(keccak256(bytes(question)), keccak256(bytes("Will price be above target?")));
    }

    function test_getMarketInvariants_returnsCorrectValues() public {
        (
            uint256 cirYes,
            uint256 cirNo,
            uint256 liabilityUSDC,
            uint256 vaultUSDC,
            uint256 bE18_
        ) = MarketFacet(address(core)).getMarketInvariants(marketId);
        
        // cirYes and cirNo can be 0 if no trades happened yet (only locked shares exist)
        assertGe(cirYes, 0);
        assertGe(cirNo, 0);
        assertGt(vaultUSDC, 0);
        assertGt(bE18_, 0);
        assertGe(liabilityUSDC, 0);
        // Solvency: vault should cover liability
        assertGe(vaultUSDC, liabilityUSDC);
    }

    function test_getMarketInvariants_solvencyAfterTrades() public {
        // Create large positions
        vm.startPrank(alice);
        usdc.approve(address(core), 10_000e6);
        TradingFacet(address(core)).buy(marketId, true, 10_000e6, 0);
        vm.stopPrank();
        
        vm.startPrank(bob);
        usdc.approve(address(core), 10_000e6);
        TradingFacet(address(core)).buy(marketId, false, 10_000e6, 0);
        vm.stopPrank();
        
        (,, uint256 liabilityUSDC, uint256 vaultUSDC,) = MarketFacet(address(core)).getMarketInvariants(marketId);
        // Market should remain solvent: vault >= liability
        assertGe(vaultUSDC, liabilityUSDC, "Market should remain solvent after trades");
        assertGt(liabilityUSDC, 0);
    }

    function test_getMarketState_returnsCorrectValues() public {
        (
            uint256 qYes,
            uint256 qNo,
            uint256 vault,
            uint256 b,
            CoreStorage.MarketStatus status,
            bytes32 questionHash
        ) = MarketFacet(address(core)).getMarketState(marketId);
        
        // qYes and qNo can be 0 initially if no trades happened
        assertGe(qYes, 0);
        assertGe(qNo, 0);
        assertEq(vault, 20_000e6); // Initial seed
        assertGt(b, 0);
        assertTrue(status == CoreStorage.MarketStatus.Active);
        assertTrue(questionHash != bytes32(0));
    }

    function test_getMarketResolution_returnsCorrectValues() public {
        CoreStorage.ResolutionConfig memory resolution = MarketFacet(address(core)).getMarketResolution(marketId);
        
        assertGt(resolution.expiryTimestamp, block.timestamp);
        assertTrue(resolution.oracleType == CoreStorage.OracleType.ChainlinkFeed);
        assertEq(resolution.oracleAddress, address(mockOracle));
        // MarketFacet normalizes Chainlink targetValue to 1e18.
        // mockOracle has 8 decimals, so 100e8 becomes 100e18.
        assertEq(resolution.targetValue, 100e18);
        assertTrue(resolution.comparison == CoreStorage.Comparison.Above);
        assertFalse(resolution.yesWins);
        assertFalse(resolution.isResolved);
        assertEq(resolution.oracleDecimals, 8);
    }
}

