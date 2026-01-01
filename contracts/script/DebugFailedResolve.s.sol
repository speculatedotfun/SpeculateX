// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";

/// @notice Debug a specific failed resolve transaction
/// Usage: forge script script/DebugFailedResolve.s.sol:DebugFailedResolve --rpc-url $BSC_TESTNET_RPC
contract DebugFailedResolve is Script {
    // Transaction details
    address constant RESOLVER = 0xe7422B1dBAdFE333489106ED0Ed5536061FF662f;
    uint256 constant MARKET_ID = 1;
    uint80 constant ROUND_ID = 0x20000000000bdd5; // Phase 2, aggregator round 48597
    
    function run() external view {
        console2.log("=== Debugging Failed Resolve Transaction ===\n");
        console2.log("Transaction Hash: 0x02a70bc3b3f15ef380beac6b2c0f057260146dc2e352d2970a1705fcdb5e8082");
        console2.log("Market ID:", MARKET_ID);
        console2.log("Round ID (hex):", vm.toString(ROUND_ID));
        console2.log("");
        
        // Parse round ID
        uint16 phase = uint16(ROUND_ID >> 64);
        uint64 aggregatorRound = uint64(ROUND_ID);
        console2.log("Phase:", phase);
        console2.log("Aggregator Round:", aggregatorRound);
        console2.log("");
        
        ChainlinkResolver resolver = ChainlinkResolver(RESOLVER);
        
        // Check if paused
        bool paused = resolver.paused();
        console2.log("Resolver Paused:", paused);
        if (paused) {
            console2.log("ERROR: Resolver is paused!");
            return;
        }
        console2.log("");
        
        // Get market resolution config
        address core = resolver.core();
        console2.log("Core Address:", core);
        
        // We need to call getMarketResolution on the core
        // For now, let's check what we can from the resolver
        
        // Check max staleness
        uint256 maxStaleness = resolver.maxStaleness();
        console2.log("Max Staleness (seconds):", maxStaleness);
        console2.log("Max Staleness (hours):", maxStaleness / 3600);
        console2.log("");
        
        console2.log("=== Manual Checks Needed ===");
        console2.log("1. Check if market has expired (block.timestamp >= expiryTimestamp)");
        console2.log("2. Check oracle feed address from market resolution config");
        console2.log("3. Verify round data exists and is valid");
        console2.log("4. Check if previous round exists and is before expiry");
        console2.log("5. Verify round is not stale (block.timestamp - updatedAt <= maxStaleness)");
        console2.log("");
        
        // Try to get the market resolution config by simulating a call
        // We'll need the core ABI for this, but let's at least show what to check
        console2.log("To fully debug, you need to:");
        console2.log("- Call getMarketResolution(marketId) on core contract");
        console2.log("- Check expiryTimestamp vs block.timestamp");
        console2.log("- Get oracleAddress and verify it's not zero");
        console2.log("- Call getRoundData(roundId) on oracle feed");
        console2.log("- Verify previous round exists and updatedAt < expiryTimestamp");
    }
}

