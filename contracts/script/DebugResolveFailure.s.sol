// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";
import {AggregatorV3Interface} from "../src/interfaces/AggregatorV3Interface.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";

// Interface for getMarketResolution (must be declared at file scope, not inside a contract)
interface ICoreResolutionView_DebugResolveFailure {
    enum OracleType { None, ChainlinkFeed }
    struct ResolutionConfig {
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

/// @notice Debug a specific failed resolve transaction by checking all conditions
/// Usage: forge script script/DebugResolveFailure.s.sol:DebugResolveFailure --rpc-url $BSC_TESTNET_RPC -vvv
contract DebugResolveFailure is Script {
    // Transaction details
    address constant RESOLVER = 0xe7422B1dBAdFE333489106ED0Ed5536061FF662f;
    address constant CORE = 0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd;
    uint256 constant MARKET_ID = 4;
    uint80 constant ROUND_ID = 0x20000000000bdd8; // Phase 2, aggregator round 48598
    
    function run() external view {
        console2.log("=== Debugging Failed Resolve Transaction ===\n");
        console2.log("Transaction Hash: 0xfa1d78e7b8c8ad07a5badd00d29524273e2496c7d9b2b56e608c3dd9ea9e6799");
        console2.log("Market ID:", MARKET_ID);
        console2.log("Round ID (hex):", vm.toString(ROUND_ID));
        console2.log("");
        
        ChainlinkResolver resolver = ChainlinkResolver(RESOLVER);
        // Use a minimal interface view for resolution config (Router type may not expose this selector directly)
        ICoreResolutionView_DebugResolveFailure coreView = ICoreResolutionView_DebugResolveFailure(CORE);
        
        // Check 1: Is resolver paused?
        bool paused = resolver.paused();
        console2.log("=== Check 1: Resolver Paused ===");
        console2.log("Paused:", paused);
        if (paused) {
            console2.log("ERROR: Resolver is paused! This will cause failure.");
            return;
        }
        console2.log("PASS\n");
        
        // Check 2: Parse round ID
        console2.log("=== Check 2: Round ID Parsing ===");
        uint16 phase = uint16(ROUND_ID >> 64);
        uint64 aggregatorRound = uint64(ROUND_ID);
        console2.log("Phase:", phase);
        console2.log("Aggregator Round:", aggregatorRound);
        if (aggregatorRound == 0) {
            console2.log("ERROR: At phase boundary! This will cause PhaseBoundaryRound error.");
            return;
        }
        console2.log("PASS\n");
        
        // Check 3: Get market resolution config
        console2.log("=== Check 3: Market Resolution Config ===");
        ICoreResolutionView_DebugResolveFailure.ResolutionConfig memory r;
        try coreView.getMarketResolution(MARKET_ID) returns (ICoreResolutionView_DebugResolveFailure.ResolutionConfig memory config) {
            r = config;
            console2.log("Expiry Timestamp:", r.expiryTimestamp);
            console2.log("Oracle Type:", uint8(r.oracleType));
            console2.log("Oracle Address:", r.oracleAddress);
            console2.log("Oracle Decimals:", r.oracleDecimals);
            console2.log("Is Resolved:", r.isResolved);
            console2.log("");
            
            if (r.oracleType != ICoreResolutionView_DebugResolveFailure.OracleType.ChainlinkFeed) {
                console2.log("ERROR: Not a Chainlink market! This will cause NotChainlinkMarket error.");
                return;
            }
            if (r.oracleAddress == address(0)) {
                console2.log("ERROR: Oracle address is zero! This will cause FeedMissing error.");
                return;
            }
            if (block.timestamp < r.expiryTimestamp) {
                console2.log("ERROR: Market not expired yet! This will cause MarketNotExpired error.");
                console2.log("Current time:", block.timestamp);
                console2.log("Expiry time:", r.expiryTimestamp);
                console2.log("Time until expiry:", r.expiryTimestamp - block.timestamp, "seconds");
                return;
            }
        } catch {
            console2.log("ERROR: Could not fetch market resolution config!");
            return;
        }
        console2.log("PASS\n");
        
        // Check 4: Oracle feed decimals
        console2.log("=== Check 4: Oracle Feed Decimals ===");
        AggregatorV3Interface feed = AggregatorV3Interface(r.oracleAddress);
        uint8 decNow;
        try feed.decimals() returns (uint8 decimals) {
            decNow = decimals;
            console2.log("Current decimals:", decNow);
            console2.log("Recorded decimals:", r.oracleDecimals);
            if (decNow > 18) {
                console2.log("ERROR: Decimals > 18! This will cause UnsupportedDecimals error.");
                return;
            }
            if (r.oracleDecimals != 0 && decNow != r.oracleDecimals) {
                console2.log("ERROR: Decimals mismatch! This will cause OracleDecimalsMismatch error.");
                return;
            }
        } catch {
            console2.log("ERROR: Could not read decimals from feed!");
            return;
        }
        console2.log("PASS\n");
        
        // Check 5: Get target round data
        console2.log("=== Check 5: Target Round Data ===");
        try feed.getRoundData(ROUND_ID) returns (
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
            console2.log("Answered In Round:", answeredInRound);
            console2.log("");
            
            if (answer <= 0 || updatedAt == 0) {
                console2.log("ERROR: Invalid answer or updatedAt! This will cause InvalidAnswer error.");
                return;
            }
            if (answeredInRound < roundId) {
                console2.log("ERROR: Incomplete round! This will cause IncompleteRound error.");
                return;
            }
            if (updatedAt < r.expiryTimestamp) {
                console2.log("ERROR: Round too early! This will cause RoundTooEarly error.");
                console2.log("Round updatedAt:", updatedAt);
                console2.log("Expiry timestamp:", r.expiryTimestamp);
                return;
            }
            
            // Check staleness
            uint256 maxStaleness = resolver.maxStaleness();
            uint256 age = block.timestamp - updatedAt;
            console2.log("Round age (seconds):", age);
            console2.log("Max staleness (seconds):", maxStaleness);
            if (age > maxStaleness) {
                console2.log("ERROR: Round is stale! This will cause Stale error.");
                return;
            }
        } catch {
            console2.log("ERROR: Could not fetch round data! This will cause IncompleteRound error.");
            return;
        }
        console2.log("PASS\n");
        
        // Check 6: Previous round (critical check)
        console2.log("=== Check 6: Previous Round (First-ness Verification) ===");
        uint80 prevRoundId = (uint80(phase) << 64) | (aggregatorRound - 1);
        console2.log("Previous Round ID (hex):", vm.toString(prevRoundId));
        console2.log("Previous Round Phase:", phase);
        console2.log("Previous Round Aggregator:", aggregatorRound - 1);
        console2.log("");
        
        try feed.getRoundData(prevRoundId) returns (
            uint80,
            int256,
            uint256,
            uint256 prevUpdatedAt,
            uint80
        ) {
            console2.log("Previous Round Updated At:", prevUpdatedAt);
            console2.log("Expiry Timestamp:", r.expiryTimestamp);
            console2.log("");
            
            if (prevUpdatedAt >= r.expiryTimestamp) {
                console2.log("ERROR: Not first round after expiry! This will cause NotFirstRoundAfterExpiry error.");
                console2.log("Previous round updatedAt:", prevUpdatedAt);
                console2.log("Expiry timestamp:", r.expiryTimestamp);
                console2.log("Difference:", prevUpdatedAt - r.expiryTimestamp, "seconds");
                console2.log("");
                console2.log("This means the selected round is NOT the first round after expiry.");
                console2.log("You need to find a round where:");
                console2.log("  - round.updatedAt >= expiryTimestamp");
                console2.log("  - previousRound.updatedAt < expiryTimestamp");
                return;
            }
            console2.log("PASS: Previous round is before expiry, so this is the first round after expiry.");
        } catch {
            console2.log("ERROR: Could not fetch previous round data! This will cause IncompleteRound error.");
            console2.log("This usually means:");
            console2.log("  1. The previous round doesn't exist");
            console2.log("  2. You're at a phase boundary");
            console2.log("  3. The oracle feed doesn't have historical data for that round");
            return;
        }
        console2.log("");
        
        console2.log("=== ALL CHECKS PASSED ===");
        console2.log("The resolve function should succeed with these parameters.");
        console2.log("If it's still failing, there may be an issue with:");
        console2.log("  1. Reentrancy guard (shouldn't be an issue for external calls)");
        console2.log("  2. The resolveMarketWithPrice call on the core contract");
        console2.log("  3. Gas estimation issues");
    }
}

