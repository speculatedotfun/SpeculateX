// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

/**
 * @title SetSpeculateCoreOnUSDC
 * @notice Set the SpeculateCore address on MockUSDC contract
 */
contract SetSpeculateCoreOnUSDC is Script {
    function run() external {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        if (bytes(privateKeyStr)[0] == bytes1("0") && bytes(privateKeyStr)[1] == bytes1("x")) {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            string memory keyWithPrefix = string.concat("0x", privateKeyStr);
            deployerPrivateKey = vm.parseUint(keyWithPrefix);
        }
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("\n=== SETTING SPECULATECORE ON USDC ===\n");
        console.log("Deployer address:", deployer);

        // Get USDC address
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e));
        console.log("USDC address:", usdcAddress);

        // Get Core address
        address coreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0x62E390c9251186E394cEF754FbB42b8391331d0F));
        console.log("SpeculateCore address:", coreAddress);

        MockUSDC usdc = MockUSDC(usdcAddress);
        
        // Set SpeculateCore address
        console.log("\n--- Setting SpeculateCore on USDC ---");
        usdc.setSpeculateCore(coreAddress);
        console.log("SUCCESS: SpeculateCore set on USDC");

        // Verify
        address currentCore = usdc.speculateCore();
        if (currentCore == coreAddress) {
            console.log("VERIFIED: SpeculateCore address matches");
        } else {
            console.log("ERROR: SpeculateCore address mismatch!");
            console.log("Expected:", coreAddress);
            console.log("Got:", currentCore);
        }

        vm.stopBroadcast();
    }
}

