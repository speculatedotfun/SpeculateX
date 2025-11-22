// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/ChainlinkResolver.sol";
import "../src/SpeculateCore.sol";

/**
 * @title DeployAndConnectChainlink
 * @notice Deploy a fresh ChainlinkResolver and connect it to the Core contract
 * @dev This script will:
 * 1. Deploy a new ChainlinkResolver pointing to the Core
 * 2. Connect the resolver to the Core contract
 * 3. Output the addresses for manual feed setup
 */
contract DeployAndConnectChainlink is Script {
    function run() external {
        string memory pkStr = vm.envString("PRIVATE_KEY");
        bytes memory bs = bytes(pkStr);
        uint256 key = (bs.length >= 2 && bs[0] == bytes1("0") && bs[1] == bytes1("x"))
            ? vm.parseUint(pkStr)
            : vm.parseUint(string(abi.encodePacked("0x", pkStr)));
        address deployer = vm.addr(key);
        vm.startBroadcast(key);

        console.log("\n=== DEPLOYING AND CONNECTING CHAINLINK RESOLVER ===\n");
        console.log("Deployer:", deployer);

        // Get Core address
        address coreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0x62E390c9251186E394cEF754FbB42b8391331d0F));
        require(coreAddress != address(0), "SPECULATE_CORE_ADDRESS not set");
        console.log("SpeculateCore address:", coreAddress);

        SpeculateCore core = SpeculateCore(coreAddress);

        // Check if deployer has admin role
        if (!core.hasRole(0x00, deployer)) {
            console.log("ERROR: Deployer does not have admin role on SpeculateCore!");
            console.log("Deployer:", deployer);
            console.log("You need to grant admin role first.");
            vm.stopBroadcast();
            return;
        }

        // Deploy new ChainlinkResolver
        console.log("\n--- Deploying new ChainlinkResolver ---");
        ChainlinkResolver resolver = new ChainlinkResolver(coreAddress);
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

        console.log("\n=== DEPLOYMENT COMPLETE ===\n");
        console.log("SpeculateCore:", coreAddress);
        console.log("ChainlinkResolver:", address(resolver));
        console.log("Resolver Owner:", resolver.owner());
        console.log("Core.chainlinkResolver():", core.chainlinkResolver());
        console.log("Resolver.core():", address(resolver.core()));

        console.log("\n=== NEXT STEPS (Manual Setup) ===");
        console.log("1. Update frontend/lib/contracts.ts with:");
        console.log("   chainlinkResolver: '", address(resolver), "'");
        console.log("\n2. Set up Chainlink feeds on the resolver:");
        console.log("   - Go to BSC Testnet explorer");
        console.log("   - Connect to ChainlinkResolver:", address(resolver));
        console.log("   - Call setGlobalFeed() for each feed:");
        console.log("     * BTC/USD: 0x5741306c21795FdCBb9b265Ea0255F499DFe515C");
        console.log("     * ETH/USD: 0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7");
        console.log("     * BNB/USD: 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526");
        console.log("\n3. Set up Chainlink Automation:");
        console.log("   - Register upkeep with resolver address:", address(resolver));
        console.log("   - Fund with LINK tokens");

        vm.stopBroadcast();
    }
}

