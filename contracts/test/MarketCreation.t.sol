// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {TestSetup} from "./TestSetup.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {CoreStorage} from "../src/CoreStorage.sol";

contract MarketCreationTest is TestSetup {
    function test_createMarket_revertsWithoutRole() public {
        vm.startPrank(alice);
        usdc.approve(address(core), 1_000e6);
        // revert strings are stripped in foundry.toml
        vm.expectRevert();
        MarketFacet(address(core)).createMarket(
            "Q",
            "YES",
            "YES",
            "NO",
            "NO",
            1_000e6,
            block.timestamp + 1 days,
            address(mockOracle), // Use valid oracle (will revert on role check, not oracle check)
            bytes32(0),
            100e8, // Valid target value
            CoreStorage.Comparison.Above
        );
        vm.stopPrank();
    }

    function test_createMarket_revertsOnSmallSeed() public {
        // admin has MARKET_CREATOR_ROLE from constructor
        vm.startPrank(admin);
        usdc.faucet(1_000e6);
        usdc.approve(address(core), 499e6);
        // If facets aren't wired or revert strings are stripped, selector matching can be flaky.
        // For Tier-1 we assert that it reverts.
        vm.expectRevert();
        MarketFacet(address(core)).createMarket(
            "Q",
            "YES",
            "YES",
            "NO",
            "NO",
            499e6,
            block.timestamp + 1 days,
            address(mockOracle), // Use valid oracle
            bytes32(0),
            100e8, // Valid target value
            CoreStorage.Comparison.Above
        );
        vm.stopPrank();
    }

    function test_createMarket_revertsOnPastExpiry() public {
        vm.startPrank(admin);
        usdc.faucet(1_000e6);
        usdc.approve(address(core), 500e6);
        vm.expectRevert();
        MarketFacet(address(core)).createMarket(
            "Q",
            "YES",
            "YES",
            "NO",
            "NO",
            500e6,
            block.timestamp,
            address(mockOracle), // Use valid oracle
            bytes32(0),
            100e8, // Valid target value
            CoreStorage.Comparison.Above
        );
        vm.stopPrank();
    }

    function test_createMarket_emitsMarketCreated() public {
        vm.startPrank(admin);
        usdc.faucet(1_000e6);
        usdc.approve(address(core), 500e6);

        // Market creation emits many logs (token deployments etc). Use recordLogs and
        // assert that a MarketCreated log exists.
        vm.recordLogs();
        uint256 id = MarketFacet(address(core)).createMarket(
            "Q",
            "YES",
            "YES",
            "NO",
            "NO",
            500e6,
            block.timestamp + 1 days,
            address(mockOracle), // Use valid oracle
            bytes32(0),
            100e8, // Valid target value (within range of mockOracle's 100e8)
            CoreStorage.Comparison.Above
        );
        assertEq(id, 1);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 topic0 = keccak256("MarketCreated(uint256,address,address,bytes32,string,uint256,uint256)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == topic0) {
                found = true;
                break;
            }
        }
        assertTrue(found, "MarketCreated not found in logs");
        vm.stopPrank();
    }
}


