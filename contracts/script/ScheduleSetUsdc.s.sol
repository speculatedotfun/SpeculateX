// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";

/// @notice Schedules a USDC update via timelock (must be executed via AdminFacet later).
/// @dev Requires CORE_ROUTER and NEW_USDC env vars.
contract ScheduleSetUsdc is Script {
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

        SpeculateCoreRouter core = SpeculateCoreRouter(payable(coreAddr));
        bytes32 OP_SET_USDC = keccak256("OP_SET_USDC");

        vm.startBroadcast(pk);
        bytes32 opId = core.scheduleOp(OP_SET_USDC, abi.encode(newUsdc, newDecimals));
        vm.stopBroadcast();

        console2.log("Scheduled OP_SET_USDC opId:");
        console2.logBytes32(opId);
        console2.log("New USDC:");
        console2.logAddress(newUsdc);
        console2.log("New Decimals:");
        console2.logUint(newDecimals);
    }
}

