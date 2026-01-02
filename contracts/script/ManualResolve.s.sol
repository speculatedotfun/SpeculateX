// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";

contract ManualResolve is Script {
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
        uint80 roundId = uint80(vm.envOr("ROUND_ID", uint256(36893488147419151877)));

        vm.startBroadcast(pk);

        console.log("=== MANUAL RESOLVE ===");
        console.log("Resolver:", resolver);
        console.log("Market ID:", marketId);
        console.log("Round ID:", uint256(roundId));
        console.log("ChainId:", block.chainid);
        console.log("");

        ChainlinkResolver resolverContract = ChainlinkResolver(resolver);
        
        console.log("Calling resolve...");
        resolverContract.resolve(marketId, roundId);
        console.log("Market resolved successfully!");

        vm.stopBroadcast();
    }
}

