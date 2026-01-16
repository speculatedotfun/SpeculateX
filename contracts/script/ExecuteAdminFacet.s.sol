// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";

/// @notice Executes the facet wiring op for AdminFacet after timelock.
    /// @dev Requires CORE_ROUTER, ADMIN_FACET, OP_ID, SELECTOR_SIG env vars.
contract ExecuteAdminFacet is Script {
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
        address adminFacetAddr = vm.envAddress("ADMIN_FACET");
        bytes32 opId = vm.envBytes32("OP_ID");
        string memory selectorSig = vm.envString("SELECTOR_SIG");

        SpeculateCoreRouter core = SpeculateCoreRouter(payable(coreAddr));
        bytes4 selector = bytes4(keccak256(bytes(selectorSig)));

        vm.startBroadcast(pk);
        core.executeSetFacet(opId, selector, adminFacetAddr);
        vm.stopBroadcast();

        console2.log("AdminFacet wired via executeSetFacet.");
        console2.log("Selector:");
        console2.logBytes4(selector);
        console2.log("Facet:");
        console2.logAddress(adminFacetAddr);
    }
}

