// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";

contract CheckResolver is Script {
    function run() public view {
        address coreAddress = vm.envAddress("CORE_ADDRESS");
        
        console.log("=== CHECKING RESOLVER CONNECTION ===");
        console.log("Core Address:", coreAddress);
        console.log("ChainId:", block.chainid);
        console.log("");
        
        SpeculateCoreRouter core = SpeculateCoreRouter(payable(coreAddress));
        
        address currentResolver = core.chainlinkResolver();
        console.log("Current Resolver in Core:", currentResolver);
        console.log("");
        
        address expectedResolver = vm.envOr("EXPECTED_RESOLVER", address(0));
        if (expectedResolver != address(0)) {
            console.log("Expected Resolver:", expectedResolver);
            console.log("");
            if (currentResolver == expectedResolver) {
                console.log("RESOLVER IS CONNECTED!");
            } else {
                console.log("Resolver NOT connected. Need to update.");
            }
        }
    }
}

