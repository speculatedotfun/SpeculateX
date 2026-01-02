// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";

contract DeployResolver is Script {
    function run() public {
        // Support both PRIVATE_KEY_MAIN (preferred) and PRIVATE_KEY (legacy)
        string memory pkStr;
        try vm.envString("PRIVATE_KEY_MAIN") returns (string memory s) {
            pkStr = s;
        } catch {
            pkStr = vm.envString("PRIVATE_KEY");
        }
        uint256 pk;
        if (bytes(pkStr).length >= 2 && bytes(pkStr)[0] == "0" && bytes(pkStr)[1] == "x") {
            pk = vm.parseUint(pkStr);
        } else {
            pk = vm.parseUint(string.concat("0x", pkStr));
        }
        address deployer = vm.addr(pk);
        
        // Get admin address (defaults to deployer)
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);
        
        // Get core address (required)
        address core = vm.envAddress("CORE_ADDRESS");
        require(core != address(0), "CORE_ADDRESS required");

        vm.startBroadcast(pk);

        console.log("=== CHAINLINK RESOLVER DEPLOYMENT ===");
        console.log("Deployer:", deployer);
        console.log("Admin:", admin);
        console.log("Core:", core);
        console.log("ChainId:", block.chainid);
        console.log("");

        // Deploy ChainlinkResolver
        ChainlinkResolver resolver = new ChainlinkResolver(admin, core);
        
        console.log("ChainlinkResolver deployed at:", address(resolver));
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("Resolver:", address(resolver));
        console.log("Core:", core);
        console.log("Admin:", admin);

        vm.stopBroadcast();
    }
}

