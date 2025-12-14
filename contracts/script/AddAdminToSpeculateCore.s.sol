// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpeculateCore} from "../src/SpeculateCore.sol";

/**
 * @notice Script to grant admin role to an address on SpeculateCore
 * @dev Uses AccessControl grantRole function
 */
contract AddAdminToSpeculateCore is Script {
    function run() external {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        bytes memory pkBytes = bytes(privateKeyStr);
        if (pkBytes.length >= 2 && pkBytes[0] == bytes1("0") && pkBytes[1] == bytes1("x")) {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyStr));
        }
        
        address coreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0));
        require(coreAddress != address(0), "SPECULATE_CORE_ADDRESS not set");
        
        address newAdmin = vm.envOr("NEW_ADMIN_ADDRESS", address(0));
        require(newAdmin != address(0), "NEW_ADMIN_ADDRESS not set");
        
        SpeculateCore core = SpeculateCore(coreAddress);
        bytes32 DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;
        
        console.log("=== Adding Admin to SpeculateCore ===");
        console.log("Core Address:", address(core));
        console.log("New Admin Address:", newAdmin);
        console.log("Checking current role...");
        
        bool hasRole = core.hasRole(DEFAULT_ADMIN_ROLE, newAdmin);
        console.log("Already has admin role?", hasRole);
        
        if (hasRole) {
            console.log("Address already has admin role!");
            return;
        }
        
        vm.startBroadcast(deployerPrivateKey);
        core.grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        vm.stopBroadcast();
        
        console.log("Admin role granted successfully!");
    }
}


