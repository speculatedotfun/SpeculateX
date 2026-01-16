// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";

interface IAdminFacetExecute {
    function executeSetUsdc(bytes32 opId, address newUsdc, uint8 newDecimals) external;
}

/// @notice Executes a scheduled USDC update via AdminFacet after timelock.
/// @dev Requires CORE_ROUTER, NEW_USDC, OP_ID env vars.
contract ExecuteSetUsdc is Script {
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
        address newUsdc = vm.envAddress("NEW_USDC");
        uint8 newDecimals = vm.envOr("NEW_USDC_DECIMALS", uint8(18));
        bytes32 opId = vm.envBytes32("OP_ID");

        SpeculateCoreRouter core = SpeculateCoreRouter(payable(coreAddr));
        IAdminFacetExecute adminCore = IAdminFacetExecute(coreAddr);

        vm.startBroadcast(pk);
        // executeSetUsdc is provided by the AdminFacet via delegatecall
        adminCore.executeSetUsdc(opId, newUsdc, newDecimals);
        vm.stopBroadcast();

        console2.log("Executed OP_SET_USDC.");
        console2.log("New USDC:");
        console2.logAddress(newUsdc);
        console2.log("New Decimals:");
        console2.logUint(newDecimals);
    }
}

