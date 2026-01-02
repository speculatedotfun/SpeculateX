// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";

/// @notice Test script to check why market creation might be failing
/// Usage: forge script script/TestMarketCreation.s.sol:TestMarketCreation --rpc-url bsc_testnet
contract TestMarketCreation is Script {
    address constant CORE = 0x57EB390222D1Dd4517070735C24A899d6D41b759;
    address constant ADMIN = 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c;
    address constant TEST_USER = 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c; // Same as admin for test

    function run() external view {
        SpeculateCoreRouter core = SpeculateCoreRouter(payable(CORE));
        
        console2.log("=== Market Creation Diagnostics ===\n");
        
        // Note: paused() is not public, but we can check via a call that would fail if paused
        // For now, we'll skip this check and focus on other issues
        // Check roles
        bytes32 marketCreatorRole = core.MARKET_CREATOR_ROLE();
        bytes32 adminRole = core.DEFAULT_ADMIN_ROLE();
        
        bool hasCreatorRole = core.hasRole(marketCreatorRole, TEST_USER);
        bool hasAdminRole = core.hasRole(adminRole, TEST_USER);
        
        console2.log("User:", TEST_USER);
        console2.log("Has MARKET_CREATOR_ROLE:", hasCreatorRole);
        console2.log("Has DEFAULT_ADMIN_ROLE:", hasAdminRole);
        console2.log("");
        
        // Check minimum seed
        uint256 minSeed = core.minMarketSeed();
        console2.log("Minimum market seed (USDC):", minSeed);
        console2.log("Minimum market seed (human):", minSeed / 1e6, "USDC");
        console2.log("");
        
        // Check resolver
        address resolver = core.chainlinkResolver();
        console2.log("Chainlink Resolver:", resolver);
        console2.log("");
        
        // Check USDC address
        address usdc = core.usdc();
        console2.log("USDC Token:", usdc);
        console2.log("");
        
        // Check treasury
        address treasury = core.treasury();
        console2.log("Treasury:", treasury);
        console2.log("");
        
        // Check if createMarket selector is connected
        bytes4 createMarketSelector = bytes4(keccak256("createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)"));
        address facet = core.facetOf(createMarketSelector);
        console2.log("createMarket facet:", facet);
        console2.log("Facet connected:", facet != address(0) ? "YES" : "NO");
        console2.log("");
        
        // Summary
        console2.log("=== DIAGNOSTIC SUMMARY ===");
        if (!hasCreatorRole && !hasAdminRole) {
            console2.log("ERROR: User does NOT have MARKET_CREATOR_ROLE - market creation will fail!");
        } else {
            console2.log("OK: User has required role");
        }
        if (facet == address(0)) {
            console2.log("ERROR: createMarket facet NOT connected - market creation will fail!");
        } else {
            console2.log("OK: createMarket facet is connected");
        }
        if (resolver == address(0)) {
            console2.log("WARNING: Resolver not set - market creation may fail!");
        } else {
            console2.log("OK: Resolver is set");
        }
    }
}

