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
cd C:\Users\Almog\.claude-worktrees\speculatev1\ecstatic-torvalds
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
NEXT_PUBLIC_MAINNET_CORE=0x101450a49E730d2e9502467242d0B6f157BABe60
NEXT_PUBLIC_MAINNET_USDC=0x55d398326f99059fF775485246999027B3197955
NEXT_PUBLIC_MAINNET_TREASURY=0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70
NEXT_PUBLIC_MAINNET_RESOLVER=0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b
NEXT_PUBLIC_MAINNET_ADMIN=0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c
NEXT_PUBLIC_MAINNET_FACET_MARKET=0x8edbAa8A0E00859a1b5D613c23C642880ad63f31
NEXT_PUBLIC_MAINNET_FACET_TRADING=0x60F75d38399C44b295FD33FFDbb1cD35c9fF5257
NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY=0x1Fda96fb1A1c6136856Eb355d08f2aa94c7f3516
NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT=0x9EfBED36e561db021014962d6aA08C308203fb1B
NEXT_PUBLIC_MAINNET_RPC_URL=https://rpc.ankr.com/bsc/0d6a3a328c3e05f40beb0865b19e01b1adeef0b3561a91903a8cd8cfb88e9a6e

# Testnet Contracts
NEXT_PUBLIC_TESTNET_CORE=0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd
NEXT_PUBLIC_TESTNET_USDC=0xADEa1B9F54A9Be395DDCAf51e072667E1edA09cf
NEXT_PUBLIC_TESTNET_TREASURY=0x5583238e692A5c57314a8D392749A3B102329846
NEXT_PUBLIC_TESTNET_RESOLVER=0x6217730cab1Fc4548747bc37777Bf622B1741e36
NEXT_PUBLIC_TESTNET_ADMIN=0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F
NEXT_PUBLIC_TESTNET_FACET_MARKET=0x97A832fa4fbF84D3Fec97fe4e3eF65FEc73aB35D
NEXT_PUBLIC_TESTNET_FACET_TRADING=0xbfEe7bf201171CA527C83334C6D9b08d2F85790A
NEXT_PUBLIC_TESTNET_FACET_LIQUIDITY=0x1D0d6Fd85A7Ae08Ac8A9B58Cb736d7c2CbB43a39
NEXT_PUBLIC_TESTNET_FACET_SETTLEMENT=0x5f9D480e972fBd90EcA50E01Fd277AbF6a8f7386
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
3. Deployment successful! 🎉

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
