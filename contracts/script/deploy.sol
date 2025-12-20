// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {MarketFacet} from "../src/facets/MarketFacet.sol";
import {TradingFacet} from "../src/facets/TradingFacet.sol";
import {LiquidityFacet} from "../src/facets/LiquidityFacet.sol";
import {SettlementFacet} from "../src/facets/SettlementFacet.sol";

import {MockUSDC} from "../src/MockUSDC.sol";
import {Treasury} from "../src/Treasury.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";

contract DeploySpeculateX is Script {
    bool constant IS_TESTNET = true;
    
    uint256 constant TESTNET_DELAY = 0;        // Requires contract modification!
    uint256 constant MAINNET_DELAY = 48 hours;

    function run() public {
        string memory pkStr = vm.envString("PRIVATE_KEY");
        uint256 pk;
        if (bytes(pkStr).length >= 2 && bytes(pkStr)[0] == "0" && bytes(pkStr)[1] == "x") {
            pk = vm.parseUint(pkStr);
        } else {
            pk = vm.parseUint(string.concat("0x", pkStr));
        }
        address admin = vm.addr(pk);
        uint256 timelockDelay = IS_TESTNET ? TESTNET_DELAY : MAINNET_DELAY;

        vm.startBroadcast(pk);

        console.log("=== SPECULATEX DEPLOYMENT ===");
        console.log("Admin:", admin);
        console.log("Network:", IS_TESTNET ? "TESTNET" : "MAINNET");
        console.log("");

        // ============ Deploy ============
        Treasury treasury = new Treasury(admin, 50_000e6);
        console.log("Treasury:", address(treasury));

        MockUSDC usdc = new MockUSDC(admin);
        console.log("MockUSDC:", address(usdc));

        SpeculateCoreRouter core = new SpeculateCoreRouter(
            admin, address(usdc), address(treasury), timelockDelay
        );
        console.log("Core Router:", address(core));

        ChainlinkResolver resolver = new ChainlinkResolver(admin, address(core));
        console.log("Resolver:", address(resolver));

        MarketFacet marketFacet = new MarketFacet();
        TradingFacet tradingFacet = new TradingFacet();
        LiquidityFacet liquidityFacet = new LiquidityFacet();
        SettlementFacet settlementFacet = new SettlementFacet();
        
        console.log("MarketFacet:", address(marketFacet));
        console.log("TradingFacet:", address(tradingFacet));
        console.log("LiquidityFacet:", address(liquidityFacet));
        console.log("SettlementFacet:", address(settlementFacet));

        // ============ Schedule & Execute ============
        bytes32 OP_SET_RESOLVER = keccak256("OP_SET_RESOLVER");
        bytes32 OP_SET_FACET = keccak256("OP_SET_FACET");

        // Resolver
        bytes32 opResolver = core.scheduleOp(OP_SET_RESOLVER, abi.encode(address(resolver)));

        // MarketFacet
        bytes32 op1 = _schedule(core, OP_SET_FACET, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", address(marketFacet));
        bytes32 op2 = _schedule(core, OP_SET_FACET, "getMarketState(uint256)", address(marketFacet));
        bytes32 op3 = _schedule(core, OP_SET_FACET, "getMarketResolution(uint256)", address(marketFacet));
        bytes32 op4 = _schedule(core, OP_SET_FACET, "getMarketQuestion(uint256)", address(marketFacet));
        bytes32 op5 = _schedule(core, OP_SET_FACET, "getMarketInvariants(uint256)", address(marketFacet));

        // TradingFacet
        bytes32 op6 = _schedule(core, OP_SET_FACET, "spotPriceYesE18(uint256)", address(tradingFacet));
        bytes32 op7 = _schedule(core, OP_SET_FACET, "spotPriceYesE6(uint256)", address(tradingFacet));
        bytes32 op8 = _schedule(core, OP_SET_FACET, "getMaxJumpE18(uint256)", address(tradingFacet));
        bytes32 op9 = _schedule(core, OP_SET_FACET, "buy(uint256,bool,uint256,uint256)", address(tradingFacet));
        bytes32 op10 = _schedule(core, OP_SET_FACET, "sell(uint256,bool,uint256,uint256)", address(tradingFacet));
        bytes32 op11 = _schedule(core, OP_SET_FACET, "buy(uint256,bool,uint256,uint256,uint256)", address(tradingFacet));
        bytes32 op12 = _schedule(core, OP_SET_FACET, "sell(uint256,bool,uint256,uint256,uint256)", address(tradingFacet));

        // LiquidityFacet
        bytes32 op13 = _schedule(core, OP_SET_FACET, "addLiquidity(uint256,uint256)", address(liquidityFacet));
        bytes32 op14 = _schedule(core, OP_SET_FACET, "removeLiquidity(uint256,uint256)", address(liquidityFacet));
        bytes32 op15 = _schedule(core, OP_SET_FACET, "claimLpFees(uint256)", address(liquidityFacet));

        // SettlementFacet
        bytes32 op16 = _schedule(core, OP_SET_FACET, "resolveMarketWithPrice(uint256,uint256)", address(settlementFacet));
        bytes32 op17 = _schedule(core, OP_SET_FACET, "emergencyCancelMarket(bytes32,uint256)", address(settlementFacet));
        bytes32 op18 = _schedule(core, OP_SET_FACET, "redeem(uint256,bool)", address(settlementFacet));
        bytes32 op19 = _schedule(core, OP_SET_FACET, "pendingLpResidual(uint256,address)", address(settlementFacet));
        bytes32 op20 = _schedule(core, OP_SET_FACET, "claimLpResidual(uint256)", address(settlementFacet));

        console.log("Scheduled 21 operations");

        // Execute immediately if testnet
        if (timelockDelay == 0) {
            console.log("Executing immediately (timelock=0)...");
            
            core.executeSetResolver(opResolver, address(resolver));

            _exec(core, op1, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", address(marketFacet));
            _exec(core, op2, "getMarketState(uint256)", address(marketFacet));
            _exec(core, op3, "getMarketResolution(uint256)", address(marketFacet));
            _exec(core, op4, "getMarketQuestion(uint256)", address(marketFacet));
            _exec(core, op5, "getMarketInvariants(uint256)", address(marketFacet));

            _exec(core, op6, "spotPriceYesE18(uint256)", address(tradingFacet));
            _exec(core, op7, "spotPriceYesE6(uint256)", address(tradingFacet));
            _exec(core, op8, "getMaxJumpE18(uint256)", address(tradingFacet));
            _exec(core, op9, "buy(uint256,bool,uint256,uint256)", address(tradingFacet));
            _exec(core, op10, "sell(uint256,bool,uint256,uint256)", address(tradingFacet));
            _exec(core, op11, "buy(uint256,bool,uint256,uint256,uint256)", address(tradingFacet));
            _exec(core, op12, "sell(uint256,bool,uint256,uint256,uint256)", address(tradingFacet));

            _exec(core, op13, "addLiquidity(uint256,uint256)", address(liquidityFacet));
            _exec(core, op14, "removeLiquidity(uint256,uint256)", address(liquidityFacet));
            _exec(core, op15, "claimLpFees(uint256)", address(liquidityFacet));

            _exec(core, op16, "resolveMarketWithPrice(uint256,uint256)", address(settlementFacet));
            _exec(core, op17, "emergencyCancelMarket(bytes32,uint256)", address(settlementFacet));
            _exec(core, op18, "redeem(uint256,bool)", address(settlementFacet));
            _exec(core, op19, "pendingLpResidual(uint256,address)", address(settlementFacet));
            _exec(core, op20, "claimLpResidual(uint256)", address(settlementFacet));

            console.log("All operations executed!");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("Treasury:       ", address(treasury));
        console.log("USDC:           ", address(usdc));
        console.log("Core:           ", address(core));
        console.log("Resolver:       ", address(resolver));
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