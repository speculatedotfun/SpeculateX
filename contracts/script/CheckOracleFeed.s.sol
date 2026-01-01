// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";

/// @notice Check the oracle feed used in the failed transaction
/// Usage: forge script script/CheckOracleFeed.s.sol:CheckOracleFeed --rpc-url bsc_testnet
contract CheckOracleFeed is Script {
    // Oracle feed from failed transaction
    address constant ORACLE_FEED = 0x5741306c21795FdCBb9b265Ea0255F499DFe515C;
    uint256 constant TARGET_VALUE = 9000000000000; // 90000 with 8 decimals
    
    function run() external view {
        console2.log("=== Checking Oracle Feed ===");
        console2.log("Feed Address:", ORACLE_FEED);
        console2.log("Target Value:", TARGET_VALUE);
        console2.log("Target Value (human):", TARGET_VALUE / 1e8, "USD");
        console2.log("");
        
        if (ORACLE_FEED == address(0)) {
            console2.log("ERROR: Oracle feed is zero address!");
            return;
        }
        
        try AggregatorV3Interface(ORACLE_FEED).decimals() returns (uint8 decimals) {
            console2.log("Oracle decimals:", decimals);
            
            if (decimals > 18) {
                console2.log("ERROR: Decimals > 18 - will be rejected!");
                return;
            }
            
            console2.log("OK: Decimals <= 18");
        } catch {
            console2.log("ERROR: Cannot read decimals from feed!");
            console2.log("This feed might not exist or not be a valid Chainlink aggregator");
            return;
        }
        
        try AggregatorV3Interface(ORACLE_FEED).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            console2.log("=== Oracle Feed Data ===");
            console2.log("Round ID:", roundId);
            console2.log("Answer:", answer);
            console2.log("Answer (human):", uint256(answer) / 1e8, "USD");
            console2.log("Started At:", startedAt);
            console2.log("Updated At:", updatedAt);
            console2.log("");
            
            // Validation checks
            bool hasError = false;
            
            if (answer <= 0) {
                console2.log("ERROR: Answer <= 0 - will be rejected!");
                hasError = true;
            }
            if (startedAt == 0) {
                console2.log("ERROR: StartedAt == 0 - will be rejected!");
                hasError = true;
            }
            if (updatedAt == 0) {
                console2.log("ERROR: UpdatedAt == 0 - will be rejected!");
                hasError = true;
            }
            if (updatedAt > block.timestamp) {
                console2.log("ERROR: UpdatedAt > block.timestamp - will be rejected!");
                hasError = true;
            }
            
            uint256 age = block.timestamp > updatedAt ? block.timestamp - updatedAt : 0;
            console2.log("Oracle age (seconds):", age);
            console2.log("Oracle age (hours):", age / 3600);
            
            if (age > 4 hours) {
                console2.log("ERROR: Oracle age > 4 hours - will be rejected!");
                hasError = true;
            } else {
                console2.log("OK: Oracle is fresh (< 4 hours)");
            }
            
            // Check target value range
            if (answer > 0) {
                uint256 priceNow = uint256(answer);
                uint256 minTarget = priceNow / 50;
                if (minTarget == 0) minTarget = 1;
                uint256 maxTarget = priceNow * 50;
                
                console2.log("");
                console2.log("=== Target Value Validation ===");
                console2.log("Current Price:", priceNow);
                console2.log("Current Price (human):", priceNow / 1e8, "USD");
                console2.log("Target Value:", TARGET_VALUE);
                console2.log("Target Value (human):", TARGET_VALUE / 1e8, "USD");
                console2.log("Min Target (price/50):", minTarget);
                console2.log("Max Target (price*50):", maxTarget);
                console2.log("");
                
                if (TARGET_VALUE < minTarget || TARGET_VALUE > maxTarget) {
                    console2.log("ERROR: Target value out of range!");
                    console2.log("Target must be in [price/50, price*50]");
                    console2.log("Range (min):", minTarget / 1e8);
                    console2.log("Range (max):", maxTarget / 1e8);
                    hasError = true;
                } else {
                    console2.log("OK: Target value is in valid range");
                }
            }
            
            if (!hasError) {
                console2.log("");
                console2.log("=== SUMMARY ===");
                console2.log("Oracle feed appears valid!");
                console2.log("If transaction still fails, check:");
                console2.log("1. USDC balance and allowance");
                console2.log("2. Expiry timestamp (must be future)");
                console2.log("3. Contract pause status");
            }
        } catch Error(string memory reason) {
            console2.log("ERROR calling latestRoundData:", reason);
        } catch {
            console2.log("ERROR: Cannot read latestRoundData from feed!");
            console2.log("This feed might not exist on testnet or be invalid");
        }
    }
}

