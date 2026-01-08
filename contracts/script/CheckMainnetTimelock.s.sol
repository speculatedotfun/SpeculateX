// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {CoreStorage} from "../src/CoreStorage.sol";

contract CheckMainnetTimelock is Script {
    function run() public view {
        address coreAddress = vm.envAddress("CORE_ADDRESS");
        
        console.log("=== MAINNET TIMELOCK STATUS CHECK ===");
        console.log("Core Router:", coreAddress);
        console.log("ChainId:", block.chainid);
        console.log("Current Timestamp:", block.timestamp);
        console.log("");

        SpeculateCoreRouter core = SpeculateCoreRouter(payable(coreAddress));
        
        uint256 timelockDelay = core.minTimelockDelay();
        console.log("Timelock Delay:", timelockDelay);
        console.log("Delay in hours:", timelockDelay / 3600);
        console.log("");

        console.log("=== RECOMMENDATION ===");
        console.log("To check and execute all timelock operations, run:");
        console.log("");
        console.log("  cd contracts");
        console.log("  $env:CORE_ROUTER=\"0xfBd5dD6bC095eA9C3187AEC24E4D1F04F25f8365\"");
        console.log("  $env:RESOLVER=\"0xe11c1Dc5768858732d4a255A3baE579860780AE2\"");
        console.log("  $env:MARKET_FACET=\"0x8aE4e9fAA34aFA70cf7D01239f1fB87b1ea303e7\"");
        console.log("  $env:TRADING_FACET=\"0x55390A0AAc12b1FD765969e3B5A9Ee51894E8830\"");
        console.log("  $env:LIQUIDITY_FACET=\"0x5A5350E102C3224024901ad9379Baf9af4FBAb87\"");
        console.log("  $env:SETTLEMENT_FACET=\"0xc12560a00609FFd23110a5630497d4926da4d83D\"");
        console.log("  $rpcUrl = \"https://bsc-dataseed.binance.org/\"");
        console.log("  forge script script/ExecuteAfterDelay.s.sol:ExecuteAfterDelay --rpc-url $rpcUrl --broadcast --legacy");
        console.log("");
        console.log("This script will:");
        console.log("  - Show status of each operation (Scheduled/Executed/Ready)");
        console.log("  - Show readyAt timestamp for each");
        console.log("  - Execute any operations that are ready");
        console.log("  - Skip already-executed operations");
    }
}
