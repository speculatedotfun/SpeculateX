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

contract DeployAndSchedule is Script {
    function run() public {
        string memory pkStr = vm.envString("PRIVATE_KEY");
        uint256 pk;
        if (bytes(pkStr).length >= 2 && bytes(pkStr)[0] == "0" && bytes(pkStr)[1] == "x") {
            pk = vm.parseUint(pkStr);
        } else {
            pk = vm.parseUint(string.concat("0x", pkStr));
        }
        address admin = vm.addr(pk);

        vm.startBroadcast(pk);

        console.log("Deploying contracts...");
        
        Treasury treasury = new Treasury(admin, 20_000e6);
        console.log("Treasury:", address(treasury));

        MockUSDC usdc = new MockUSDC(admin);
        console.log("MockUSDC:", address(usdc));

        SpeculateCoreRouter core = new SpeculateCoreRouter(admin, address(usdc), address(treasury));
        console.log("Core Router:", address(core));

        ChainlinkResolver resolver = new ChainlinkResolver(admin, address(core));
        console.log("Resolver:", address(resolver));

        console.log("\nDeploying facets...");
        
        MarketFacet marketFacet = new MarketFacet();
        console.log("MarketFacet:", address(marketFacet));
        
        TradingFacet tradingFacet = new TradingFacet();
        console.log("TradingFacet:", address(tradingFacet));
        
        LiquidityFacet liquidityFacet = new LiquidityFacet();
        console.log("LiquidityFacet:", address(liquidityFacet));
        
        SettlementFacet settlementFacet = new SettlementFacet();
        console.log("SettlementFacet:", address(settlementFacet));

        console.log("\nGranting roles...");
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        usdc.grantRole(MINTER_ROLE, address(core));
        console.log("MINTER_ROLE granted to core");

        console.log("\nScheduling operations...");
        bytes32 OP_SET_RESOLVER = keccak256("OP_SET_RESOLVER");
        bytes32 opSetResolver = core.scheduleOp(OP_SET_RESOLVER, abi.encode(address(resolver)));
        console.log("OP_SET_RESOLVER scheduled:", vm.toString(opSetResolver));

        bytes32 OP_SET_FACET = keccak256("OP_SET_FACET");
        
        // Market facet
        _schedule(core, OP_SET_FACET, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", address(marketFacet));
        _schedule(core, OP_SET_FACET, "getMarketState(uint256)", address(marketFacet));
        _schedule(core, OP_SET_FACET, "getMarketResolution(uint256)", address(marketFacet));

        // Trading facet
        _schedule(core, OP_SET_FACET, "spotPriceYesE18(uint256)", address(tradingFacet));
        _schedule(core, OP_SET_FACET, "spotPriceYesE6(uint256)", address(tradingFacet));
        _schedule(core, OP_SET_FACET, "buy(uint256,bool,uint256,uint256)", address(tradingFacet));
        _schedule(core, OP_SET_FACET, "sell(uint256,bool,uint256,uint256)", address(tradingFacet));

        // Liquidity facet
        _schedule(core, OP_SET_FACET, "addLiquidity(uint256,uint256)", address(liquidityFacet));
        _schedule(core, OP_SET_FACET, "claimLpFees(uint256)", address(liquidityFacet));

        // Settlement facet
        _schedule(core, OP_SET_FACET, "resolveMarketWithPrice(uint256,uint256)", address(settlementFacet));
        _schedule(core, OP_SET_FACET, "redeem(uint256,bool)", address(settlementFacet));
        _schedule(core, OP_SET_FACET, "pendingLpResidual(uint256,address)", address(settlementFacet));
        _schedule(core, OP_SET_FACET, "claimLpResidual(uint256)", address(settlementFacet));

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Wait 24h then execute scheduled operations");
    }

    function _schedule(SpeculateCoreRouter core, bytes32 tag, string memory sig, address facet) internal {
        bytes4 selector = bytes4(keccak256(bytes(sig)));
        core.scheduleOp(tag, abi.encode(selector, facet));
    }
}
