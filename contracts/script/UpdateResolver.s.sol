// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";

contract UpdateResolver is Script {
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
        
        // Get addresses
        address core = vm.envAddress("CORE_ADDRESS");
        address newResolver = vm.envAddress("NEW_RESOLVER_ADDRESS");
        require(core != address(0), "CORE_ADDRESS required");
        require(newResolver != address(0), "NEW_RESOLVER_ADDRESS required");

        vm.startBroadcast(pk);

        console.log("=== UPDATE RESOLVER ===");
        console.log("Core:", core);
        console.log("New Resolver:", newResolver);
        console.log("ChainId:", block.chainid);
        console.log("");

        SpeculateCoreRouter coreContract = SpeculateCoreRouter(payable(core));
        
        // Check current resolver
        address currentResolver = coreContract.chainlinkResolver();
        console.log("Current Resolver:", currentResolver);
        console.log("");

        // Check timelock delay
        uint256 delay = coreContract.minTimelockDelay();
        console.log("Timelock Delay:", delay);
        console.log("Delay in hours:", delay / 3600);
        console.log("");

        bytes32 OP_SET_RESOLVER = keccak256("OP_SET_RESOLVER");
        
        // Schedule the operation
        bytes32 opId = coreContract.scheduleOp(OP_SET_RESOLVER, abi.encode(newResolver));
        console.log("Operation ID:");
        console.logBytes32(opId);
        console.log("");

        // Execute immediately if no timelock
        if (delay == 0) {
            console.log("Executing immediately (timelock=0)...");
            coreContract.executeSetResolver(opId, newResolver);
            console.log("Resolver updated!");
            
            // Verify
            address updatedResolver = coreContract.chainlinkResolver();
            console.log("Updated Resolver:", updatedResolver);
            require(updatedResolver == newResolver, "Resolver update failed");
        } else {
            console.log("Operation scheduled. Execute after timelock delay.");
            console.log("Execute with:");
            console.log("  core.executeSetResolver(opId, newResolver)");
        }

        vm.stopBroadcast();
    }
}

