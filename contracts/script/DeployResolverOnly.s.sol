// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";

/**
 * @title DeployResolverOnly
 * @notice Deploys only the updated ChainlinkResolver with deterministic resolution
 * @dev This script:
 * 1. Reads existing Core Router address from env or uses provided address
 * 2. Deploys new ChainlinkResolver
 * 3. Schedules and executes (if timelock=0) the resolver update on Core Router
 */
contract DeployResolverOnly is Script {
    function run() public {
        string memory pkStr = vm.envString("PRIVATE_KEY");
        uint256 pk;
        if (bytes(pkStr).length >= 2 && bytes(pkStr)[0] == "0" && bytes(pkStr)[1] == "x") {
            pk = vm.parseUint(pkStr);
        } else {
            pk = vm.parseUint(string.concat("0x", pkStr));
        }
        address admin = vm.addr(pk);

        // Read existing Core Router address
        // Default Testnet Core Router: 0x601c5DA28dacc049481eD853E5b59b9F20Dd44a8
        address coreAddress;
        try vm.envAddress("CORE_ROUTER_ADDRESS") returns (address addr) {
            coreAddress = addr;
        } catch {
            // Use default Testnet address if not set in env
            coreAddress = 0x601c5DA28dacc049481eD853E5b59b9F20Dd44a8;
            console.log("Using default Testnet Core Router address");
        }

        if (coreAddress == address(0)) {
            revert("CORE_ROUTER_ADDRESS cannot be zero");
        }

        SpeculateCoreRouter core = SpeculateCoreRouter(payable(coreAddress));

        vm.startBroadcast(pk);

        console.log("Deploying new ChainlinkResolver...");
        console.log("Existing Core Router:", address(core));
        
        ChainlinkResolver newResolver = new ChainlinkResolver(admin, address(core));
        console.log("New Resolver:", address(newResolver));

        console.log("\nUpdating Core Router to use new resolver...");
        
        bytes32 OP_SET_RESOLVER = keccak256("OP_SET_RESOLVER");
        bytes32 opId = core.scheduleOp(OP_SET_RESOLVER, abi.encode(address(newResolver)));
        console.log("OP_SET_RESOLVER scheduled:", vm.toString(opId));

        // If timelock is 0 (testnet), execute immediately
        if (core.minTimelockDelay() == 0) {
            console.log("\nTimelock is 0: executing immediately...");
            core.executeSetResolver(opId, address(newResolver));
            console.log("Resolver updated successfully!");
        } else {
            console.log("\nTimelock is active. Wait", core.minTimelockDelay(), "seconds then execute:");
            console.log("forge script script/ExecuteAfterDelay.s.sol:ExecuteAfterDelay --rpc-url bsc_testnet --broadcast --legacy --gas-price 1000000000");
        }

        vm.stopBroadcast();

        console.log("\n=== RESOLVER DEPLOYMENT COMPLETE ===");
        console.log("New Resolver Address:", address(newResolver));
        if (core.minTimelockDelay() == 0) {
            console.log("Resolver is now active on Core Router");
        } else {
            console.log("Wait for timelock then execute the scheduled operation");
        }
    }
}

