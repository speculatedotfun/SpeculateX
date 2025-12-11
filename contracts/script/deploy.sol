// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

// ייבוא החוזים - וודא שהנתיבים תואמים לתיקיית src שלך
import {Treasury} from "../src/Treasury.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {SpeculateCore} from "../src/SpeculateCore.sol";
import {ChainlinkResolver} from "../src/ChainlinkResolver.sol";

contract DeployScript is Script {
    // כתובות של Chainlink ב-BSC Testnet (לצורך דוגמה בשלב 4)
    address constant BTC_FEED_BSC_TESTNET = 0x5741306c21795FdCBb9b265Ea0255F499DFe515C;
    address constant ETH_FEED_BSC_TESTNET = 0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7;

    function run() public {
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        bytes memory pkBytes = bytes(privateKeyStr);
        if (pkBytes.length >= 2 && pkBytes[0] == bytes1("0") && pkBytes[1] == bytes1("x")) {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            deployerPrivateKey = vm.parseUint(string.concat("0x", privateKeyStr));
        }
        address deployer = vm.addr(deployerPrivateKey);
        
        // התחלת הקלטת הטרנזקציות לבלוקצ'יין
        vm.startBroadcast(deployerPrivateKey);

        // ====================================================
        // שלב 1: ספריות ותשתיות
        // ====================================================
        console.log("--- Step 1: Deploying Infrastructure ---");

        // 1. פריסת LMSRMath
        // הערה: LMSRMath היא ספריית פנימית ולכן Foundry מקשר אותה אוטומטית ואינה נפרסת כ-contract נפרד.
        console.log("LMSRMath is an internal library and is linked automatically (no separate address)");

        // 2. פריסת Treasury
        Treasury treasury = new Treasury(deployer);
        console.log("Treasury deployed to:", address(treasury));

        // 3. פריסת MockUSDC
        MockUSDC usdc = new MockUSDC(); 
        console.log("MockUSDC deployed to:", address(usdc));


        // ====================================================
        // שלב 2: הליבה (Core)
        // ====================================================
        console.log("--- Step 2: Deploying Core ---");

        // הערה לגבי Library Linking ב-Foundry:
        // Foundry מזהה אוטומטית שימוש ב-Libraries ומקשר אותם.
        // אם SpeculateCore משתמש ב-LMSRMath, הסקריפט ידע להשתמש בכתובת שכבר נפרסה
        // או לפרוס מחדש אם צריך (תלוי בהגדרה בחוזה).
        
        SpeculateCore core = new SpeculateCore(
            address(usdc),     // _usdc
            address(treasury)  // _treasury
        );
        console.log("SpeculateCore deployed to:", address(core));


        // ====================================================
        // שלב 3: הפותר (Resolver)
        // ====================================================
        console.log("--- Step 3: Deploying Resolver ---");

        ChainlinkResolver resolver = new ChainlinkResolver(
            address(core) // _core
        );
        console.log("ChainlinkResolver deployed to:", address(resolver));


        // ====================================================
        // שלב 4: חיבור והרשאות (Wiring)
        // ====================================================
        console.log("--- Step 4: Wiring & Permissions ---");

        // A. חיבור ה-Resolver ל-Core
        core.setChainlinkResolver(address(resolver));
        console.log("Core: setChainlinkResolver -> DONE");

        // B. הרשאות ל-MockUSDC (כדי שיוכלו לעשות Mint)
        usdc.setSpeculateCore(address(core));
        console.log("MockUSDC: setSpeculateCore -> DONE");
        
        // C. הוספת SpeculateCore כ-minter כדי שה-faucet יעבוד
        usdc.addMinter(address(core));
        console.log("MockUSDC: addMinter (SpeculateCore) -> DONE");

        // D. הגדרת Feeds ב-Resolver (דוגמה ל-BSC Testnet)
        // כאן אתה מגדיר איזה נכסים המערכת תומכת
        // feedId הוא bytes32 hash של המחרוזת (למשל keccak256("BTC/USD"))
        
        // דוגמה: BTC/USD feed
        bytes32 btcFeedId = keccak256("BTC/USD");
        resolver.setGlobalFeed(btcFeedId, BTC_FEED_BSC_TESTNET);
        console.log("Resolver: setGlobalFeed (BTC/USD) -> DONE");

        // דוגמה: ETH/USD feed
        bytes32 ethFeedId = keccak256("ETH/USD");
        resolver.setGlobalFeed(ethFeedId, ETH_FEED_BSC_TESTNET);
        console.log("Resolver: setGlobalFeed (ETH/USD) -> DONE");

        
        vm.stopBroadcast();
        
        // סיכום סופי לקונסול
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("Core Address:", address(core));
        console.log("Resolver Address:", address(resolver));
        console.log("USDC Address:", address(usdc));
        console.log("========================================");
    }
}