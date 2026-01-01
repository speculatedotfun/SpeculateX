// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";

/// @notice Diagnostic script to check if facets are wired on testnet
/// Usage: forge script script/CheckTestnetFacets.s.sol:CheckTestnetFacets --rpc-url bsc_testnet
contract CheckTestnetFacets is Script {
    // Testnet addresses (updated 2025-12-31)
    address constant CORE = 0x57EB390222D1Dd4517070735C24A899d6D41b759;
    address constant MARKET_FACET = 0xe5c3E95B1a25d3899a4f9453cEa2a75CC18a8460;
    address constant TRADING_FACET = 0xCFF063f8dC8411c95bb89148113B03f4AA9aD9f9;
    address constant LIQUIDITY_FACET = 0xCcd71AfdC6daF6738F312E4AA822d60B809E3A6F;
    address constant SETTLEMENT_FACET = 0x99201df4C85e00F097c263dDC72768A36085CA6C;
    address constant RESOLVER = 0xd278C4bC3A5C1ce5Bb7228fcC29F9831379fF060;

    function run() external view {
        SpeculateCoreRouter core = SpeculateCoreRouter(payable(CORE));
        
        console2.log("=== Checking Testnet Facet Connections ===\n");
        
        // Check createMarket selector
        bytes4 createMarketSelector = bytes4(keccak256("createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)"));
        address facet = core.facetOf(createMarketSelector);
        console2.log("createMarket facet:", facet);
        console2.log("Expected:", MARKET_FACET);
        console2.log("Connected:", facet == MARKET_FACET ? "YES" : "NO");
        console2.log("");
        
        // Check resolver
        address resolver = core.chainlinkResolver();
        console2.log("Resolver:", resolver);
        console2.log("Expected:", RESOLVER);
        console2.log("Connected:", resolver == RESOLVER ? "YES" : "NO");
        console2.log("");
        
        // Check a few more key selectors
        bytes4 buySelector = bytes4(keccak256("buy(uint256,bool,uint256,uint256)"));
        bytes4 sellSelector = bytes4(keccak256("sell(uint256,bool,uint256,uint256)"));
        bytes4 addLiquiditySelector = bytes4(keccak256("addLiquidity(uint256,uint256)"));
        bytes4 redeemSelector = bytes4(keccak256("redeem(uint256,bool)"));
        
        console2.log("buy facet:", core.facetOf(buySelector));
        console2.log("sell facet:", core.facetOf(sellSelector));
        console2.log("addLiquidity facet:", core.facetOf(addLiquiditySelector));
        console2.log("redeem facet:", core.facetOf(redeemSelector));
        console2.log("");
        
        // Check timelock delay
        uint256 delay = core.minTimelockDelay();
        console2.log("Timelock delay:", delay);
        console2.log("Delay in hours:", delay / 3600);
    }
}

