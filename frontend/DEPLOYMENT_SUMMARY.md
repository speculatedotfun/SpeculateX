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
NEXT_PUBLIC_MAINNET_CORE=0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E
NEXT_PUBLIC_MAINNET_USDC=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
NEXT_PUBLIC_MAINNET_USDC_DECIMALS=18
NEXT_PUBLIC_MAINNET_TREASURY=0x50c377AedEB8E87f9C3715Af4D84f4fA23154553
NEXT_PUBLIC_MAINNET_RESOLVER=0xbff5aC1fd8EdB1aEf0a32e3Dedd01ff351DBa446
NEXT_PUBLIC_MAINNET_ADMIN=0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
NEXT_PUBLIC_MAINNET_FACET_MARKET=0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58
NEXT_PUBLIC_MAINNET_FACET_TRADING=0x1e88647a37DDb2191F4B72Aa134cFcb98782e694
NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY=0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2
NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT=0x3F7831134683d6fC0F5658E5503b2cF7774A0697
NEXT_PUBLIC_MAINNET_RPC_URL=https://rpc.ankr.com/bsc/0d6a3a328c3e05f40beb0865b19e01b1adeef0b3561a91903a8cd8cfb88e9a6e

# ========================================
# TESTNET CONTRACTS
# ========================================
NEXT_PUBLIC_TESTNET_CORE=0x9315fc0082d85ABa5Dd680C30b53D73b0F032C2D
NEXT_PUBLIC_TESTNET_USDC=0x34F7d01f7529F176fF682aACD468Ba99A89E5aAF
NEXT_PUBLIC_TESTNET_USDC_DECIMALS=6
NEXT_PUBLIC_TESTNET_TREASURY=0x8566B7c306099c7CdB1c2fcACA099C86cf74C977
NEXT_PUBLIC_TESTNET_RESOLVER=0x997a2393976e2629bb1DF909Ee4e42A800d2D0BD
NEXT_PUBLIC_TESTNET_ADMIN=0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
NEXT_PUBLIC_TESTNET_FACET_MARKET=0xdba345d7535E7f4c1745667B181e13c9EF74F056
NEXT_PUBLIC_TESTNET_FACET_TRADING=0xbdC0b854289F29B95C919A9A05474d815C806960
NEXT_PUBLIC_TESTNET_FACET_LIQUIDITY=0xc1C8C0eC33e055Ef092E207B12594ca5E9120528
NEXT_PUBLIC_TESTNET_FACET_SETTLEMENT=0x6312F6730891924c78735E762eC7042634B4D1fA
NEXT_PUBLIC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# ========================================
# SUBGRAPHS (Network-Specific)
# ========================================
NEXT_PUBLIC_GOLDSKY_MAINNET_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-mainnet/1.0.0/gn
NEXT_PUBLIC_GOLDSKY_TESTNET_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-v2/1.0.0/gn
NEXT_PUBLIC_GOLDSKY_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-mainnet/1.0.0/gn

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
