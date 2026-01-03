// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";

interface ICoreResolutionView {
    enum OracleType { None, ChainlinkFeed }
    struct ResolutionConfig {
        uint256 startTime;      // When trading becomes active (0 = immediate)
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

contract DiagnoseResolver is Script {
    function run() public view {
        address resolver = vm.envAddress("RESOLVER_ADDRESS");
        address core = vm.envAddress("CORE_ADDRESS");
        uint256 marketId = vm.envOr("MARKET_ID", uint256(2));

        console.log("=== RESOLVER DIAGNOSTICS ===");
        console.log("Resolver:", resolver);
        console.log("Core:", core);
        console.log("Market ID:", marketId);
        console.log("");

        ChainlinkResolver resolverContract = ChainlinkResolver(resolver);
        SpeculateCoreRouter coreContract = SpeculateCoreRouter(payable(core));

        // 1. Check if resolver is paused
        bool paused = resolverContract.paused();
        console.log("1. Resolver Paused:", paused);
        if (paused) {
            console.log("   ERROR: Resolver is paused!");
            return;
        }
        console.log("");

        // 2. Check resolver core address
        address resolverCore = resolverContract.core();
        console.log("2. Resolver Core Address:", resolverCore);
        console.log("   Expected Core:", core);
        if (resolverCore != core) {
            console.log("   ERROR: Resolver core mismatch!");
            return;
        }
        console.log("");

        // 3. Get market resolution config
        console.log("3. Market Resolution Config:");
        ICoreResolutionView.ResolutionConfig memory r = ICoreResolutionView(core).getMarketResolution(marketId);
        
        console.log("   Expiry Timestamp:", r.expiryTimestamp);
        console.log("   Current Timestamp:", block.timestamp);
        console.log("   Market Expired:", block.timestamp >= r.expiryTimestamp);
        console.log("   Start Time:", r.startTime);
        console.log("   Oracle Type:", uint8(r.oracleType));
        console.log("   Oracle Address:", r.oracleAddress);
        console.log("   Price Feed ID:");
        console.logBytes32(r.priceFeedId);
        console.log("   Is Resolved:", r.isResolved);
        console.log("");

        // 4. Check oracle type
        if (r.oracleType != ICoreResolutionView.OracleType.ChainlinkFeed) {
            console.log("   ERROR: Not a Chainlink market!");
            console.log("   Oracle Type:", uint8(r.oracleType));
            console.log("   Expected: 1 (ChainlinkFeed)");
            return;
        }

        // 5. Check oracle address
        address feedAddress = r.oracleAddress;
        if (feedAddress == address(0) || feedAddress == address(1)) {
            console.log("   WARNING: Invalid oracleAddress, trying to extract from priceFeedId...");
            bytes32 feedId = r.priceFeedId;
            assembly {
                feedAddress := shr(96, feedId)
            }
            console.log("   Extracted Feed Address:", feedAddress);
        }

        if (feedAddress == address(0) || feedAddress == address(1)) {
            console.log("   ERROR: Cannot determine feed address!");
            return;
        }
        console.log("   Using Feed Address:", feedAddress);
        console.log("");

        // 6. Check feed contract
        console.log("4. Chainlink Feed Check:");
        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        
        try feed.decimals() returns (uint8 decimals) {
            console.log("   Feed Decimals:", decimals);
        } catch {
            console.log("   ERROR: Cannot read feed decimals - feed may not exist!");
            return;
        }

        try feed.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            console.log("   Latest Round ID:", uint256(roundId));
            console.log("   Latest Answer:", answer);
            console.log("   Latest Updated At:", updatedAt);
            console.log("   Latest Updated At > Expiry:", updatedAt >= r.expiryTimestamp);
            console.log("");

            // 7. Check staleness
            uint256 maxStaleness = resolverContract.maxStaleness();
            uint256 age = block.timestamp - updatedAt;
            console.log("5. Staleness Check:");
            console.log("   Round Age (seconds):", age);
            console.log("   Max Staleness (seconds):", maxStaleness);
            console.log("   Is Stale:", age > maxStaleness);
            if (age > maxStaleness) {
                console.log("   ERROR: Round is too stale!");
                return;
            }
            console.log("");

            // 8. Check if round is after expiry
            if (updatedAt < r.expiryTimestamp) {
                console.log("   ERROR: Latest round is before expiry!");
                console.log("   Round Updated At:", updatedAt);
                console.log("   Expiry Timestamp:", r.expiryTimestamp);
                return;
            }

            // 9. Check previous round
            console.log("6. Previous Round Check:");
            (uint16 phase, uint64 aggregatorRound) = parseRoundId(roundId);
            console.log("   Phase:", phase);
            console.log("   Aggregator Round:", aggregatorRound);
            
            if (aggregatorRound == 0) {
                console.log("   ERROR: Cannot verify at phase boundary!");
                return;
            }

            uint80 prevRoundId = (uint80(phase) << 64) | (aggregatorRound - 1);
            console.log("   Previous Round ID:", uint256(prevRoundId));
            
            try feed.getRoundData(prevRoundId) returns (
                uint80,
                int256,
                uint256,
                uint256 prevUpdatedAt,
                uint80
            ) {
                console.log("   Previous Round Updated At:", prevUpdatedAt);
                console.log("   Previous < Expiry:", prevUpdatedAt < r.expiryTimestamp);
                if (prevUpdatedAt >= r.expiryTimestamp) {
                    console.log("   ERROR: Previous round is not before expiry!");
                    console.log("   This means the latest round is NOT the first after expiry.");
                    return;
                }
                console.log("   PASS: Previous round is before expiry - this is the first round after expiry");
            } catch {
                console.log("   ERROR: Cannot fetch previous round!");
                console.log("   This could mean:");
                console.log("     - Previous round doesn't exist");
                console.log("     - We're at a phase boundary");
                console.log("     - Feed doesn't have historical data");
                return;
            }
            console.log("");

            // 10. All checks passed
            console.log("=== ALL CHECKS PASSED ===");
            console.log("The resolver should be able to resolve this market!");
            console.log("Use round ID:", uint256(roundId));
            console.log("");
            console.log("To resolve manually:");
            console.log("  resolver.resolve(marketId, roundId)");
            console.log("Market ID:", marketId);
            console.log("Round ID:", uint256(roundId));
            console.log("");
            console.log("Or use checkUpkeep:");
            console.log("  bytes memory checkData = abi.encode(marketId);");
            console.log("  (bool upkeepNeeded, bytes memory performData) = resolver.checkUpkeep(checkData);");
            console.log("  if (upkeepNeeded) resolver.performUpkeep(performData);");

        } catch {
            console.log("   ERROR: Cannot read latest round data!");
            return;
        }
    }

    function parseRoundId(uint80 roundId) internal pure returns (uint16 phaseId, uint64 aggregatorRoundId) {
        phaseId = uint16(roundId >> 64);
        aggregatorRoundId = uint64(roundId);
    }
}

