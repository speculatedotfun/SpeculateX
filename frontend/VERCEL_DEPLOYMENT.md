# Vercel Deployment Guide

## 🎯 Quick Summary

Your app supports **network switching in the UI** (Mainnet ↔ Testnet). For Vercel deployment, you need to configure **ALL environment variables for BOTH networks** so users can switch between them.

## 📋 Environment Variables Setup

### Option 1: Use `.env.production` (Recommended)
Copy the `.env.production` file to your Vercel project:

```bash
# This file contains ALL variables for both mainnet AND testnet
# Users can switch networks via the NetworkSelector in the UI
```

### Option 2: Configure in Vercel Dashboard
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables (all are **Production** environment):

#### 🟢 BSC Mainnet Variables
```env
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_NETWORK=mainnet

# Mainnet Contracts
NEXT_PUBLIC_MAINNET_CORE=0x101450a49E730d2e9502467242d0B6f157BABe60
NEXT_PUBLIC_MAINNET_USDC=0x55d398326f99059fF775485246999027B3197955
NEXT_PUBLIC_MAINNET_TREASURY=0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70
NEXT_PUBLIC_MAINNET_RESOLVER=0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b
NEXT_PUBLIC_MAINNET_ADMIN=0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c

# Mainnet Facets
NEXT_PUBLIC_MAINNET_FACET_MARKET=0x8edbAa8A0E00859a1b5D613c23C642880ad63f31
NEXT_PUBLIC_MAINNET_FACET_TRADING=0x60F75d38399C44b295FD33FFDbb1cD35c9fF5257
NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY=0x1Fda96fb1A1c6136856Eb355d08f2aa94c7f3516
NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT=0x9EfBED36e561db021014962d6aA08C308203fb1B

# Mainnet RPC
NEXT_PUBLIC_MAINNET_RPC_URL=https://rpc.ankr.com/bsc/0d6a3a328c3e05f40beb0865b19e01b1adeef0b3561a91903a8cd8cfb88e9a6e
```

#### 🟡 BSC Testnet Variables
```env
# Testnet Contracts
NEXT_PUBLIC_TESTNET_CORE=0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd
NEXT_PUBLIC_TESTNET_USDC=0xADEa1B9F54A9Be395DDCAf51e072667E1edA09cf
NEXT_PUBLIC_TESTNET_TREASURY=0x5583238e692A5c57314a8D392749A3B102329846
NEXT_PUBLIC_TESTNET_RESOLVER=0x6217730cab1Fc4548747bc37777Bf622B1741e36
NEXT_PUBLIC_TESTNET_ADMIN=0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F

# Testnet Facets
NEXT_PUBLIC_TESTNET_FACET_MARKET=0x97A832fa4fbF84D3Fec97fe4e3eF65FEc73aB35D
NEXT_PUBLIC_TESTNET_FACET_TRADING=0xbfEe7bf201171CA527C83334C6D9b08d2F85790A
NEXT_PUBLIC_TESTNET_FACET_LIQUIDITY=0x1D0d6Fd85A7Ae08Ac8A9B58Cb736d7c2CbB43a39
NEXT_PUBLIC_TESTNET_FACET_SETTLEMENT=0x5f9D480e972fBd90EcA50E01Fd277AbF6a8f7386

# Testnet RPC
NEXT_PUBLIC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
```

#### 🔗 Shared Variables
```env
# Goldsky Subgraph (Mainnet)
NEXT_PUBLIC_GOLDSKY_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-mainnet/production/gn

# WalletConnect Project ID (REQUIRED!)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_actual_project_id_here

# Optional: Analytics
# NEXT_PUBLIC_GA_TRACKING_ID=
# NEXT_PUBLIC_SENTRY_DSN=
```

## 🚀 How It Works

### Local Development
```bash
# Option 1: Mainnet (default)
npm run dev
# Uses .env.local (currently set to mainnet)

# Option 2: Testnet
# Copy .env.testnet to .env.local
npm run dev
```

### Production (Vercel)
1. **Build time**: All environment variables are baked into the build
2. **Runtime**: User clicks NetworkSelector → switches between mainnet/testnet
3. **localStorage**: Saves user's network preference
4. **Seamless switching**: No page reload needed!

## 🔑 Important Notes

### 1. WalletConnect Project ID
**⚠️ CRITICAL**: Replace `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` with your actual ID from https://cloud.reown.com/

Without this, wallet connections will fail!

### 2. Default Network
The app starts on **mainnet** by default (set by `NEXT_PUBLIC_NETWORK=mainnet`).

To change default to testnet:
```env
NEXT_PUBLIC_NETWORK=testnet
```

### 3. RPC URLs
- **Mainnet**: Using Ankr (better performance)
- **Testnet**: Using public BSC testnet RPC

For better testnet performance, consider using a paid RPC provider.

### 4. Subgraph URLs
Currently using mainnet subgraph by default. If you have a separate testnet subgraph, you'll need to update the code to switch subgraph URLs based on network.

## 🧪 Testing Before Deploy

```bash
# Build production version locally
npm run build

# Test production build
npm start

# Test network switching:
# 1. Open app → Should show "BSC Mainnet" (green dot)
# 2. Click network selector → Switch to "BSC Testnet" (yellow dot)
# 3. Verify contracts are different for each network
```

## 📦 Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Configure production environment for network switching"
git push
```

### 2. Import to Vercel
1. Go to https://vercel.com/new
2. Import your repository
3. Configure environment variables (see above)
4. Deploy!

### 3. Verify Deployment
1. Visit your Vercel URL
2. Click NetworkSelector in header
3. Switch between Mainnet/Testnet
4. Check wallet connections work
5. Test a trade on testnet first!

## 🔍 Troubleshooting

### "Cannot find module" errors
- Make sure ALL environment variables are set in Vercel
- Redeploy after adding variables

### Wallet not connecting
- Check WalletConnect Project ID is set
- Verify network chain IDs are correct (56 for mainnet, 97 for testnet)

### Wrong contracts after switching
- Clear browser cache and localStorage
- Reload the page
- Network switch should update immediately

### Subgraph not working on testnet
- Currently using mainnet subgraph only
- You may need separate subgraph deployment for testnet

## 🎉 You're Ready!

Your app now supports:
✅ Network switching in UI (no rebuild needed)
✅ All contract addresses for both networks
✅ Persistent user network preference
✅ Production-ready deployment on Vercel

Happy deploying! 🚀
