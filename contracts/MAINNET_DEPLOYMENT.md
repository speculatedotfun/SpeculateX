# 🚀 SpeculateX: תוכנית עלייה ל-Mainnet (BSC)

## ✅ מה כבר הושלם:

### שלב 1: הכנות וקונפיגורציה
- [x] עדכון `foundry.toml` - הוספת `bsc_mainnet` profile
- [x] הגדרת `optimizer_runs = 200` לחיסכון בגז
- [x] יצירת `DeployMainnet.s.sol` עם כתובות אמיתיות

### שלב 2: כתיבת סקריפט פריסה
- [x] קובץ `DeployMainnet.s.sol` נוצר עם:
  - כתובת USDC אמיתית ב-BSC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
  - כתובות Chainlink Price Feeds (צריך לוודא!)
  - פריסה מלאה: Treasury → SpeculateCore → ChainlinkResolver
  - חיבור אוטומטי של כל החוזים

## ⚠️ לפני פריסה - בדיקות קריטיות:

### 1. עדכון משתני סביבה (`.env`)
צור או עדכן קובץ `.env` בתיקיית `contracts/`:

```bash
# BSC Mainnet RPC (QuickNode, Alchemy, או Infura)
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org/
# או RPC מהיר יותר:
# BSC_MAINNET_RPC_URL=https://your-quicknode-url.com

# BscScan API Key (לאימות חוזים)
BSCSCAN_API_KEY=your_bscscan_api_key_here

# Private Key של ארנק הפריסה (⚠️ אבטחה!)
PRIVATE_KEY=your_deployment_wallet_private_key
```

**⚠️ אבטחה קריטית:**
- השתמש בארנק פריסה ייעודי ("Burner Wallet")
- אל תשתמש בארנק הראשי שלך!
- שקול שימוש ב-Ledger/Trezor עם `--ledger` flag

### 2. אימות כתובות Chainlink ⚠️ **קריטי!**

**חובה לבדוק לפני פריסה!**

1. פתח את הדוקומנטציה הרשמית:
   https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain

2. בחר "BNB Chain Mainnet" מהתפריט

3. חפש את הכתובות הבאות בטבלה:
   - **BTC/USD** - חפש "BTC" או "Bitcoin"
   - **ETH/USD** - חפש "ETH" או "Ethereum"  
   - **BNB/USD** - חפש "BNB" או "Binance Coin"

4. העתק את הכתובות המדויקות ועדכן אותן ב-`DeployMainnet.s.sol`

**הכתובות הנוכחיות בקוד (צריך לוודא!):**
- BTC/USD: `0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf`
- ETH/USD: `0x9ef1B8c0E4F7dc8bF36b6fb137B0C48Ba715B9c8`
- BNB/USD: `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`

**אלטרנטיבה:** בדוק ישירות ב-BscScan:
- חפש את הכתובות ב: https://bscscan.com/
- וודא שהן חוזי Chainlink AggregatorV3Interface תקינים

### 3. בדיקת יתרת BNB
וודא שיש מספיק BNB בארנק הפריסה:
- פריסת Treasury: ~0.01 BNB
- פריסת SpeculateCore: ~0.05 BNB
- פריסת ChainlinkResolver: ~0.03 BNB
- אימות חוזים: ~0.01 BNB
- **סה"כ מומלץ: 0.2-0.3 BNB** (למקרה של בעיות)

## 📋 שלבים לפריסה:

### שלב 3.1: סימולציה (Dry Run) - **חובה לפני פריסה אמיתית!**

```bash
cd contracts
forge script script/DeployMainnet.s.sol:DeployMainnet --rpc-url bsc_mainnet
```

זה יראה:
- עלויות גז משוערות
- כתובות שייווצרו
- **לא ישלח שום דבר לבלוקצ'יין!**

### שלב 3.2: פריסה אמיתית (⚠️ זה יעלה כסף!)

אם הסימולציה עברה בהצלחה:

```bash
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url bsc_mainnet \
  --broadcast \
  --verify
```

**שמור את הכתובות שמתקבלות בלוג!**

### שלב 4: עדכון Frontend

לאחר הפריסה, עדכן את `frontend/lib/contracts.ts`:

```typescript
export const addresses = {
  core: "0x...", // כתובת SpeculateCore החדשה
  chainlinkResolver: "0x...", // כתובת ChainlinkResolver החדשה
  usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC אמיתי
  treasury: "0x...", // כתובת Treasury החדשה
};

export const chainId = 56; // BSC Mainnet (לא 97!)
```

**הסרת Faucet:**
- הסר או הסתר את `MintUsdcForm` מהממשק
- אין Faucet ב-Mainnet!

### שלב 5: אבטחה (קריטי!)

#### 5.1. העברת בעלות ל-Gnosis Safe

**⚠️ זה חיוני!** כרגע הארנק הפרטי שלך שולט בחוזים.

1. צור Gnosis Safe ב-BSC Mainnet: https://app.safe.global/
2. העבר בעלות:

```solidity
// על Treasury
treasury.transferOwnership(safeAddress);

// על SpeculateCore
core.grantRole(core.DEFAULT_ADMIN_ROLE(), safeAddress);
core.renounceRole(core.DEFAULT_ADMIN_ROLE(), deployerAddress);

// על ChainlinkResolver
resolver.transferOwnership(safeAddress);
```

#### 5.2. Chainlink Automation

1. רשום את `ChainlinkResolver` ב-Chainlink Automation Registry
2. וודא שיש מספיק LINK ב-Upkeep
3. בדוק שהכל עובד: https://automation.chain.link/

#### 5.3. בדיקת שפיות

1. צור שוק קטן (10-20 USDC)
2. קנה פוזיציה משני צדדים
3. וודא שהנזילות נראית תקינה
4. וודא שהעמלות מגיעות ל-Treasury

## 📝 רשימת בדיקה סופית:

- [ ] משתני סביבה מוגדרים (`.env`)
- [ ] כתובות Chainlink אומתו
- [ ] יש מספיק BNB בארנק
- [ ] סימולציה עברה בהצלחה
- [ ] חוזים נפרסו ואומתו ב-BscScan
- [ ] Frontend עודכן עם כתובות חדשות
- [ ] Faucet הוסר מהממשק
- [ ] Gnosis Safe נוצר ובעלות הועברה
- [ ] Chainlink Automation מוגדר
- [ ] בדיקת שפיות עברה בהצלחה

## 🔗 קישורים שימושיים:

- BscScan: https://bscscan.com/
- Chainlink Price Feeds: https://docs.chain.link/data-feeds/price-feeds/addresses
- Chainlink Automation: https://automation.chain.link/
- Gnosis Safe: https://app.safe.global/
- BSC RPC: https://docs.bnbchain.org/docs/rpc

## ⚠️ אזהרות חשובות:

1. **אל תפרוס עם ארנק ראשי** - השתמש בארנק ייעודי
2. **בדוק כתובות Chainlink** - הן חייבות להיות נכונות
3. **העבר בעלות ל-Multisig** - אל תשאיר בעלות בארנק חם
4. **בדוק עם סכומים קטנים** - לפני שימוש בקנה מידה גדול
5. **שמור גיבויים** - שמור את כל הכתובות והמפתחות במקום בטוח

---

**תאריך עדכון אחרון:** $(date)
**גרסת קוד:** v1.0.0

