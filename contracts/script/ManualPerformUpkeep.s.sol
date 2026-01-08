// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IChainlinkResolver {
    function performUpkeep(bytes calldata performData) external;
    function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);
}

contract ManualPerformUpkeep is Script {
    function run() external {
        // Get resolver address
        address resolver = vm.envOr("RESOLVER_ADDRESS", address(0x5E4Bf042933B9f8ec0789F97Df8179558960b412));

        // Get market ID to resolve (default to 0 for auto-scan)
        uint256 marketId = vm.envOr("MARKET_ID", uint256(0));

        console.log("=== MANUAL PERFORM UPKEEP ===");
        console.log("Resolver:", resolver);
        console.log("Market ID:", marketId);

        IChainlinkResolver chainlinkResolver = IChainlinkResolver(resolver);

        // Check upkeep first
        bytes memory checkData = marketId == 0 ? new bytes(0) : abi.encode(marketId);
        (bool upkeepNeeded, bytes memory performData) = chainlinkResolver.checkUpkeep(checkData);

        console.log("Upkeep needed:", upkeepNeeded);

        if (!upkeepNeeded) {
            console.log("No upkeep needed!");
            return;
        }

        // Decode the market ID from performData
        uint256 resolveMarketId = abi.decode(performData, (uint256));
        console.log("Market to resolve:", resolveMarketId);

        // Get private key and perform upkeep
        string memory pkString = vm.envString("PRIVATE_KEY_MAIN");
        uint256 deployerPrivateKey = vm.parseUint(pkString);
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        chainlinkResolver.performUpkeep(performData);

        vm.stopBroadcast();

        console.log("=== UPKEEP PERFORMED ===");
        console.log("Market", resolveMarketId, "resolved successfully!");
    }
}
