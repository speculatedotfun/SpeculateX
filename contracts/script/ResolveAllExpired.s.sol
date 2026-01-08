// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IChainlinkResolver {
    function performUpkeep(bytes calldata performData) external;
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
}

contract ResolveAllExpired is Script {
    function run() external {
        address resolver = vm.envOr("RESOLVER_ADDRESS", address(0x5E4Bf042933B9f8ec0789F97Df8179558960b412));

        console.log("=== RESOLVE ALL EXPIRED MARKETS ===");
        console.log("Resolver:", resolver);

        IChainlinkResolver chainlinkResolver = IChainlinkResolver(resolver);

        // Get private key
        string memory pkString = vm.envString("PRIVATE_KEY_MAIN");

        // Add 0x prefix if not present
        if (bytes(pkString).length == 64) {
            pkString = string(abi.encodePacked("0x", pkString));
        }

        uint256 deployerPrivateKey = vm.parseUint(pkString);
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Keep resolving markets until none need resolution
        uint256 resolved = 0;
        for (uint256 i = 0; i < 50; i++) {
            (bool upkeepNeeded, bytes memory performData) = chainlinkResolver.checkUpkeep("");

            if (!upkeepNeeded) {
                console.log("No more markets need resolution!");
                break;
            }

            uint256 marketId = abi.decode(performData, (uint256));
            console.log("Resolving market:", marketId);

            chainlinkResolver.performUpkeep(performData);
            resolved++;
        }

        vm.stopBroadcast();

        console.log("=== COMPLETE ===");
        console.log("Total markets resolved:", resolved);
    }
}
