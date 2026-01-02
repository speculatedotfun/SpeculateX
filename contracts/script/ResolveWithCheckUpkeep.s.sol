// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";

contract ResolveWithCheckUpkeep is Script {
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
        address resolver = vm.envAddress("RESOLVER_ADDRESS");
        uint256 marketId = vm.envOr("MARKET_ID", uint256(2));
        bool execute = vm.envOr("EXECUTE", false);

        vm.startBroadcast(pk);

        console.log("=== RESOLVE MARKET WITH CHECKUPKEEP ===");
        console.log("Resolver:", resolver);
        console.log("Market ID:", marketId);
        console.log("Execute:", execute);
        console.log("ChainId:", block.chainid);
        console.log("");

        ChainlinkResolver resolverContract = ChainlinkResolver(resolver);
        
        // Encode marketId as checkData
        bytes memory checkData = abi.encode(marketId);
        
        console.log("Calling checkUpkeep...");
        (bool upkeepNeeded, bytes memory performData) = resolverContract.checkUpkeep(checkData);
        
        console.log("Upkeep Needed:", upkeepNeeded);
        console.log("");
        
        if (!upkeepNeeded) {
            console.log("Upkeep not needed. Possible reasons:");
            console.log("  - Market not expired yet");
            console.log("  - Market already resolved");
            console.log("  - No valid round found after expiry");
            console.log("  - Round is stale");
            console.log("  - Previous round verification failed");
            vm.stopBroadcast();
            return;
        }
        
        console.log("Upkeep needed! Decoding performData...");
        console.log("PerformData (hex):");
        console.logBytes(performData);
        console.log("");
        
        // Decode performData: (marketId, roundId)
        (uint256 decodedMarketId, uint80 roundId) = abi.decode(performData, (uint256, uint80));
        
        console.log("Decoded Market ID:", decodedMarketId);
        console.log("Decoded Round ID:", uint256(roundId));
        console.log("Round ID (hex):");
        console.logBytes32(bytes32(uint256(roundId)));
        console.log("");
        
        if (execute) {
            console.log("Executing performUpkeep...");
            resolverContract.performUpkeep(performData);
            console.log("Market resolved successfully!");
        } else {
            console.log("Not executing. To execute, set EXECUTE=true");
            console.log("");
            console.log("To resolve manually, call:");
            console.log("  resolver.performUpkeep(performData)");
            console.log("");
            console.log("Or call resolve directly:");
            console.log("  resolver.resolve(marketId, roundId)");
            console.log("Market ID:", decodedMarketId);
            console.log("Round ID:", uint256(roundId));
        }

        vm.stopBroadcast();
    }
}

