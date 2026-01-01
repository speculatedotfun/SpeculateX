# 🚀 Deployment Summary - Network Switching Support

## ✅ What's Configured

Your app now supports **automatic network switching** with separate configurations for:

### 🟢 BSC Mainnet
- Contract addresses: All facets and core contracts
- RPC: Ankr (premium, faster)
- Subgraph: `speculate-core-mainnet`
- Chain ID: 56

### 🟡 BSC Testnet
- Contract addresses: All facets and core contracts
- RPC: Public BSC Testnet
- Subgraph: `speculate-core-v2`
- Chain ID: 97

## 🎯 How Network Switching Works

### 1. User Experience
```
User visits site → Mainnet (default)
  ↓
Clicks NetworkSelector → Dropdown shows:
  • 🟢 BSC Mainnet (current)
  • 🟡 BSC Testnet
  ↓
Clicks "BSC Testnet" → App automatically:
  ✓ Switches contracts to testnet addresses
  ✓ Switches subgraph to speculate-core-v2
  ✓ Prompts wallet to switch to chain 97
  ✓ Saves preference to localStorage
  ✓ Reloads with testnet data
```

### 2. Technical Flow
```typescript
// User switches network in UI
setNetwork('testnet')
  ↓
// localStorage saves choice
localStorage.setItem('selectedNetwork', 'testnet')
  ↓
// App reads network preference
getCurrentNetwork() → 'testnet'
  ↓
// Contracts use testnet addresses
getAddresses() → TESTNET_ADDRESSES
  ↓
// Subgraph switches to testnet
getSubgraphHttpUrl() → NEXT_PUBLIC_GOLDSKY_TESTNET_HTTP_URL
```

## 📦 Environment Variables (Complete List)

### For Vercel Production (Copy to Vercel Dashboard)

```env
# Default Network
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_NETWORK=mainnet

# ========================================
# MAINNET CONTRACTS
# ========================================
NEXT_PUBLIC_MAINNET_CORE=0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b
NEXT_PUBLIC_MAINNET_USDC=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
NEXT_PUBLIC_MAINNET_TREASURY=0x641b1FF8875eC2f1822F748C32858348409E0e39
NEXT_PUBLIC_MAINNET_RESOLVER=0x4076a6951B8d1EB2f4008A8b1E73FCB614e44dC2
NEXT_PUBLIC_MAINNET_ADMIN=0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c
NEXT_PUBLIC_MAINNET_FACET_MARKET=0xf670Eb4cfe8B0a6f98Ba5Dbbdf145Cad49a94ba2
NEXT_PUBLIC_MAINNET_FACET_TRADING=0xBca0707dAc82c3946a2A326Ba33C821c0A2E28bE
NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY=0xD9DCA9eC368E44d7bDAe1A6997f4BB21ADDFeb87
NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT=0x7B95420f86c7325F4fdeCE2ad8C249C84708852B
NEXT_PUBLIC_MAINNET_RPC_URL=https://rpc.ankr.com/bsc/0d6a3a328c3e05f40beb0865b19e01b1adeef0b3561a91903a8cd8cfb88e9a6e

# ========================================
# TESTNET CONTRACTS
# ========================================
NEXT_PUBLIC_TESTNET_CORE=0x22B5E95C7B81D340CfCEBE93A2EE665dC310C491
NEXT_PUBLIC_TESTNET_USDC=0xad0F596e1736da0690690a4aEfE348dC77499ea1
NEXT_PUBLIC_TESTNET_TREASURY=0xfE75f39c7aBc1A45cd5b32F2f8B64B40DA362439
NEXT_PUBLIC_TESTNET_RESOLVER=0x359a1104E6990050B0CD6e365A1cF9840262021a
NEXT_PUBLIC_TESTNET_ADMIN=0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c
NEXT_PUBLIC_TESTNET_FACET_MARKET=0x080479E449123F269E85DE8cC915E5f9a417B3C5
NEXT_PUBLIC_TESTNET_FACET_TRADING=0xBF0C4E718697347ECb68d6763088A258d10377e9
NEXT_PUBLIC_TESTNET_FACET_LIQUIDITY=0x18fe9F9C590b960Af2eE5001942bE152eFe9F879
NEXT_PUBLIC_TESTNET_FACET_SETTLEMENT=0x4B6e27aEbd6eaB2F6b239fE1D8470C2275B6B5c9
NEXT_PUBLIC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# ========================================
# SUBGRAPHS (Network-Specific)
# ========================================
NEXT_PUBLIC_GOLDSKY_MAINNET_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-mainnet/production/gn
NEXT_PUBLIC_GOLDSKY_TESTNET_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-v2/production/gn
NEXT_PUBLIC_GOLDSKY_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-mainnet/production/gn

# ========================================
# WALLETCONNECT
# ========================================
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=ca13fe46af58efffd1b73ebfccabf4c7
```

## 🚀 Quick Deployment Steps

### 1. Commit & Push
```bash
git add .
git commit -m "Configure network switching with separate subgraphs"
git push
```

### 2. Vercel Import
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **Root Directory**: `frontend`
4. Framework: Next.js

### 3. Environment Variables
**Easiest way**:
1. Open `.env.production`
2. Copy everything (Ctrl+A, Ctrl+C)
3. In Vercel → Settings → Environment Variables
4. Click **"Paste .env"**
5. Save

### 4. Deploy
Click **Deploy** → Wait 2-3 minutes → Done!

## 🧪 Testing Network Switching

### Test Sequence:
1. **Visit site** → Should show "BSC Mainnet" (green dot)
2. **Open browser console** → Should see:
   ```
   [subgraphClient] 🔗 Connected to Subgraph: .../speculate-core-mainnet/... (mainnet)
   ```
3. **Click NetworkSelector** → Switch to "BSC Testnet"
4. **After reload** → Should show "BSC Testnet" (yellow dot)
5. **Check console again** → Should see:
   ```
   [subgraphClient] 🔗 Connected to Subgraph: .../speculate-core-v2/... (testnet)
   ```
6. **Connect wallet** → Should prompt to switch to BSC Testnet (chain 97)
7. **Browse markets** → Should load testnet markets
8. **Switch back to mainnet** → Preference saved!

## 📊 What Happens When User Switches

| Action | Mainnet | Testnet |
|--------|---------|---------|
| **Contracts** | `NEXT_PUBLIC_MAINNET_*` | `NEXT_PUBLIC_TESTNET_*` |
| **Subgraph** | `speculate-core-mainnet` | `speculate-core-v2` |
| **RPC** | Ankr (premium) | Public BSC |
| **Chain ID** | 56 | 97 |
| **Visual** | 🟢 Green dot | 🟡 Yellow dot |
| **Label** | "BSC Mainnet" | "BSC Testnet" |

## ✅ Verification Checklist

After deployment, verify:

- [ ] Site loads on mainnet by default
- [ ] NetworkSelector shows both networks
- [ ] Switching to testnet changes URL in console logs
- [ ] Wallet prompts to switch chain when needed
- [ ] Markets load correctly on both networks
- [ ] Preference persists after refresh
- [ ] No console errors during network switch
- [ ] WalletConnect works (not "demo-project-id")

## 🎯 Key Features

✅ **Single deployment** serves both networks
✅ **No rebuild needed** for network changes
✅ **Automatic subgraph switching** (mainnet/testnet)
✅ **localStorage persistence** remembers user choice
✅ **Visual indicators** (colored dots + labels)
✅ **Wallet integration** auto-prompts network switch
✅ **Separate contract addresses** for each network
✅ **Fallback support** if env vars missing

## 🔐 Security Notes

**Safe to commit:**
- ✅ All `NEXT_PUBLIC_*` variables (public by design)
- ✅ Contract addresses (on-chain, public)
- ✅ Subgraph URLs (public GraphQL endpoints)
- ✅ WalletConnect Project ID (public, non-sensitive)

**Never commit:**
- ❌ Private keys
- ❌ API keys for paid services
- ❌ Database credentials
- ❌ `.env.local` (already gitignored)

## 🎉 You're Ready!

Your app now:
- ✅ Supports mainnet + testnet in one deployment
- ✅ Auto-switches subgraphs based on network
- ✅ Remembers user preference
- ✅ Works seamlessly with wallet switching
- ✅ Ready for Vercel deployment

**Just commit, push, and deploy!** 🚀
