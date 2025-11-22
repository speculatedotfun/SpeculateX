// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/ChainlinkResolver.sol";
import "../src/SpeculateCore.sol";

/**
 * @title ConnectChainlinkToNewCore
 * @notice Connect Chainlink resolver to the new Core contract
 * @dev Either deploys a new resolver or uses existing one and connects it
 */
contract ConnectChainlinkToNewCore is Script {
    function run() external {
        string memory pkStr = vm.envString("PRIVATE_KEY");
        bytes memory bs = bytes(pkStr);
        uint256 key = (bs.length >= 2 && bs[0] == bytes1("0") && bs[1] == bytes1("x"))
            ? vm.parseUint(pkStr)
            : vm.parseUint(string(abi.encodePacked("0x", pkStr)));
        address deployer = vm.addr(key);
        vm.startBroadcast(key);

        console.log("\n=== CONNECTING CHAINLINK TO NEW CORE ===\n");
        console.log("Deployer:", deployer);

        // Get new Core address
        address newCoreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0xCd8EBd779bc4dD30e5343Ac6baFdBe66E286a512));
        require(newCoreAddress != address(0), "SPECULATE_CORE_ADDRESS not set");
        console.log("New SpeculateCore:", newCoreAddress);

        SpeculateCore core = SpeculateCore(newCoreAddress);

        // Check if deployer has admin role
        if (!core.hasRole(0x00, deployer)) {
            console.log("ERROR: Deployer does not have admin role on SpeculateCore!");
            vm.stopBroadcast();
            return;
        }

        // Deploy new resolver (core is immutable in resolver, so we need a new one)
        console.log("\n--- Deploying new ChainlinkResolver ---");
        ChainlinkResolver resolver = new ChainlinkResolver(newCoreAddress);
        console.log("ChainlinkResolver deployed at:", address(resolver));

        // Connect resolver to core
        console.log("\n--- Connecting resolver to Core ---");
        address currentResolver = core.chainlinkResolver();
        
        if (currentResolver == address(resolver)) {
            console.log("SUCCESS: Core already connected to resolver");
        } else {
            core.setChainlinkResolver(address(resolver));
            console.log("SUCCESS: Connected resolver to Core");
        }

        console.log("\n=== CONNECTION COMPLETE ===\n");
        console.log("SpeculateCore:", newCoreAddress);
        console.log("ChainlinkResolver:", address(resolver));
        console.log("Core.chainlinkResolver():", core.chainlinkResolver());
        console.log("Resolver.core():", address(resolver.core()));

        console.log("\nNext steps:");
        console.log("1. Update .env with: CHAINLINK_RESOLVER_ADDRESS=", address(resolver));
        console.log("2. Run SetupChainlinkFeeds.s.sol to register price feeds");
        console.log("3. Set up Chainlink Automation with resolver address");

        vm.stopBroadcast();
    }
}

