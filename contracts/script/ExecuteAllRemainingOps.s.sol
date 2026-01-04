// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {CoreStorage} from "../src/CoreStorage.sol";

/// @notice Executes ALL remaining scheduled operations by trying all possible nonces
/// This script will attempt to find and execute operations that ExecuteAfterDelay missed
contract ExecuteAllRemainingOps is Script {
    function run() external {
        string memory pkStr;
        try vm.envString("PRIVATE_KEY_MAIN") returns (string memory s) {
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

        address coreAddr = vm.envAddress("CORE_ROUTER");
        address resolverAddr = vm.envAddress("RESOLVER");
        address marketFacetAddr = vm.envAddress("MARKET_FACET");
        address tradingFacetAddr = vm.envAddress("TRADING_FACET");
        address liquidityFacetAddr = vm.envAddress("LIQUIDITY_FACET");
        address settlementFacetAddr = vm.envAddress("SETTLEMENT_FACET");

        SpeculateCoreRouter core = SpeculateCoreRouter(payable(coreAddr));

        bytes32 OP_SET_RESOLVER = keccak256("OP_SET_RESOLVER");
        bytes32 OP_SET_FACET = keccak256("OP_SET_FACET");

        vm.startBroadcast(pk);

        console2.log("=== EXECUTING ALL REMAINING OPERATIONS ===");
        console2.log("");

        // Try all operations with their expected nonces (starting from 1)
        // We'll try nonces 1-25 to cover all operations
        
        uint256 executedCount = 0;
        
        // Operation list matching deploy.sol order
        // Nonce 1: Resolver (already executed, skip)
        
        // MarketFacet operations (nonces 2-8)
        _tryExecuteFacet(core, OP_SET_FACET, 2, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", marketFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 3, "createScheduledMarket(string,string,string,string,string,uint256,uint256,uint256,address,bytes32,uint256,uint8)", marketFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 4, "getMarketState(uint256)", marketFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 5, "getMarketResolution(uint256)", marketFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 6, "getMarketQuestion(uint256)", marketFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 7, "getMarketInvariants(uint256)", marketFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 8, "getMarketTokens(uint256)", marketFacetAddr, executedCount);

        // TradingFacet operations (nonces 9-14)
        _tryExecuteFacet(core, OP_SET_FACET, 9, "spotPriceYesE18(uint256)", tradingFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 10, "spotPriceYesE6(uint256)", tradingFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 11, "getMaxJumpE18(uint256)", tradingFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 12, "buy(uint256,bool,uint256,uint256)", tradingFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 13, "sell(uint256,bool,uint256,uint256)", tradingFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 14, "buy(uint256,bool,uint256,uint256,uint256)", tradingFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 15, "sell(uint256,bool,uint256,uint256,uint256)", tradingFacetAddr, executedCount);

        // LiquidityFacet operations (nonces 16-18)
        _tryExecuteFacet(core, OP_SET_FACET, 16, "addLiquidity(uint256,uint256)", liquidityFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 17, "removeLiquidity(uint256,uint256)", liquidityFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 18, "claimLpFees(uint256)", liquidityFacetAddr, executedCount);

        // SettlementFacet operations (nonces 19-23)
        _tryExecuteFacet(core, OP_SET_FACET, 19, "resolveMarketWithPrice(uint256,uint256)", settlementFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 20, "emergencyCancelMarket(bytes32,uint256)", settlementFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 21, "redeem(uint256,bool)", settlementFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 22, "pendingLpResidual(uint256,address)", settlementFacetAddr, executedCount);
        _tryExecuteFacet(core, OP_SET_FACET, 23, "claimLpResidual(uint256)", settlementFacetAddr, executedCount);

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== SUMMARY ===");
        console2.log("Total operations executed:", executedCount);
    }

    function _opId(bytes32 tag, bytes memory data, uint256 nonce) internal pure returns (bytes32) {
        return keccak256(abi.encode("CORE_OP_V1", tag, keccak256(data), nonce));
    }

    function _tryExecuteFacet(
        SpeculateCoreRouter core,
        bytes32 OP_SET_FACET,
        uint256 nonce,
        string memory sig,
        address facet,
        uint256 executedCount
    ) internal returns (uint256) {
        bytes4 selector = bytes4(keccak256(bytes(sig)));
        bytes memory data = abi.encode(selector, facet);
        bytes32 opId = _opId(OP_SET_FACET, data, nonce);

        (bytes32 tag, , uint256 readyAt, CoreStorage.OpStatus status) = core.ops(opId);

        if (status == CoreStorage.OpStatus.Scheduled && block.timestamp >= readyAt && tag == OP_SET_FACET) {
            console2.log("Executing:");
            console2.log(sig);
            console2.log("  opId:");
            console2.logBytes32(opId);
            core.executeSetFacet(opId, selector, facet);
            console2.log("  Executed");
            console2.log("");
            return executedCount + 1;
        } else if (status == CoreStorage.OpStatus.Executed) {
            // Already executed, skip
            return executedCount;
        } else {
            // Not scheduled or not ready
            return executedCount;
        }
    }
}

