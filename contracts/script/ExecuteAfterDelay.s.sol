// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {CoreStorage} from "../src/CoreStorage.sol";

/// @notice Executes the scheduled timelock operations created by `script/deploy.sol`
/// after the 24h delay has passed (sets resolver + wires all facet selectors).
///
/// IMPORTANT:
/// - This script assumes a *fresh* deployment where the scheduling order is exactly
///   the one in `script/deploy.sol`.
/// - If you re-ran deploy or scheduled extra ops, the nonce order changes.
/// - Update the constants below if you redeploy.
contract ExecuteAfterDelay is Script {
    // ===== Update these after each redeploy =====
    address internal constant CORE_ROUTER = 0xE2BD9a1ac99B8215620628FC43838e4361D476a0;
    address internal constant RESOLVER    = 0x39FD1A9AE3556340D2aBfED7654F900db688b464;

    address internal constant MARKET_FACET     = 0x62ECF466B3AC466a9874d9dFA8F22a2E3Df73aa4;
    address internal constant TRADING_FACET    = 0x2188635103765aBD7b81fB9C71d44e38d79Aa405;
    address internal constant LIQUIDITY_FACET  = 0x2CF2d8818DE346d72925bBcbe52c056c64B4D320;
    address internal constant SETTLEMENT_FACET = 0x572B3607EbE805e9f7C18c0c19a17B8d185d2bf3;

    function run() external {
        string memory pkStr = vm.envString("PRIVATE_KEY");
        uint256 pk;
        if (bytes(pkStr).length >= 2 && bytes(pkStr)[0] == "0" && bytes(pkStr)[1] == "x") {
            pk = vm.parseUint(pkStr);
        } else {
            pk = vm.parseUint(string.concat("0x", pkStr));
        }

        SpeculateCoreRouter core = SpeculateCoreRouter(payable(CORE_ROUTER));

        bytes32 OP_SET_RESOLVER = keccak256("OP_SET_RESOLVER");
        bytes32 OP_SET_FACET    = keccak256("OP_SET_FACET");

        vm.startBroadcast(pk);

        uint256 nonce = 1;

        // 1) Set resolver (nonce 1)
        _tryExecuteResolver(core, OP_SET_RESOLVER, nonce, RESOLVER);
        nonce++;

        // 2) Facet wiring – must match deploy.sol order exactly
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)", MARKET_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "getMarketState(uint256)", MARKET_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "getMarketResolution(uint256)", MARKET_FACET);

        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "spotPriceYesE18(uint256)", TRADING_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "spotPriceYesE6(uint256)", TRADING_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "buy(uint256,bool,uint256,uint256)", TRADING_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "sell(uint256,bool,uint256,uint256)", TRADING_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "buy(uint256,bool,uint256,uint256,uint256)", TRADING_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "sell(uint256,bool,uint256,uint256,uint256)", TRADING_FACET);

        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "addLiquidity(uint256,uint256)", LIQUIDITY_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "claimLpFees(uint256)", LIQUIDITY_FACET);

        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "resolveMarketWithPrice(uint256,uint256)", SETTLEMENT_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "redeem(uint256,bool)", SETTLEMENT_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "pendingLpResidual(uint256,address)", SETTLEMENT_FACET);
        nonce = _tryExecuteFacet(core, OP_SET_FACET, nonce, "claimLpResidual(uint256)", SETTLEMENT_FACET);

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


