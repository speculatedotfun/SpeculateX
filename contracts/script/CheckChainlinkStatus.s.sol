// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/ChainlinkResolver.sol";
import "../src/SpeculateCore.sol";

/**
 * @title CheckChainlinkStatus
 * @notice Check why markets aren't resolving - diagnose Chainlink setup issues
 */
contract CheckChainlinkStatus is Script {
    function run() external view {
        console.log("\n=== CHECKING CHAINLINK RESOLVER STATUS ===\n");

        address resolverAddress = vm.envOr("CHAINLINK_RESOLVER_ADDRESS", address(0x363eaff32ba46F804Bc7E6352A585A705ac97aBD));
        address coreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0x62E390c9251186E394cEF754FbB42b8391331d0F));

        ChainlinkResolver resolver = ChainlinkResolver(resolverAddress);
        SpeculateCore core = SpeculateCore(coreAddress);

        // Check resolver status
        console.log("--- Resolver Status ---");
        console.log("Resolver:", resolverAddress);
        console.log("Paused:", resolver.paused());
        console.log("Owner:", resolver.owner());
        console.log("Core:", address(resolver.core()));
        console.log("Next Batch Start Index:", resolver.nextBatchStartIndex());

        // Check feeds
        console.log("\n--- Registered Feeds ---");
        bytes32 btcFeedId = keccak256(bytes("BTC/USD"));
        bytes32 ethFeedId = keccak256(bytes("ETH/USD"));
        bytes32 bnbFeedId = keccak256(bytes("BNB/USD"));
        
        address btcFeed = resolver.globalFeeds(btcFeedId);
        address ethFeed = resolver.globalFeeds(ethFeedId);
        address bnbFeed = resolver.globalFeeds(bnbFeedId);
        
        console.log("BTC/USD feed:", btcFeed);
        console.log("ETH/USD feed:", ethFeed);
        console.log("BNB/USD feed:", bnbFeed);

        // Check markets
        console.log("\n--- Markets Status ---");
        uint256 marketCount = core.marketCount();
        console.log("Total markets:", marketCount);

        for (uint256 i = 1; i <= marketCount; i++) {
            SpeculateCore.ResolutionConfig memory resolution = core.getMarketResolution(i);
            (bool needsUpkeep, ) = core.checkUpkeep(i);
            
            console.log("\nMarket", i, ":");
            console.log("  Expiry:", resolution.expiryTimestamp);
            console.log("  Expired:", block.timestamp >= resolution.expiryTimestamp);
            console.log("  Resolved:", resolution.isResolved);
            console.log("  Oracle Type:", uint256(resolution.oracleType));
            console.log("  Price Feed ID (hex):", vm.toString(uint256(resolution.priceFeedId)));
            console.log("  Oracle Address:", resolution.oracleAddress);
            console.log("  Target Value:", resolution.targetValue);
            
            // Check if feed is registered
            address registeredFeed = resolver.globalFeeds(resolution.priceFeedId);
            console.log("  Registered Feed:", registeredFeed);
            console.log("  Feed Registered:", registeredFeed != address(0));
            
            // Check if upkeep is needed
            console.log("  Core checkUpkeep:", needsUpkeep);
        }
        
        // Check resolver checkUpkeep
        (bool resolverNeedsUpkeep, bytes memory performData) = resolver.checkUpkeep("");
        console.log("\n--- Resolver checkUpkeep ---");
        console.log("Needs Upkeep:", resolverNeedsUpkeep);
        if (resolverNeedsUpkeep && performData.length > 0) {
            (uint256 marketId, uint256 nextStart) = abi.decode(performData, (uint256, uint256));
            console.log("Market ID to resolve:", marketId);
            console.log("Next batch start:", nextStart);
        }

        console.log("\n=== DIAGNOSIS ===");
        if (resolver.paused()) {
            console.log("ISSUE: Resolver is PAUSED - unpause it first!");
        }
        if (btcFeed == address(0) && ethFeed == address(0) && bnbFeed == address(0)) {
            console.log("ISSUE: No feeds registered - set up feeds first!");
        }
        if (marketCount == 0) {
            console.log("ISSUE: No markets exist");
        }
        console.log("\nCheck complete");
    }
}

