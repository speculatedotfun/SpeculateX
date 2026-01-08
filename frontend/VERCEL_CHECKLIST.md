# 🚀 Vercel Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Configured
- [x] WalletConnect Project ID: `ca13fe46af58efffd1b73ebfccabf4c7`
- [x] Mainnet contract addresses configured
- [x] Testnet contract addresses configured
- [x] Goldsky subgraph URL set
- [x] RPC URLs configured (Ankr for mainnet, public for testnet)

### 2. Build Status
- [x] Build completes successfully (`npm run build`)
- [x] No TypeScript errors
- [x] Only minor ESLint warnings (safe to ignore)
- [x] All 13 routes generated

### 3. Network Switching
- [x] NetworkSelector component works
- [x] Both mainnet and testnet addresses available
- [x] localStorage persistence enabled
- [x] Visual indicators (green/yellow dots) working

## 📝 Vercel Setup Steps

### Step 1: Push to GitHub
```bash
git add frontend/
git commit -m "Configure production environment with WalletConnect ID"
git push
```

### Step 2: Import to Vercel
1. Go to https://vercel.com/new
2. Connect your GitHub account
3. Select your repository
4. Framework preset: **Next.js** (auto-detected)
5. Root directory: `frontend`

### Step 3: Configure Environment Variables

**Option A: Copy from `.env.production`**
In Vercel Dashboard → Environment Variables → Paste all from `.env.production`

**Option B: Add manually (all for Production environment):**

```env
# Network & Chain
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_NETWORK=mainnet

# Mainnet Contracts
NEXT_PUBLIC_MAINNET_CORE=0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b
NEXT_PUBLIC_MAINNET_USDC=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
NEXT_PUBLIC_MAINNET_TREASURY=0x641b1FF8875eC2f1822F748C32858348409E0e39
NEXT_PUBLIC_MAINNET_RESOLVER=0xe11c1Dc5768858732d4a255A3baE579860780AE2
NEXT_PUBLIC_MAINNET_ADMIN=0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
NEXT_PUBLIC_MAINNET_FACET_MARKET=0xf670Eb4cfe8B0a6f98Ba5Dbbdf145Cad49a94ba2
NEXT_PUBLIC_MAINNET_FACET_TRADING=0xBca0707dAc82c3946a2A326Ba33C821c0A2E28bE
NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY=0xD9DCA9eC368E44d7bDAe1A6997f4BB21ADDFeb87
NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT=0x7B95420f86c7325F4fdeCE2ad8C249C84708852B
NEXT_PUBLIC_MAINNET_RPC_URL=https://rpc.ankr.com/bsc/0d6a3a328c3e05f40beb0865b19e01b1adeef0b3561a91903a8cd8cfb88e9a6e

# Testnet Contracts
NEXT_PUBLIC_TESTNET_CORE=0x22B5E95C7B81D340CfCEBE93A2EE665dC310C491
NEXT_PUBLIC_TESTNET_USDC=0xad0F596e1736da0690690a4aEfE348dC77499ea1
NEXT_PUBLIC_TESTNET_TREASURY=0xfE75f39c7aBc1A45cd5b32F2f8B64B40DA362439
NEXT_PUBLIC_TESTNET_RESOLVER=0x23F77F3a2E722d190FDf48EEE7E13D5cdfbF2157
NEXT_PUBLIC_TESTNET_ADMIN=0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
NEXT_PUBLIC_TESTNET_FACET_MARKET=0x080479E449123F269E85DE8cC915E5f9a417B3C5
NEXT_PUBLIC_TESTNET_FACET_TRADING=0xBF0C4E718697347ECb68d6763088A258d10377e9
NEXT_PUBLIC_TESTNET_FACET_LIQUIDITY=0x18fe9F9C590b960Af2eE5001942bE152eFe9F879
NEXT_PUBLIC_TESTNET_FACET_SETTLEMENT=0x4B6e27aEbd6eaB2F6b239fE1D8470C2275B6B5c9
NEXT_PUBLIC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Shared Services
NEXT_PUBLIC_GOLDSKY_MAINNET_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-mainnet/production/gn
NEXT_PUBLIC_GOLDSKY_TESTNET_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-v2/production/gn
NEXT_PUBLIC_GOLDSKY_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-mainnet/production/gn
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=ca13fe46af58efffd1b73ebfccabf4c7
```

### Step 4: Deploy
1. Click **Deploy** button
2. Wait for build (2-3 minutes)
3. Deployment successful!

## 🧪 Post-Deployment Testing

### Test 1: Homepage Load
- [ ] Visit your Vercel URL
- [ ] Page loads without errors
- [ ] Network indicator shows "BSC Mainnet" (green dot)

### Test 2: Network Switching
- [ ] Click NetworkSelector in header
- [ ] Switch to "BSC Testnet" (yellow dot)
- [ ] Page reloads with testnet contracts
- [ ] Switch back to Mainnet
- [ ] Preference saved in localStorage

### Test 3: Wallet Connection
- [ ] Click "Connect Wallet"
- [ ] WalletConnect modal appears (not "demo-project-id" error)
- [ ] Connect MetaMask/WalletConnect
- [ ] Wallet address appears in header
- [ ] Network matches selected network

### Test 4: Browse Markets
- [ ] Navigate to /markets
- [ ] Markets load correctly
- [ ] Pagination works (12 per page)
- [ ] Price displays formatted correctly
- [ ] Network selector shows current network

### Test 5: Trading (Testnet First!)
- [ ] Switch to BSC Testnet
- [ ] Open a market
- [ ] Try to buy/sell tokens
- [ ] Approve USDC
- [ ] Execute trade
- [ ] Transaction succeeds

### Test 6: Admin Panel (if admin)
- [ ] Visit /admin
- [ ] See 21 timelock operations
- [ ] Countdown timers working
- [ ] Execute button appears after 48h

## 🔧 Troubleshooting

### Build Fails
```bash
# Locally test production build
npm run build
npm start
```

### Environment Variables Not Working
- Check they're set for "Production" environment
- Redeploy after adding variables
- Check spelling and values match exactly

### Wallet Connection Issues
- Verify WalletConnect Project ID is correct
- Check it's not still "demo-project-id"
- Make sure chain IDs are correct (56/97)

### Wrong Network After Switch
- Clear browser cache
- Clear localStorage
- Hard refresh (Ctrl+Shift+R)

## 📊 Expected Results

✅ **Homepage**: Loads in ~1-2 seconds
✅ **Network Switch**: Instant, no reload
✅ **Wallet Connect**: Works with WalletConnect ID
✅ **Trading**: Executes on correct network
✅ **Markets**: Show with pagination (12 per page)
✅ **Build Time**: ~2-3 minutes on Vercel
✅ **First Load JS**: ~503 KB (excellent!)

## 🎯 Production URLs

After deployment, you'll get:
- **Production**: `https://your-app.vercel.app`
- **Preview**: `https://your-app-git-branch.vercel.app` (for each branch)

## 🔐 Security Notes

✅ **Safe to Commit**:
- `.env.production` (contract addresses are public)
- All `NEXT_PUBLIC_*` variables (public by design)

❌ **Never Commit**:
- `.env.local` (already in .gitignore)
- Private keys
- API keys for paid services
- Database credentials

## 🎉 You're Live!

Once deployed:
1. Share your Vercel URL
2. Test on mainnet (small amounts first!)
3. Monitor for errors in Vercel dashboard
4. Set up domain if needed

**Good luck with your launch! 🚀**
