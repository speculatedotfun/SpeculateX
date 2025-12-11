// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Treasury} from "../src/Treasury.sol";
import {SpeculateCore} from "../src/SpeculateCore.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";

/**
 * @title DeployMainnet
 * @notice Deploy all contracts to BSC Mainnet
 * @dev IMPORTANT: Uses REAL USDC address, NOT MockUSDC!
 * 
 * BEFORE DEPLOYING:
 * 1. Verify all Chainlink feed addresses are correct (check docs.chain.link)
 * 2. Ensure you have BNB for gas
 * 3. Use a dedicated deployment wallet (not your main wallet)
 * 4. Consider using a hardware wallet or multisig
 */
contract DeployMainnet is Script {
    // Official USDC address on BSC Mainnet (Bridged USDC)
    address constant USDC_BSC = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
    
    // Chainlink Price Feeds on BSC Mainnet
    // CRITICAL: VERIFY THESE ADDRESSES before deployment!
    // Check official addresses at: https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain
    // 
    // These addresses are from common sources but MUST be verified:
    // 1. Go to: https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain
    // 2. Search for "BTC/USD", "ETH/USD", "BNB/USD"
    // 3. Copy the correct addresses and update below
    //
    // Current addresses (VERIFY THESE!):
    address constant CL_BTC_USD = 0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf;
    address constant CL_ETH_USD = 0x9eF1b8c0E4F7dc8bF36B6Fb137B0c48bA715B9c8;
    address constant CL_BNB_USD = 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE;

    function run() external {
        // Get deployer private key from environment
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        if (bytes(privateKeyStr)[0] == bytes1("0") && bytes(privateKeyStr)[1] == bytes1("x")) {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            string memory keyWithPrefix = string.concat("0x", privateKeyStr);
            deployerPrivateKey = vm.parseUint(keyWithPrefix);
        }
        
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("\n=== DEPLOYING TO BSC MAINNET ===");
        console.log("Deployer address:", deployer);
        console.log("USDC address:", USDC_BSC);
        console.log("BTC/USD Feed:", CL_BTC_USD);
        console.log("ETH/USD Feed:", CL_ETH_USD);
        console.log("BNB/USD Feed:", CL_BNB_USD);
        console.log("\nWARNING: This will deploy to MAINNET and cost real BNB!");
        console.log("Press Ctrl+C to cancel, or wait 5 seconds...\n");
        
        // Small delay to allow cancellation
        vm.sleep(5000);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ====================================================
        // שלב 1: ספריות ותשתיות
        // ====================================================
        console.log("\n--- Step 1: Deploying Infrastructure ---");
        
        // הערה: LMSRMath היא ספריית פנימית ולכן Foundry מקשר אותה אוטומטית
        console.log("INFO: LMSRMath is an internal library (linked automatically)");
        
        // 1. פריסת Treasury
        Treasury treasury = new Treasury(deployer);
        console.log("[OK] Treasury deployed to:", address(treasury));
        
        // הערה: ב-Mainnet אין צורך ב-MockUSDC - משתמשים ב-USDC אמיתי
        console.log("INFO: Using existing USDC (no MockUSDC deployment needed)");
        console.log("   USDC Address:", USDC_BSC);
        
        // ====================================================
        // שלב 2: הליבה (Core)
        // ====================================================
        console.log("\n--- Step 2: Deploying Core ---");
        
        SpeculateCore core = new SpeculateCore(
            USDC_BSC,              // _usdc (REAL USDC!)
            address(treasury)      // _treasury
        );
        console.log("[OK] SpeculateCore deployed to:", address(core));
        
        // ====================================================
        // שלב 3: הפותר (Resolver)
        // ====================================================
        console.log("\n--- Step 3: Deploying Resolver ---");
        
        ChainlinkResolver resolver = new ChainlinkResolver(address(core));
        console.log("[OK] ChainlinkResolver deployed to:", address(resolver));
        
        // 4. Wire contracts together
        console.log("\n--- Step 4: Wiring & Permissions ---");
        
        // A. חיבור ה-Resolver ל-Core
        core.setChainlinkResolver(address(resolver));
        console.log("[OK] Core: setChainlinkResolver -> DONE");
        
        // B. הערה: ב-Mainnet אין צורך ב-MockUSDC setup
        // ב-Testnet היינו עושים:
        //   - usdc.setSpeculateCore(address(core))
        //   - usdc.addMinter(address(core))
        // אבל ב-Mainnet יש USDC אמיתי (0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d)
        // שמשתמשים צריכים להביא בעצמם - אין faucet!
        console.log("INFO: Note: Using real USDC (no MockUSDC setup needed)");
        
        // C. הגדרת Feeds ב-Resolver
        // כאן אתה מגדיר איזה נכסים המערכת תומכת
        // feedId הוא bytes32 hash של המחרוזת (למשל keccak256("BTC/USD"))
        console.log("\n--- Step 5: Registering price feeds ---");
        
        bytes32 btcFeedId = keccak256("BTC/USD");
        resolver.setGlobalFeed(btcFeedId, CL_BTC_USD);
        console.log("[OK] Resolver: setGlobalFeed (BTC/USD) -> DONE");
        
        bytes32 ethFeedId = keccak256("ETH/USD");
        resolver.setGlobalFeed(ethFeedId, CL_ETH_USD);
        console.log("[OK] Resolver: setGlobalFeed (ETH/USD) -> DONE");
        
        bytes32 bnbFeedId = keccak256("BNB/USD");
        resolver.setGlobalFeed(bnbFeedId, CL_BNB_USD);
        console.log("[OK] Resolver: setGlobalFeed (BNB/USD) -> DONE");
        
        vm.stopBroadcast();
        
        // Print summary
        console.log("\n========================================");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("========================================");
        console.log("Treasury Address:", address(treasury));
        console.log("SpeculateCore Address:", address(core));
        console.log("ChainlinkResolver Address:", address(resolver));
        console.log("USDC Address (existing):", USDC_BSC);
        console.log("========================================");
        console.log("\nNEXT STEPS:");
        console.log("1. Verify contracts on BscScan");
        console.log("2. Transfer ownership to Gnosis Safe (multisig)");
        console.log("3. Register ChainlinkResolver in Chainlink Automation");
        console.log("4. Update frontend with new addresses");
        console.log("5. Test with small market first!");
        console.log("\nIMPORTANT: Save these addresses to your .env file!");
        console.log("   SPECULATE_CORE_ADDRESS=", address(core));
        console.log("   CHAINLINK_RESOLVER_ADDRESS=", address(resolver));
        console.log("   TREASURY_ADDRESS=", address(treasury));
    }
}

