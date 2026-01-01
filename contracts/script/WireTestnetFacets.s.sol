// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";

/// @notice Script to wire facets on testnet (if they weren't executed during deployment)
/// Usage: forge script script/WireTestnetFacets.s.sol:WireTestnetFacets --rpc-url bsc_testnet --broadcast --legacy
/// 
/// IMPORTANT: This script will:
/// 1. Schedule operations if needed
/// 2. Execute them immediately (if timelock delay allows) OR wait for timelock
/// 
/// Make sure you have PRIVATE_KEY_TESTNET set in your .env file
contract WireTestnetFacets is Script {
    // Testnet addresses
    address constant CORE = 0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd;
    address constant MARKET_FACET = 0x97A832fa4fbF84D3Fec97fe4e3eF65FEc73aB35D;
    address constant TRADING_FACET = 0xbfEe7bf201171CA527C83334C6D9b08d2F85790A;
    address constant LIQUIDITY_FACET = 0x1D0d6Fd85A7Ae08Ac8A9B58Cb736d7c2CbB43a39;
    address constant SETTLEMENT_FACET = 0x5f9D480e972fBd90EcA50E01Fd277AbF6a8f7386;
    address constant RESOLVER = 0x6217730cab1Fc4548747bc37777Bf622B1741e36;
    address constant ADMIN = 0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F;

    function run() external {
        // Get private key
        string memory pkStr;
        try vm.envString("PRIVATE_KEY_TESTNET") returns (string memory s) {
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

        vm.startBroadcast(pk);
        
        SpeculateCoreRouter core = SpeculateCoreRouter(payable(CORE));
        
        console2.log("=== Wiring Testnet Facets ===\n");
        console2.log("Core Router:", CORE);
        console2.log("Admin:", ADMIN);
        console2.log("");
        
        bytes32 OP_SET_RESOLVER = keccak256("OP_SET_RESOLVER");
        bytes32 OP_SET_FACET = keccak256("OP_SET_FACET");
        
        // Check current timelock delay
        uint256 delay = core.minTimelockDelay();
        console2.log("Timelock delay:", delay);
        console2.log("Delay in hours:", delay / 3600);
        console2.log("");
        
        // 1. Set Resolver
        console2.log("Setting resolver...");
        bytes32 opResolver = core.scheduleOp(OP_SET_RESOLVER, abi.encode(RESOLVER));
        console2.log("Resolver opId:");
        console2.logBytes32(opResolver);
        
        // Check if we can execute immediately (delay == 0) or need to wait
        if (delay == 0) {
            console2.log("Executing resolver immediately (delay=0)...");
            core.executeSetResolver(opResolver, RESOLVER);
            console2.log("Resolver set!");
        } else {
            console2.log("Resolver scheduled. Will be ready at:", block.timestamp + delay);
            console2.log("You'll need to execute it after the delay passes.");
        }
        console2.log("");
        
        // 2. Wire MarketFacet functions
        console2.log("Wiring MarketFacet...");
        bytes32 op1 = _schedule(core, OP_SET_FACET, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", MARKET_FACET);
        bytes32 op2 = _schedule(core, OP_SET_FACET, "getMarketState(uint256)", MARKET_FACET);
        bytes32 op3 = _schedule(core, OP_SET_FACET, "getMarketResolution(uint256)", MARKET_FACET);
        bytes32 op4 = _schedule(core, OP_SET_FACET, "getMarketQuestion(uint256)", MARKET_FACET);
        bytes32 op5 = _schedule(core, OP_SET_FACET, "getMarketInvariants(uint256)", MARKET_FACET);
        bytes32 op5b = _schedule(core, OP_SET_FACET, "getMarketTokens(uint256)", MARKET_FACET);
        
        if (delay == 0) {
            _exec(core, op1, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", MARKET_FACET);
            _exec(core, op2, "getMarketState(uint256)", MARKET_FACET);
            _exec(core, op3, "getMarketResolution(uint256)", MARKET_FACET);
            _exec(core, op4, "getMarketQuestion(uint256)", MARKET_FACET);
            _exec(core, op5, "getMarketInvariants(uint256)", MARKET_FACET);
            _exec(core, op5b, "getMarketTokens(uint256)", MARKET_FACET);
            console2.log("MarketFacet wired!");
        }
        console2.log("");
        
        // 3. Wire TradingFacet functions
        console2.log("Wiring TradingFacet...");
        bytes32 op6 = _schedule(core, OP_SET_FACET, "spotPriceYesE18(uint256)", TRADING_FACET);
        bytes32 op7 = _schedule(core, OP_SET_FACET, "spotPriceYesE6(uint256)", TRADING_FACET);
        bytes32 op8 = _schedule(core, OP_SET_FACET, "getMaxJumpE18(uint256)", TRADING_FACET);
        bytes32 op9 = _schedule(core, OP_SET_FACET, "buy(uint256,bool,uint256,uint256)", TRADING_FACET);
        bytes32 op10 = _schedule(core, OP_SET_FACET, "sell(uint256,bool,uint256,uint256)", TRADING_FACET);
        bytes32 op11 = _schedule(core, OP_SET_FACET, "buy(uint256,bool,uint256,uint256,uint256)", TRADING_FACET);
        bytes32 op12 = _schedule(core, OP_SET_FACET, "sell(uint256,bool,uint256,uint256,uint256)", TRADING_FACET);
        
        if (delay == 0) {
            _exec(core, op6, "spotPriceYesE18(uint256)", TRADING_FACET);
            _exec(core, op7, "spotPriceYesE6(uint256)", TRADING_FACET);
            _exec(core, op8, "getMaxJumpE18(uint256)", TRADING_FACET);
            _exec(core, op9, "buy(uint256,bool,uint256,uint256)", TRADING_FACET);
            _exec(core, op10, "sell(uint256,bool,uint256,uint256)", TRADING_FACET);
            _exec(core, op11, "buy(uint256,bool,uint256,uint256,uint256)", TRADING_FACET);
            _exec(core, op12, "sell(uint256,bool,uint256,uint256,uint256)", TRADING_FACET);
            console2.log("TradingFacet wired!");
        }
        console2.log("");
        
        // 4. Wire LiquidityFacet functions
        console2.log("Wiring LiquidityFacet...");
        bytes32 op13 = _schedule(core, OP_SET_FACET, "addLiquidity(uint256,uint256)", LIQUIDITY_FACET);
        bytes32 op14 = _schedule(core, OP_SET_FACET, "removeLiquidity(uint256,uint256)", LIQUIDITY_FACET);
        bytes32 op15 = _schedule(core, OP_SET_FACET, "claimLpFees(uint256)", LIQUIDITY_FACET);
        
        if (delay == 0) {
            _exec(core, op13, "addLiquidity(uint256,uint256)", LIQUIDITY_FACET);
            _exec(core, op14, "removeLiquidity(uint256,uint256)", LIQUIDITY_FACET);
            _exec(core, op15, "claimLpFees(uint256)", LIQUIDITY_FACET);
            console2.log("LiquidityFacet wired!");
        }
        console2.log("");
        
        // 5. Wire SettlementFacet functions
        console2.log("Wiring SettlementFacet...");
        bytes32 op16 = _schedule(core, OP_SET_FACET, "resolveMarketWithPrice(uint256,uint256)", SETTLEMENT_FACET);
        bytes32 op17 = _schedule(core, OP_SET_FACET, "emergencyCancelMarket(bytes32,uint256)", SETTLEMENT_FACET);
        bytes32 op18 = _schedule(core, OP_SET_FACET, "redeem(uint256,bool)", SETTLEMENT_FACET);
        bytes32 op19 = _schedule(core, OP_SET_FACET, "pendingLpResidual(uint256,address)", SETTLEMENT_FACET);
        bytes32 op20 = _schedule(core, OP_SET_FACET, "claimLpResidual(uint256)", SETTLEMENT_FACET);
        
        if (delay == 0) {
            _exec(core, op16, "resolveMarketWithPrice(uint256,uint256)", SETTLEMENT_FACET);
            _exec(core, op17, "emergencyCancelMarket(bytes32,uint256)", SETTLEMENT_FACET);
            _exec(core, op18, "redeem(uint256,bool)", SETTLEMENT_FACET);
            _exec(core, op19, "pendingLpResidual(uint256,address)", SETTLEMENT_FACET);
            _exec(core, op20, "claimLpResidual(uint256)", SETTLEMENT_FACET);
            console2.log("SettlementFacet wired!");
        }
        console2.log("");
        
        if (delay > 0) {
            console2.log("=== IMPORTANT ===");
            console2.log("Operations have been scheduled but require timelock delay.");
            console2.log("Wait for the delay to pass, then execute them using:");
            console2.log("forge script script/ExecuteTestnetOps.s.sol:ExecuteTestnetOps --rpc-url bsc_testnet --broadcast --legacy");
            console2.log("");
            console2.log("Or execute manually via:");
            console2.log("- executeSetResolver(opId, resolver)");
            console2.log("- executeSetFacet(opId, selector, facet)");
        } else {
            console2.log("=== SUCCESS ===");
            console2.log("All facets have been wired! You can now create markets.");
        }
        
        vm.stopBroadcast();
    }
    
    function _schedule(SpeculateCoreRouter core, bytes32 tag, string memory sig, address facet) 
        internal returns (bytes32) 
    {
        bytes4 selector = bytes4(keccak256(bytes(sig)));
        return core.scheduleOp(tag, abi.encode(selector, facet));
    }

    function _exec(SpeculateCoreRouter core, bytes32 opId, string memory sig, address facet) internal {
        bytes4 selector = bytes4(keccak256(bytes(sig)));
        core.executeSetFacet(opId, selector, facet);
    }
}

