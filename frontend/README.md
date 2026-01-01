# SpeculateX Frontend

> Prediction market platform built on BSC with automated network switching

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Environment Setup](#-environment-setup)
- [Network Switching](#-network-switching)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Key Components](#-key-components)
- [Development Guide](#-development-guide)
- [Troubleshooting](#-troubleshooting)

## ✨ Features

### Core Features
- 🎯 **Prediction Markets** - Trade on real-world event outcomes
- 💱 **LMSR Market Maker** - Automated liquidity with logarithmic cost function
- 🔄 **Network Switching** - Seamless mainnet/testnet switching in UI
- 📊 **Real-time Updates** - Live price feeds via Goldsky subgraph
- 🎨 **Beautiful UI** - Modern design with dark mode support
- 📱 **Responsive** - Mobile-first design, works on all devices

### Trading Features
- 💰 **Buy/Sell Tokens** - Yes/No position tokens
- 📈 **Price Charts** - Interactive TradingView-style charts
- 💧 **Add Liquidity** - Earn fees as liquidity provider
- 🎁 **Claim Rewards** - Redeem winning positions + LP fees
- ⚡ **MEV Protection** - Trade deadlines prevent sandwich attacks
- 🔀 **Split Orders** - Auto-split large trades to avoid slippage

### UX Improvements
- 🎨 **Unified Formatting** - Consistent price display (%, ¢, $)
- 📄 **Pagination** - Browse markets (12 per page)
- ⚠️ **Error States** - Beautiful error handling with retry
- ♿ **Accessibility** - ARIA labels, keyboard navigation
- 🌐 **Network Indicator** - Visual network status (green/yellow dots)

### Admin Features
- ⏰ **Timelock Operations** - 48-hour delay for security
- 🎯 **Market Management** - Create, resolve, cancel markets
- 💰 **Fee Configuration** - Adjust protocol fees
- 🔧 **Emergency Controls** - Pause/unpause trading

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide Icons** - Beautiful icon set

### Web3
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript Ethereum library
- **RainbowKit** - Wallet connection UI
- **WalletConnect** - Multi-wallet support

### Data & State
- **TanStack Query** - Data fetching & caching
- **Goldsky Subgraph** - GraphQL API for blockchain data
- **localStorage** - Network preference persistence

### Development
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks

## 🔧 Environment Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd frontend
npm install
```

### 2. Configure Environment

#### For Local Development (Mainnet)
Copy `.env.mainnet` to `.env.local`:
```bash
cp .env.mainnet .env.local
```

#### For Local Development (Testnet)
Copy `.env.testnet` to `.env.local`:
```bash
cp .env.testnet .env.local
```

#### For Production (Vercel)
Use `.env.production` - contains **ALL** variables for both networks.

### 3. Required Environment Variables

```env
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=56                    # 56 for mainnet, 97 for testnet
NEXT_PUBLIC_NETWORK=mainnet                # mainnet or testnet

# Mainnet Contracts
NEXT_PUBLIC_MAINNET_CORE=0x...
NEXT_PUBLIC_MAINNET_USDC=0x...
NEXT_PUBLIC_MAINNET_TREASURY=0x...
NEXT_PUBLIC_MAINNET_RESOLVER=0x...
NEXT_PUBLIC_MAINNET_ADMIN=0x...
NEXT_PUBLIC_MAINNET_FACET_MARKET=0x...
NEXT_PUBLIC_MAINNET_FACET_TRADING=0x...
NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY=0x...
NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT=0x...
NEXT_PUBLIC_MAINNET_RPC_URL=https://rpc.ankr.com/bsc/...

# Testnet Contracts
NEXT_PUBLIC_TESTNET_CORE=0x...
NEXT_PUBLIC_TESTNET_USDC=0x...
NEXT_PUBLIC_TESTNET_TREASURY=0x...
NEXT_PUBLIC_TESTNET_RESOLVER=0x...
NEXT_PUBLIC_TESTNET_ADMIN=0x...
NEXT_PUBLIC_TESTNET_FACET_MARKET=0x...
NEXT_PUBLIC_TESTNET_FACET_TRADING=0x...
NEXT_PUBLIC_TESTNET_FACET_LIQUIDITY=0x...
NEXT_PUBLIC_TESTNET_FACET_SETTLEMENT=0x...
NEXT_PUBLIC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Goldsky Subgraphs (Network-Specific)
NEXT_PUBLIC_GOLDSKY_MAINNET_HTTP_URL=https://api.goldsky.com/.../speculate-core-mainnet/...
NEXT_PUBLIC_GOLDSKY_TESTNET_HTTP_URL=https://api.goldsky.com/.../speculate-core-v2/...
NEXT_PUBLIC_GOLDSKY_HTTP_URL=https://api.goldsky.com/.../speculate-core-mainnet/...

# WalletConnect (REQUIRED!)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### 4. Get WalletConnect Project ID

1. Visit https://cloud.reown.com/
2. Create a new project
3. Copy your Project ID
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=ca13fe46af58efffd1b73ebfccabf4c7
   ```

## 🌐 Network Switching

### How It Works

Your app supports **automatic network switching** without rebuilding:

```
User visits site → Mainnet (default)
  ↓
Clicks NetworkSelector → Shows:
  🟢 BSC Mainnet (current)
  🟡 BSC Testnet
  ↓
Clicks "BSC Testnet" → App automatically:
  ✓ Switches to testnet contracts
  ✓ Switches to testnet subgraph (speculate-core-v2)
  ✓ Prompts wallet to switch network (chain 97)
  ✓ Saves preference to localStorage
  ✓ Reloads with testnet data
```

### Implementation

**Contract Addresses** (`lib/contracts.ts`):
```typescript
export function getAddresses() {
  const network = getCurrentNetwork(); // Reads from localStorage
  return network === 'mainnet'
    ? MAINNET_ADDRESSES  // Uses NEXT_PUBLIC_MAINNET_*
    : TESTNET_ADDRESSES; // Uses NEXT_PUBLIC_TESTNET_*
}
```

**Subgraph URLs** (`lib/subgraphClient.ts`):
```typescript
function getSubgraphHttpUrl(): string {
  const network = getCurrentNetwork();

  if (network === 'mainnet') {
    return process.env.NEXT_PUBLIC_GOLDSKY_MAINNET_HTTP_URL;
  }
  if (network === 'testnet') {
    return process.env.NEXT_PUBLIC_GOLDSKY_TESTNET_HTTP_URL;
  }

  return fallbackUrl;
}
```

### Network-Specific Resources

| Resource | Mainnet | Testnet |
|----------|---------|---------|
| **Chain ID** | 56 | 97 |
| **Subgraph** | `speculate-core-mainnet` | `speculate-core-v2` |
| **RPC** | Ankr (premium) | Public BSC |
| **USDC** | USDT (0x55d3...) | MockUSDC (0xADEa...) |
| **Indicator** | 🟢 Green dot | 🟡 Yellow dot |

## 🚀 Deployment

### Vercel Deployment (Recommended)

#### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push
```

#### 2. Import to Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **Root Directory**: `frontend` ⚠️ IMPORTANT
4. Framework: Next.js (auto-detected)

#### 3. Configure Environment Variables
**Option A (Easiest)**: Copy from `.env.production`
1. Open `.env.production`
2. Copy everything (Ctrl+A, Ctrl+C)
3. Vercel → Settings → Environment Variables
4. Click **"Paste .env"** button
5. Save

**Option B**: Add manually (37 variables total)
- See `VERCEL_CHECKLIST.md` for complete list

#### 4. Deploy
Click **Deploy** → Wait 2-3 minutes → Done! 🎉

### Self-Hosting

```bash
# Build
npm run build

# Start production server
npm start
```

Server runs on port 3000. Set `PORT` env var to change.

### Docker (Optional)

```bash
# Build image
docker build -t speculatex-frontend .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id \
  speculatex-frontend
```

## 📁 Project Structure

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Homepage
│   ├── markets/             # Markets pages
│   │   ├── page.tsx         # Market list (with pagination)
│   │   └── [id]/page.tsx    # Market detail
│   ├── admin/               # Admin panel
│   ├── portfolio/           # User portfolio
│   └── layout.tsx           # Root layout
│
├── components/              # React components
│   ├── Header.tsx           # Navigation header
│   ├── NetworkSelector.tsx  # Network switcher (mainnet/testnet)
│   ├── TradingCard.tsx      # Trading interface
│   ├── AdminOperationsManager.tsx # Timelock operations
│   ├── ui/                  # UI components
│   │   ├── ErrorState.tsx   # Error handling
│   │   ├── Pagination.tsx   # Pagination component
│   │   └── skeleton.tsx     # Loading states
│   ├── market/              # Market components
│   └── trading/             # Trading sub-components
│
├── lib/                     # Utilities & libraries
│   ├── contracts.ts         # Contract addresses & network logic
│   ├── subgraphClient.ts    # GraphQL client
│   ├── format.ts            # Unified formatting utilities
│   ├── hooks/               # Custom React hooks
│   ├── abis/                # Contract ABIs
│   └── lmsrMath.ts          # Market maker math
│
├── public/                  # Static assets
│   └── logos/               # Token/market logos
│
├── .env.production          # Production env (both networks)
├── .env.mainnet             # Mainnet env (local dev)
├── .env.testnet             # Testnet env (local dev)
├── .env.local               # Current env (gitignored)
│
└── Documentation/
    ├── DEPLOYMENT_SUMMARY.md
    ├── VERCEL_CHECKLIST.md
    └── VERCEL_DEPLOYMENT.md
```

## 🔑 Key Components

### NetworkSelector
**Location**: `components/NetworkSelector.tsx`

Allows users to switch between mainnet and testnet:
- Visual indicator (green/yellow dot)
- Saves preference to localStorage
- Triggers wallet network switch
- Reloads app with new contracts

### TradingCard
**Location**: `components/TradingCard.tsx`

Main trading interface:
- Buy/sell position tokens
- Add/remove liquidity
- Real-time price updates
- Split large orders automatically
- MEV protection with deadlines

### Pagination
**Location**: `components/ui/Pagination.tsx`

Market list pagination:
- 12 markets per page
- First/Previous/Next/Last navigation
- Mobile-friendly (shows "3/50" on small screens)
- Item count display

### ErrorState
**Location**: `components/ui/ErrorState.tsx`

Error handling component:
- 3 variants: `compact`, `default`, `page`
- Retry functionality
- Back/Home navigation buttons
- Shows technical details in dev mode

### Formatting Utilities
**Location**: `lib/format.ts`

Unified formatting functions:
```typescript
formatPrice(0.543, 'percentage') // "54.3%"
formatPrice(0.543, 'cents')      // "54.3¢"
formatPrice(100.5, 'currency')   // "$100.50"
formatCompact(1500000)           // "1.5M"
formatTokenAmount(1e18)          // "1.00"
formatTimeAgo(timestamp)         // "5 minutes ago"
truncateAddress("0x1234...")     // "0x1234...5678"
```

## 💻 Development Guide

### Running Locally

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start

# Linting
npm run lint

# Type checking
npm run type-check
```

### Switching Networks Locally

**Method 1**: Copy environment files
```bash
# Switch to mainnet
cp .env.mainnet .env.local
npm run dev

# Switch to testnet
cp .env.testnet .env.local
npm run dev
```

**Method 2**: Use NetworkSelector in UI
1. Start app with either network
2. Click NetworkSelector in header
3. Choose network (mainnet/testnet)
4. App reloads with new network

### Adding a New Market

1. Connect wallet as admin
2. Go to `/admin`
3. Click "Create Market"
4. Fill in:
   - Question
   - Expiry date
   - Initial liquidity
   - Oracle type (Manual/Chainlink)
5. Submit & wait for confirmation

### Resolving a Market

1. Wait for market to expire
2. Go to market page
3. Click "Resolve" (admin only)
4. Select outcome (Yes/No/Cancel)
5. Confirm transaction

## 🐛 Troubleshooting

### Build Fails

**Error**: "Cannot find module"
```bash
# Solution: Install dependencies
npm install
```

**Error**: ESLint warnings
```bash
# Solution: Fix or ignore in next.config.js
# Warnings don't block builds, only errors do
```

### Wallet Not Connecting

**Error**: "demo-project-id" in console
```bash
# Solution: Add WalletConnect Project ID
# Get ID from https://cloud.reown.com/
echo "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id" >> .env.local
```

**Error**: Wrong network
```bash
# Solution: Switch network in wallet
# Or click NetworkSelector to prompt auto-switch
```

### Network Switch Not Working

**Error**: Stuck on old network after switch
```bash
# Solution 1: Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Solution 2: Clear localStorage
# Browser DevTools → Application → localStorage → Clear
```

**Error**: Subgraph returns no data
```bash
# Check network-specific subgraph URL is set
# Mainnet: NEXT_PUBLIC_GOLDSKY_MAINNET_HTTP_URL
# Testnet: NEXT_PUBLIC_GOLDSKY_TESTNET_HTTP_URL
```

### Deployment Issues

**Vercel build fails**
```bash
# Test build locally first
npm run build

# Check environment variables are set
# Vercel → Settings → Environment Variables
```

**Environment variables not working**
```bash
# Make sure they're set for "Production" environment
# Redeploy after adding variables
# Check spelling matches exactly (case-sensitive)
```

### Common Issues

**Markets not loading**
- Check subgraph URL is correct
- Verify network matches selected network
- Check browser console for errors

**Trades failing**
- Ensure wallet has enough USDC
- Check USDC approval
- Verify you're on correct network

**Prices not updating**
- Refresh the page
- Check subgraph subscription is active
- Verify network connection

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [WalletConnect](https://docs.reown.com/)
- [Goldsky Subgraph](https://docs.goldsky.com/)

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

- **Documentation**: See `/frontend/DEPLOYMENT_SUMMARY.md`
- **Issues**: Open an issue on GitHub
- **Discord**: Join our community (link)

---

**Built with ❤️ by the SpeculateX team**
