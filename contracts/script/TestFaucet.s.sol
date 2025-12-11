// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpeculateCore} from "../src/SpeculateCore.sol";

contract TestFaucet is Script {
    function run() external {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        bytes memory pkBytes = bytes(privateKeyStr);
        if (pkBytes.length >= 2 && pkBytes[0] == bytes1("0") && pkBytes[1] == bytes1("x")) {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyStr));
        }
        
        address coreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0x3D87bBADD7E465f7aE0Ce1F8747Db7fc76EeEBB8));
        SpeculateCore core = SpeculateCore(coreAddress);
        
        console.log("=== Testing Faucet Function ===");
        console.log("Core Address:", coreAddress);
        console.log("Caller:", vm.addr(deployerPrivateKey));
        
        // Check admin role
        bytes32 DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;
        bool hasRole = core.hasRole(DEFAULT_ADMIN_ROLE, vm.addr(deployerPrivateKey));
        console.log("Has admin role?", hasRole);
        
        if (!hasRole) {
            console.log("ERROR: Not an admin!");
            return;
        }
        
        // Try to call faucet
        uint256 amount = 1000e6; // 1000 USDC
        console.log("\nCalling faucet with amount:", amount / 1e6, "USDC");
        
        vm.startBroadcast(deployerPrivateKey);
        try core.faucet(amount) {
            console.log("SUCCESS: Faucet called successfully!");
        } catch Error(string memory reason) {
            console.log("ERROR (revert with reason):", reason);
        } catch (bytes memory lowLevelData) {
            console.log("ERROR (low-level):");
            console.logBytes(lowLevelData);
        }
        vm.stopBroadcast();
    }
}

