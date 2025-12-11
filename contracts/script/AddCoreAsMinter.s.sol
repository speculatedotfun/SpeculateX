// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

/**
 * @notice Script to add SpeculateCore as a minter on MockUSDC
 * @dev This allows SpeculateCore to mint USDC when faucet is called
 */
contract AddCoreAsMinter is Script {
    function run() external {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        bytes memory pkBytes = bytes(privateKeyStr);
        if (pkBytes.length >= 2 && pkBytes[0] == bytes1("0") && pkBytes[1] == bytes1("x")) {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyStr));
        }
        
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0x3ef0519a7c0EEe17894906cB0ecf72745C6BAf54));
        address coreAddress = vm.envOr("SPECULATE_CORE_ADDRESS", address(0x3D87bBADD7E465f7aE0Ce1F8747Db7fc76EeEBB8));
        
        MockUSDC usdc = MockUSDC(usdcAddress);
        
        console.log("=== Adding SpeculateCore as Minter ===");
        console.log("USDC Address:", usdcAddress);
        console.log("Core Address:", coreAddress);
        
        bool isAlreadyMinter = usdc.minters(coreAddress);
        console.log("Is Core already a minter?", isAlreadyMinter);
        
        if (isAlreadyMinter) {
            console.log("Core is already a minter!");
            return;
        }
        
        vm.startBroadcast(deployerPrivateKey);
        usdc.addMinter(coreAddress);
        vm.stopBroadcast();
        
        console.log("SUCCESS: SpeculateCore added as minter!");
        console.log("Now faucet function should work!");
    }
}

