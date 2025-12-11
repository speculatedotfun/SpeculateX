// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpeculateCore} from "../src/SpeculateCore.sol";

contract CheckMarketCount is Script {
    function run() external view {
        address coreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0x3D87bBADD7E465f7aE0Ce1F8747Db7fc76EeEBB8));
        SpeculateCore core = SpeculateCore(coreAddress);
        
        uint256 marketCount = core.marketCount();
        console.log("=== Market Count Check ===");
        console.log("Core Address:", coreAddress);
        console.log("Total Markets:", marketCount);
        
        if (marketCount == 0) {
            console.log("\nNo markets exist yet!");
            console.log("You need to create a market first.");
        } else {
            console.log("\nMarkets exist, checking if market ID 1 exists...");
            // Try to access market 1
            try core.markets(1) returns (address yes, address no, uint256 qYes, uint256 qNo, uint256 bE18, uint256 usdcVault) {
                if (yes != address(0)) {
                    console.log("Market 1 EXISTS");
                    console.log("Yes token:", yes);
                    console.log("No token:", no);
                } else {
                    console.log("Market 1 does NOT exist (yes token is zero address)");
                }
            } catch {
                console.log("Error accessing market 1");
            }
        }
    }
}

