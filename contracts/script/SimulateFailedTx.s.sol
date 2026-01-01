// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";

/// @notice Simulate the exact transaction that failed
/// Usage: forge script script/SimulateFailedTx.s.sol:SimulateFailedTx --rpc-url bsc_testnet
contract SimulateFailedTx is Script {
    address constant CORE = 0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd;
    
    // Parameters from failed transaction
    string constant QUESTION = "Will BTC trade above 90,000$ on Dec, 31 at 13:31 UTC?";
    string constant YES_NAME = "BTC > 90000 Dec 31 YES";
    string constant YES_SYMBOL = "Y-BTCUP90000";
    string constant NO_NAME = "BTC > 90000 Dec 31 NO";
    string constant NO_SYMBOL = "N-BTCUP90000";
    uint256 constant INIT_USDC = 500000000; // 500 USDC (6 decimals)
    uint256 constant EXPIRY = 1767187860; // Dec 31, 2025 13:31 UTC
    address constant ORACLE_FEED = 0x5741306c21795FdCBb9b265Ea0255F499DFe515C;
    bytes32 constant PRICE_FEED_ID = 0xee62665949c883f9e0f6f002eac32e00bd59dfe6c34e92a91c37d6a8322d6489;
    uint256 constant TARGET_VALUE = 9000000000000; // 90000 with 8 decimals
    uint8 constant COMPARISON = 0; // Above
    
    function run() external view {
        SpeculateCoreRouter core = SpeculateCoreRouter(payable(CORE));
        
        console2.log("=== Simulating Failed Transaction ===\n");
        
        // Check 1: Oracle feed
        console2.log("Checking Oracle Feed...");
        if (ORACLE_FEED == address(0)) {
            console2.log("ERROR: Oracle feed is zero!");
            return;
        }
        
        try AggregatorV3Interface(ORACLE_FEED).latestRoundData() returns (
            uint80,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80
        ) {
            console2.log("Oracle Answer:", answer);
            console2.log("Started At:", startedAt);
            console2.log("Updated At:", updatedAt);
            console2.log("");
            
            // Check all validation conditions
            bool willFail = false;
            string memory reason = "";
            
            if (answer <= 0) {
                willFail = true;
                reason = "Answer <= 0";
            }
            if (startedAt == 0) {
                willFail = true;
                reason = "StartedAt == 0";
            }
            if (updatedAt == 0) {
                willFail = true;
                reason = "UpdatedAt == 0";
            }
            if (updatedAt > block.timestamp) {
                willFail = true;
                reason = "UpdatedAt > block.timestamp";
            }
            
            uint256 age = block.timestamp > updatedAt ? block.timestamp - updatedAt : 0;
            uint256 MAX_ORACLE_AGE = 4 hours;
            
            console2.log("Oracle age (seconds):", age);
            console2.log("Oracle age (hours):", age / 3600);
            console2.log("MAX_ORACLE_AGE (seconds):", MAX_ORACLE_AGE);
            console2.log("MAX_ORACLE_AGE (hours):", MAX_ORACLE_AGE / 3600);
            console2.log("");
            
            if (age > MAX_ORACLE_AGE) {
                willFail = true;
                reason = "Oracle age > 4 hours";
            }
            
            // Check target value range
            if (answer > 0) {
                uint256 priceNow = uint256(answer);
                uint256 minTarget = priceNow / 50;
                if (minTarget == 0) minTarget = 1;
                uint256 maxTarget = priceNow * 50;
                
                console2.log("Current Price:", priceNow);
                console2.log("Target Value:", TARGET_VALUE);
                console2.log("Min Target:", minTarget);
                console2.log("Max Target:", maxTarget);
                
                if (TARGET_VALUE < minTarget || TARGET_VALUE > maxTarget) {
                    willFail = true;
                    reason = "Target value out of range";
                }
            }
            
            // Check expiry
            console2.log("");
            console2.log("Expiry Timestamp:", EXPIRY);
            console2.log("Current Timestamp:", block.timestamp);
            if (EXPIRY <= block.timestamp) {
                willFail = true;
                reason = "Expiry <= block.timestamp";
            }
            uint256 MAX_MARKET_DURATION = 365 days;
            if (EXPIRY > block.timestamp + MAX_MARKET_DURATION) {
                willFail = true;
                reason = "Expiry > block.timestamp + 365 days";
            }
            
            // Check minimum seed
            uint256 minSeed = core.minMarketSeed();
            console2.log("");
            console2.log("Init USDC:", INIT_USDC);
            console2.log("Min Seed Required:", minSeed);
            if (INIT_USDC < minSeed) {
                willFail = true;
                reason = "Insufficient seed";
            }
            
            console2.log("");
            console2.log("=== RESULT ===");
            if (willFail) {
                console2.log("TRANSACTION WILL FAIL!");
                console2.log("Reason:", reason);
            } else {
                console2.log("Transaction should succeed (all checks passed)");
            }
            
        } catch Error(string memory err) {
            console2.log("ERROR reading oracle:", err);
        } catch {
            console2.log("ERROR: Oracle feed not accessible");
        }
    }
}

