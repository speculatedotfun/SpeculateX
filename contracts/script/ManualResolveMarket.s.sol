// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/ChainlinkResolver.sol";
import "../src/SpeculateCore.sol";

/**
 * @title ManualResolveMarket
 * @notice Manually trigger market resolution to test if it works
 */
contract ManualResolveMarket is Script {
    function run() external {
        string memory pkStr = vm.envString("PRIVATE_KEY");
        bytes memory bs = bytes(pkStr);
        uint256 key = (bs.length >= 2 && bs[0] == bytes1("0") && bs[1] == bytes1("x"))
            ? vm.parseUint(pkStr)
            : vm.parseUint(string(abi.encodePacked("0x", pkStr)));
        address deployer = vm.addr(key);
        vm.startBroadcast(key);

        address resolverAddress = vm.envOr("CHAINLINK_RESOLVER_ADDRESS", address(0x363eaff32ba46F804Bc7E6352A585A705ac97aBD));
        address coreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0x62E390c9251186E394cEF754FbB42b8391331d0F));

        ChainlinkResolver resolver = ChainlinkResolver(resolverAddress);
        SpeculateCore core = SpeculateCore(coreAddress);

        console.log("\n=== MANUAL MARKET RESOLUTION TEST ===\n");

        // Check what markets need resolution
        (bool needsUpkeep, bytes memory performData) = resolver.checkUpkeep("");
        console.log("Needs Upkeep:", needsUpkeep);
        
        if (!needsUpkeep) {
            console.log("No markets need resolution right now");
            vm.stopBroadcast();
            return;
        }

        (uint256 marketId, uint256 nextStart) = abi.decode(performData, (uint256, uint256));
        console.log("Market ID to resolve:", marketId);
        console.log("Next batch start:", nextStart);

        // Check market status before
        SpeculateCore.ResolutionConfig memory before = core.getMarketResolution(marketId);
        console.log("\nBefore resolution:");
        console.log("  Resolved:", before.isResolved);
        console.log("  Expired:", block.timestamp >= before.expiryTimestamp);
        console.log("  Price Feed ID:", vm.toString(uint256(before.priceFeedId)));
        console.log("  Target Value:", before.targetValue);

        // Try to resolve
        console.log("\nAttempting to resolve market", marketId, "...");
        try resolver.performUpkeep(performData) {
            console.log("SUCCESS: Market resolved!");
            
            // Check market status after
            SpeculateCore.ResolutionConfig memory afterResolution = core.getMarketResolution(marketId);
            console.log("\nAfter resolution:");
            console.log("  Resolved:", afterResolution.isResolved);
            console.log("  Yes Wins:", afterResolution.yesWins);
        } catch Error(string memory reason) {
            console.log("ERROR:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("ERROR (low level):", vm.toString(lowLevelData));
        }

        vm.stopBroadcast();
    }
}

