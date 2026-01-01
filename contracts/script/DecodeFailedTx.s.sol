// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";

/// @notice Decode and analyze the failed transaction
/// Usage: forge script script/DecodeFailedTx.s.sol:DecodeFailedTx --rpc-url bsc_testnet
contract DecodeFailedTx is Script {
    address constant CORE = 0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd;
    
    // Transaction hash: 0x381920b28512deeadac2980c20b3ff1a882a0489b79a359138721e53e0774cb4
    // You'll need to provide the actual input data from BscScan
    
    function run() external view {
        SpeculateCoreRouter core = SpeculateCoreRouter(payable(CORE));
        
        console2.log("=== Analyzing Failed Transaction ===\n");
        console2.log("Transaction: 0x381920b28512deeadac2980c20b3ff1a882a0489b79a359138721e53e0774cb4");
        console2.log("");
        
        // Check current block timestamp
        uint256 currentTime = block.timestamp;
        console2.log("Current block timestamp:", currentTime);
        console2.log("Current time (human):", currentTime);
        console2.log("");
        
        // Common oracle feeds on BSC testnet - let's check if they're valid
        // You'll need to replace these with the actual feed addresses used
        address[] memory testFeeds = new address[](3);
        testFeeds[0] = address(0); // Placeholder - replace with actual feed
        testFeeds[1] = address(0);
        testFeeds[2] = address(0);
        
        console2.log("To debug, check:");
        console2.log("1. Oracle feed address and its latestRoundData()");
        console2.log("2. Target value vs current price (must be in [price/50, price*50])");
        console2.log("3. Expiry timestamp (must be future and < 365 days)");
        console2.log("4. USDC balance and allowance");
        console2.log("5. Minimum seed: 500 USDC (500000000 with 6 decimals)");
    }
    
    function checkOracleFeed(address feed) external view {
        if (feed == address(0)) {
            console2.log("ERROR: Oracle feed is zero address!");
            return;
        }
        
        try AggregatorV3Interface(feed).decimals() returns (uint8 decimals) {
            console2.log("Oracle decimals:", decimals);
            
            if (decimals > 18) {
                console2.log("ERROR: Decimals > 18 - will be rejected!");
            }
        } catch {
            console2.log("ERROR: Cannot read decimals from feed!");
        }
        
        try AggregatorV3Interface(feed).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            console2.log("Round ID:", roundId);
            console2.log("Answer:", answer);
            console2.log("Started At:", startedAt);
            console2.log("Updated At:", updatedAt);
            console2.log("");
            
            if (answer <= 0) {
                console2.log("ERROR: Answer <= 0 - will be rejected!");
            }
            if (startedAt == 0) {
                console2.log("ERROR: StartedAt == 0 - will be rejected!");
            }
            if (updatedAt == 0) {
                console2.log("ERROR: UpdatedAt == 0 - will be rejected!");
            }
            if (updatedAt > block.timestamp) {
                console2.log("ERROR: UpdatedAt > block.timestamp - will be rejected!");
            }
            
            uint256 age = block.timestamp - updatedAt;
            console2.log("Oracle age (seconds):", age);
            console2.log("Oracle age (hours):", age / 3600);
            
            if (age > 4 hours) {
                console2.log("ERROR: Oracle age > 4 hours - will be rejected!");
            } else {
                console2.log("OK: Oracle is fresh");
            }
        } catch {
            console2.log("ERROR: Cannot read latestRoundData from feed!");
        }
    }
}

