// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";

interface ICoreResolutionView {
    enum OracleType { None, ChainlinkFeed }
    struct ResolutionConfig {
        uint256 startTime;
        uint256 expiryTimestamp;
        OracleType oracleType;
        address oracleAddress;
        bytes32 priceFeedId;
        uint256 targetValue;
        uint8 comparison;
        bool yesWins;
        bool isResolved;
        uint8 oracleDecimals;
    }
    function getMarketResolution(uint256 id) external view returns (ResolutionConfig memory);
}

contract FindCorrectRound is Script {
    function run() public view {
        address core = vm.envAddress("CORE_ADDRESS");
        uint256 marketId = vm.envOr("MARKET_ID", uint256(2));

        console.log("=== FINDING CORRECT ROUND FOR RESOLUTION ===");
        console.log("Core:", core);
        console.log("Market ID:", marketId);
        console.log("");

        ICoreResolutionView.ResolutionConfig memory r = ICoreResolutionView(core).getMarketResolution(marketId);
        
        console.log("Expiry Timestamp:", r.expiryTimestamp);
        console.log("Oracle Address:", r.oracleAddress);
        console.log("");

        AggregatorV3Interface feed = AggregatorV3Interface(r.oracleAddress);
        
        // Get latest round
        (uint80 latestRoundId, int256 latestAnswer, , uint256 latestUpdatedAt, ) = feed.latestRoundData();
        console.log("Latest Round:");
        console.log("  Round ID:", uint256(latestRoundId));
        console.log("  Updated At:", latestUpdatedAt);
        console.log("");

        // Parse latest round
        (uint16 phase, uint64 aggregatorRound) = parseRoundId(latestRoundId);
        console.log("Latest Round Details:");
        console.log("  Phase:", phase);
        console.log("  Aggregator Round:", aggregatorRound);
        console.log("");

        // Work backwards to find the first round after expiry
        console.log("Searching backwards for first round after expiry...");
        uint64 currentRound = aggregatorRound;
        uint80 currentRoundId;
        uint256 currentUpdatedAt;
        bool found = false;

        // Search up to 100 rounds back
        for (uint64 i = 0; i < 100 && currentRound > 0; i++) {
            currentRoundId = (uint80(phase) << 64) | currentRound;
            
            try feed.getRoundData(currentRoundId) returns (
                uint80,
                int256 answer,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                currentUpdatedAt = updatedAt;
                
                // Check if this round is after expiry
                if (updatedAt >= r.expiryTimestamp) {
                    // Check previous round
                    if (currentRound > 0) {
                        uint80 prevRoundId = (uint80(phase) << 64) | (currentRound - 1);
                        try feed.getRoundData(prevRoundId) returns (
                            uint80,
                            int256,
                            uint256,
                            uint256 prevUpdatedAt,
                            uint80
                        ) {
                            if (prevUpdatedAt < r.expiryTimestamp) {
                                // Found it!
                                console.log("FOUND CORRECT ROUND!");
                                console.log("  Round ID:", uint256(currentRoundId));
                                console.log("  Updated At:", updatedAt);
                                console.log("  Answer:", answer);
                                console.log("  Previous Round Updated At:", prevUpdatedAt);
                                console.log("  Previous < Expiry:", prevUpdatedAt < r.expiryTimestamp);
                                console.log("");
                                console.log("Use this round ID to resolve:");
                                console.log("  resolver.resolve(marketId, roundId)");
                                console.log("Market ID:", marketId);
                                console.log("Round ID:", uint256(currentRoundId));
                                found = true;
                                break;
                            }
                        } catch {
                            // Previous round doesn't exist, continue
                        }
                    }
                }
                
                // Move to previous round
                currentRound--;
            } catch {
                // Round doesn't exist, try next
                if (currentRound > 0) currentRound--;
                else break;
            }
        }

        if (!found) {
            console.log("ERROR: Could not find a valid round!");
            console.log("This means there's no round where:");
            console.log("  - round.updatedAt >= expiryTimestamp");
            console.log("  - previousRound.updatedAt < expiryTimestamp");
        }
    }

    function parseRoundId(uint80 roundId) internal pure returns (uint16 phaseId, uint64 aggregatorRoundId) {
        phaseId = uint16(roundId >> 64);
        aggregatorRoundId = uint64(roundId);
    }
}

