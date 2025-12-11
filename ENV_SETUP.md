# 📝 Environment Variables Setup Guide

מדריך מפורט להגדרת משתני סביבה לפרויקט SpeculateX.

## 📁 קבצי .env

הפרויקט משתמש בשני קבצי `.env` נפרדים:

1. **`contracts/.env`** - למשתני סביבה של Smart Contracts (Foundry)
2. **`frontend/.env.local`** - למשתני סביבה של Frontend (Next.js)

---

## 🔧 Contracts `.env` (contracts/.env)

קובץ זה משמש לפריסת חוזים חכמים.

### משתנים חובה (Required)

```bash
# Private Key של ארנק הפריסה
# ⚠️ אבטחה: השתמש בארנק ייעודי, לא בארנק הראשי שלך!
PRIVATE_KEY=your_private_key_here

# RPC URL ל-BSC Testnet
BSC_TESTNET_RPC_URL=https://bsc-testnet.publicnode.com

# RPC URL ל-BSC Mainnet (לפריסה ל-Mainnet)
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org

# BscScan API Key (לאימות חוזים)
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

### משתנים אופציונליים (Optional)

```bash
# כתובות Mainnet (לאחר פריסה)
USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
SPECULATE_CORE_ADDRESS=0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725
CHAINLINK_RESOLVER_ADDRESS=0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3
TREASURY_ADDRESS=0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778

# כתובות Testnet (לאחר פריסה)
# SPECULATE_CORE_ADDRESS=0x297f325e98DdFd682dd2dc964a5BEda9861D54D5
# CHAINLINK_RESOLVER_ADDRESS=0x363eaff32ba46F804Bc7E6352A585A705ac97aBD
# USDC_ADDRESS=0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e
```

### איך להשיג את הערכים?

1. **PRIVATE_KEY**: המפתח הפרטי של ארנק הפריסה שלך
   - ⚠️ **אבטחה קריטית**: אל תשתמש בארנק הראשי שלך!
   - צור ארנק חדש רק לפריסה

2. **BSC_TESTNET_RPC_URL**: 
   - חינם: `https://bsc-testnet.publicnode.com`
   - מהיר יותר: QuickNode, Alchemy (שירותים בתשלום)

3. **BSC_MAINNET_RPC_URL**:
   - חינם: `https://bsc-dataseed.binance.org` (איטי, מוגבל)
   - מומלץ: QuickNode, Alchemy, Infura (שירותים בתשלום)

4. **BSCSCAN_API_KEY**:
   - הירשם ב: https://bscscan.com/apis
   - צור API Key חדש (חינם)
   - העתק את ה-Key

---

## 🎨 Frontend `.env.local` (frontend/.env.local)

קובץ זה משמש להגדרות Frontend.

### משתנים חובה (Required)

```bash
# WalletConnect Project ID
# הירשם ב: https://cloud.walletconnect.com/
# צור פרויקט חדש והעתק את Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

### משתנים אופציונליים (Optional)

```bash
# RPC URLs (אופציונלי - יש ברירות מחדל)
NEXT_PUBLIC_RPC_URL=https://bsc-testnet.publicnode.com
NEXT_PUBLIC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org

# Subgraph URLs (אופציונלי - יש ברירות מחדל)
NEXT_PUBLIC_GOLDSKY_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-v2/production/gn
NEXT_PUBLIC_GOLDSKY_WS_URL=

# כתובות חוזים (אופציונלי - יש ברירות מחדל בקוד)
# NEXT_PUBLIC_CORE_ADDRESS=
# NEXT_PUBLIC_USDC_ADDRESS=
# NEXT_PUBLIC_CHAINLINK_RESOLVER_ADDRESS=
```

### איך להשיג את הערכים?

1. **NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID**:
   - הירשם ב: https://cloud.walletconnect.com/
   - צור פרויקט חדש
   - העתק את Project ID

2. **RPC URLs**: 
   - אותו דבר כמו ב-Contracts
   - מומלץ להשתמש ב-RPC מהיר יותר ל-Mainnet

---

## 📋 דוגמה מלאה

### `contracts/.env`

```bash
# Private Key (ארנק ייעודי לפריסה)
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# RPC URLs
BSC_TESTNET_RPC_URL=https://bsc-testnet.publicnode.com
BSC_MAINNET_RPC_URL=https://your-quicknode-url.bsc-mainnet.quiknode.pro/your-key/

# BscScan API
BSCSCAN_API_KEY=ABC123XYZ789

# כתובות Mainnet (לאחר פריסה - נפרס היום!)
USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
SPECULATE_CORE_ADDRESS=0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725
CHAINLINK_RESOLVER_ADDRESS=0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3
TREASURY_ADDRESS=0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778

# כתובות Testnet (אופציונלי)
# SPECULATE_CORE_ADDRESS=0x297f325e98DdFd682dd2dc964a5BEda9861D54D5
# CHAINLINK_RESOLVER_ADDRESS=0x363eaff32ba46F804Bc7E6352A585A705ac97aBD
# USDC_ADDRESS=0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e
```

### `frontend/.env.local`

```bash
# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=abc123def456ghi789

# RPC URLs (אופציונלי)
NEXT_PUBLIC_RPC_URL=https://bsc-testnet.publicnode.com
NEXT_PUBLIC_MAINNET_RPC_URL=https://your-quicknode-url.bsc-mainnet.quiknode.pro/your-key/

# Subgraph (אופציונלי)
NEXT_PUBLIC_GOLDSKY_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-v2/production/gn
```

---

## ⚠️ אבטחה

1. **אל תעלה את `.env` ל-Git!**
   - הקבצים `.env.example` הם בטוחים להעלאה
   - הקבצים `.env` ו-`.env.local` צריכים להיות ב-`.gitignore`

2. **Private Keys**:
   - ⚠️ **לעולם אל תשתף את המפתח הפרטי שלך!**
   - השתמש בארנק ייעודי לפריסה
   - אל תשתמש בארנק הראשי שלך

3. **API Keys**:
   - BscScan API Key - חינם, אבל הגבל את השימוש
   - WalletConnect Project ID - לא רגיש, אבל עדיף לא לשתף

---

## ✅ בדיקת הגדרות

### בדיקת Contracts

```bash
cd contracts
# בדוק שהמשתנים נטענו
forge script script/CheckAddress.s.sol --rpc-url bsc_testnet
```

### בדיקת Frontend

```bash
cd frontend
# הרץ את השרת ובדוק שהכל עובד
npm run dev
```

---

## 📝 הערות

1. **כתובות חוזים**: רוב הכתובות כבר מוגדרות בקוד (`contracts.ts`)
   - Mainnet: כתובות מה-פריסה האחרונה
   - Testnet: כתובות מה-פריסה האחרונה
   - אפשר לדרוס עם משתני סביבה אם צריך

2. **Network Selection**: בחירת הרשת נעשית דרך ה-UI (NetworkSelector)
   - לא צריך משתנה סביבה לזה
   - הבחירה נשמרת ב-`localStorage`

3. **RPC URLs**: 
   - ברירות מחדל עובדות, אבל איטיות
   - מומלץ להשתמש ב-RPC מהיר יותר ל-Mainnet (QuickNode, Alchemy)

---

## 🔗 קישורים שימושיים

- **WalletConnect**: https://cloud.walletconnect.com/
- **BscScan API**: https://bscscan.com/apis
- **QuickNode**: https://www.quicknode.com/
- **Alchemy**: https://www.alchemy.com/
- **Infura**: https://www.infura.io/

