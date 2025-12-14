// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpeculateCore} from "../src/SpeculateCore.sol";

contract CheckAdminRole is Script {
    function run() external view {
        address coreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0x3D87bBADD7E465f7aE0Ce1F8747Db7fc76EeEBB8));
        address userAddress = vm.envOr("USER_ADDRESS", address(0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F));
        
        SpeculateCore core = SpeculateCore(coreAddress);
        bytes32 DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;
        
        console.log("=== Checking Admin Role ===");
        console.log("Core Address:", coreAddress);
        console.log("User Address:", userAddress);
        
        bool hasRole = core.hasRole(DEFAULT_ADMIN_ROLE, userAddress);
        console.log("Has admin role?", hasRole);
        
        if (!hasRole) {
            console.log("\nERROR: User does NOT have admin role!");
            console.log("You need to grant admin role to this address.");
        } else {
            console.log("\nSUCCESS: User has admin role!");
        }
    }
}


