// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {SpeculateCoreRouter} from "../src/SpeculateCoreRouter.sol";
import {AdminFacet} from "../src/facets/AdminFacet.sol";

/// @notice Deploys AdminFacet and schedules facet wiring via timelock.
/// @dev Requires CORE_ROUTER env var and admin key with DEFAULT_ADMIN_ROLE.
contract DeployAdminFacet is Script {
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
        SpeculateCoreRouter core = SpeculateCoreRouter(payable(coreAddr));

        vm.startBroadcast(pk);

        AdminFacet adminFacet = new AdminFacet();
        console2.log("AdminFacet deployed:", address(adminFacet));

        bytes32 OP_SET_FACET = keccak256("OP_SET_FACET");
        bytes4 selectorUsdc = bytes4(keccak256("executeSetUsdc(bytes32,address,uint8)"));
        bytes4 selectorLimits = bytes4(keccak256("executeSetLimits(bytes32,uint256,uint256,uint256)"));
        bytes4 selectorFees = bytes4(keccak256("executeSetFees(bytes32,uint16,uint16,uint16)"));
        bytes4 selectorPriceBand = bytes4(keccak256("executeSetPriceBandThreshold(bytes32,uint256)"));
        bytes4 selectorMaxJump = bytes4(keccak256("executeSetMaxInstantJump(bytes32,uint256)"));
        bytes4 selectorLpCooldown = bytes4(keccak256("executeSetLpFeeCooldown(bytes32,uint256)"));

        bytes32 opIdUsdc = core.scheduleOp(OP_SET_FACET, abi.encode(selectorUsdc, address(adminFacet)));
        bytes32 opIdLimits = core.scheduleOp(OP_SET_FACET, abi.encode(selectorLimits, address(adminFacet)));
        bytes32 opIdFees = core.scheduleOp(OP_SET_FACET, abi.encode(selectorFees, address(adminFacet)));
        bytes32 opIdPriceBand = core.scheduleOp(OP_SET_FACET, abi.encode(selectorPriceBand, address(adminFacet)));
        bytes32 opIdMaxJump = core.scheduleOp(OP_SET_FACET, abi.encode(selectorMaxJump, address(adminFacet)));
        bytes32 opIdLpCooldown = core.scheduleOp(OP_SET_FACET, abi.encode(selectorLpCooldown, address(adminFacet)));

        console2.log("Scheduled OP_SET_FACET opIds:");
        console2.logBytes32(opIdUsdc);
        console2.logBytes32(opIdLimits);
        console2.logBytes32(opIdFees);
        console2.logBytes32(opIdPriceBand);
        console2.logBytes32(opIdMaxJump);
        console2.logBytes32(opIdLpCooldown);
        console2.log("Facet address:");
        console2.logAddress(address(adminFacet));

        vm.stopBroadcast();
    }
}

