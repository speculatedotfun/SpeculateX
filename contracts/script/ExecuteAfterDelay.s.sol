// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {CoreStorage} from "../src/CoreStorage.sol";

/// @notice Executes the scheduled timelock operations created by `script/deploy.sol`
/// after the delay has passed (sets resolver + wires all facet selectors).
///
/// IMPORTANT:
/// - This script assumes a *fresh* deployment where the scheduling order is exactly
///   the one in `script/deploy.sol`.
/// - If you re-ran deploy or scheduled extra ops, the nonce order changes.
/// - Prefer setting addresses via environment variables instead of hardcoding.
contract ExecuteAfterDelay is Script {
    // ===== Provide these via env (recommended) =====
    // CORE_ROUTER=0x...
    // RESOLVER=0x...
    // MARKET_FACET=0x...
    // TRADING_FACET=0x...
    // LIQUIDITY_FACET=0x...
    // SETTLEMENT_FACET=0x...

    function run() external {
        // Support both PRIVATE_KEY_MAIN (preferred) and PRIVATE_KEY (legacy)
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
        bytes32 OP_SET_FACET    = keccak256("OP_SET_FACET");

        vm.startBroadcast(pk);

        uint256 nonce = 1;

        // 1) Set resolver (nonce 1)
        _tryExecuteResolver(core, OP_SET_RESOLVER, nonce, resolverAddr);
        nonce++;

        // 2) Facet wiring – must match deploy.sol order exactly
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", marketFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "getMarketState(uint256)", marketFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "getMarketResolution(uint256)", marketFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "getMarketQuestion(uint256)", marketFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "getMarketInvariants(uint256)", marketFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "getMarketTokens(uint256)", marketFacetAddr);

        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "spotPriceYesE18(uint256)", tradingFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "spotPriceYesE6(uint256)", tradingFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "getMaxJumpE18(uint256)", tradingFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "buy(uint256,bool,uint256,uint256)", tradingFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "sell(uint256,bool,uint256,uint256)", tradingFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "buy(uint256,bool,uint256,uint256,uint256)", tradingFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "sell(uint256,bool,uint256,uint256,uint256)", tradingFacetAddr);

        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "addLiquidity(uint256,uint256)", liquidityFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "removeLiquidity(uint256,uint256)", liquidityFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "claimLpFees(uint256)", liquidityFacetAddr);

        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "resolveMarketWithPrice(uint256,uint256)", settlementFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "emergencyCancelMarket(bytes32,uint256)", settlementFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "redeem(uint256,bool)", settlementFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "pendingLpResidual(uint256,address)", settlementFacetAddr);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "claimLpResidual(uint256)", settlementFacetAddr);

        vm.stopBroadcast();

        console2.log("Done. If some ops were not ready, re-run after the timelock expires.");
    }

    function _opId(bytes32 tag, bytes memory data, uint256 nonce) internal pure returns (bytes32) {
        return keccak256(abi.encode("CORE_OP_V1", tag, keccak256(data), nonce));
    }

    function _statusName(CoreStorage.OpStatus status) internal pure returns (string memory) {
        if (status == CoreStorage.OpStatus.None) return "None";
        if (status == CoreStorage.OpStatus.Scheduled) return "Scheduled";
        if (status == CoreStorage.OpStatus.Executed) return "Executed";
        if (status == CoreStorage.OpStatus.Cancelled) return "Cancelled";
        return "Unknown";
    }

    function _tryExecuteResolver(
        SpeculateCoreRouter core,
        bytes32 OP_SET_RESOLVER,
        uint256 nonce,
        address resolver
    ) internal {
        bytes memory data = abi.encode(resolver);
        bytes32 opId = _opId(OP_SET_RESOLVER, data, nonce);

        (bytes32 tag, , uint256 readyAt, CoreStorage.OpStatus status) = core.ops(opId);
        console2.log("Resolver opId:");
        console2.logBytes32(opId);
        console2.log("  status:");
        console2.log(_statusName(status));
        console2.log("  readyAt:");
        console2.logUint(readyAt);

        if (status != CoreStorage.OpStatus.Scheduled) return; // not scheduled
        if (block.timestamp < readyAt) return;
        if (tag != OP_SET_RESOLVER) return;

        core.executeSetResolver(opId, resolver);
        console2.log("  executed setResolver");
    }

    function _tryExecuteFacet(
        SpeculateCoreRouter core,
        bytes32 OP_SET_FACET,
        uint256 nonce,
        string memory sig,
        address facet
    ) internal returns (uint256 nextNonce) {
        bytes4 selector = bytes4(keccak256(bytes(sig)));
        bytes memory data = abi.encode(selector, facet);
        bytes32 opId = _opId(OP_SET_FACET, data, nonce);

        (bytes32 tag, , uint256 readyAt, CoreStorage.OpStatus status) = core.ops(opId);
        console2.log("Facet op:");
        console2.log(sig);
        console2.log("  selector:");
        console2.logBytes4(selector);
        console2.log("  facet:");
        console2.logAddress(facet);
        console2.log("  opId:");
        console2.logBytes32(opId);
        console2.log("  status:");
        console2.log(_statusName(status));
        console2.log("  readyAt:");
        console2.logUint(readyAt);

        if (status == CoreStorage.OpStatus.Scheduled && block.timestamp >= readyAt && tag == OP_SET_FACET) {
            core.executeSetFacet(opId, selector, facet);
            console2.log("  executed setFacet");
        }

        return nonce + 1;
    }
}


