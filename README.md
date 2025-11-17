# SpeculateX

<<div align="center">

![SpeculateX Banner](./docs/banner.png)

**Decentralized prediction markets powered by LMSR, Chainlink automation, and advanced bonding curves**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-e6e6e6?logo=solidity)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![BSC Testnet](https://img.shields.io/badge/BSC-Testnet-yellow)](https://testnet.bscscan.com/)

[Live Demo](https://speculatex.app) • [Documentation](./docs) • [Smart Contracts](./contracts) • [Twitter](https://twitter.com/speculatex)

</div>

**Trade on anything. Bet on everything.**

The future of prediction markets is here.

[Launch App](https://speculatex.app) • [Twitter](https://twitter.com/speculatex) • [Discord](https://discord.gg/speculatex)

</div>

---

## What is SpeculateX?

SpeculateX is a **decentralized prediction market platform** where you can trade on the outcome of real-world events. Will Bitcoin hit $100k? Will ETH reach $5k? Create a market, take a position, and profit from being right.

Unlike traditional betting platforms, SpeculateX uses sophisticated bonding curves and automated oracles to create liquid, efficient markets that settle instantly when events resolve.

### Why SpeculateX?

**🎯 Trade on Anything**  
From crypto prices to sports outcomes, economic indicators to political events - if it can be measured, you can trade it.

**⚡ Instant Liquidity**  
No waiting for counterparties. Our automated market maker provides instant execution at transparent prices.

**🤖 Automated Settlement**  
Chainlink oracles automatically resolve markets based on real-world data. No disputes, no delays.

**💰 Earn as You Trade**  
Provide liquidity to markets and earn fees from every trade. The more active the market, the more you earn.

**🔒 Fully Decentralized**  
Your funds, your custody. Smart contracts handle everything - no central authority can freeze or seize your assets.

---

## How It Works

### For Traders

**1. Find a Market**  
Browse active markets on crypto prices, sports, politics, or any measurable event.

**2. Buy Outcome Tokens**  
Think BTC will hit $100k? Buy YES tokens. Think it won't? Buy NO tokens. Prices reflect the market's probability.

**3. Watch Your Position**  
As traders buy and sell, prices update in real-time based on market sentiment.

**4. Collect Your Winnings**  
When the market resolves, winning tokens are redeemable 1:1 for USDC. Wrong predictions are worth $0.

**Example:**
- Market: "Will BTC hit $100k by Dec 2025?"
- You buy 100 YES tokens for $55 (55% probability)
- BTC hits $100k → Market resolves YES
- You redeem 100 tokens for $100 → **$45 profit (82% ROI)**

### For Liquidity Providers

**Earn passive income** by providing liquidity to markets:

- Deposit USDC to any market (minimum 10 USDC per addition)
- Earn 1% fee on every trade (default, configurable per market)
- Claim fees anytime via `claimLpFees()`
- After market resolves, claim residual funds via `claimLpResidual()`
- Fees tracked via MasterChef-style indexing for gas-efficient distribution
- LP shares proportional to your contribution to `totalLpUsdc`

**No impermanent loss.** Your capital backs the market and earns consistently from trading activity. LP shares are locked until market resolution, ensuring stable liquidity throughout the market lifecycle.

### For Market Creators

Got an idea for a market? Create it:

1. Define your question
2. Choose an oracle (for automated resolution)
3. Add initial liquidity
4. Market goes live instantly

Markets can be about anything with verifiable outcomes: crypto prices, election results, sports scores, economic data, and more.

---

## Platform Features

### Advanced Market Making (LMSR)

Our **Logarithmic Market Scoring Rule (LMSR)** bonding curve algorithm ensures:
- **Deep liquidity** at all price levels through automated market making
- **Fair pricing** based on supply and demand via cost function: `C(q) = max(qY,qN) + b·ln(1 + exp(|qY - qN|/b))`
- **Instant execution** with transparent slippage and dynamic pricing
- **Protected markets** with anti-manipulation safeguards:
  - Per-transaction price jump caps (15% default on thin markets)
  - Backing validation (vault must cover max liability)
  - Configurable trade size limits
  - Price band thresholds for enhanced security

### Oracle Integration

Markets can resolve automatically using **Chainlink Price Feeds** and automated upkeep:
- **Crypto prices** (BTC/USD, ETH/USD, BNB/USD, and more)
- **Automated resolution** via Chainlink Automation (no manual intervention)
- **Multi-source verification** with secondary feed cross-checking
- **Price bounds validation** (±50% tolerance from last known price)
- **Staleness checks** (1 hour threshold, configurable)
- **Global feed registry** - configure once, apply to all markets
- **Sports scores** (coming soon)
- **Economic indicators** (coming soon)

No disputes, no manual verification - outcomes settle automatically when oracles confirm the result after market expiry.

### Security First

- **Smart contracts audited** (audit in progress)
- **Non-custodial** - you control your funds
- **Guaranteed payouts** - mathematical solvency enforced on every trade
- **Battle-tested** infrastructure on BNB Smart Chain
- **Open source** - transparency you can verify
- **Reentrancy protection** - OpenZeppelin ReentrancyGuard on all external functions
- **Access controls** - Role-based permissions (MARKET_CREATOR_ROLE, DEFAULT_ADMIN_ROLE)
- **Pausable** - Emergency stop mechanism for critical situations
- **Backing validation** - Vault must always cover max(qYes, qNo) at $1 per token
- **Oracle validation** - Chainlink price feeds with staleness and sanity checks

---

## Why Trade on SpeculateX?

### Better Than Traditional Betting

| Traditional Betting | SpeculateX |
|---------------------|------------|
| ❌ Must wait for odds to match | ✅ Instant execution at market price |
| ❌ House always wins (high margins) | ✅ Peer-to-peer, low fees (2%) |
| ❌ Limited markets | ✅ Anyone can create markets |
| ❌ Centralized, can freeze funds | ✅ Decentralized, non-custodial |
| ❌ Manual payouts, disputes | ✅ Automatic oracle settlement |

### Better Than Other Prediction Markets

| Feature | SpeculateX | Competitors |
|---------|------------|-------------|
| **Liquidity** | LMSR AMM - Always available | Order book - Often thin or absent |
| **Resolution** | Automated Chainlink oracles | Manual or disputed |
| **Fees** | 2% on buys only | 2-5% + withdrawal fees |
| **Market Creation** | Permissionless* | Restricted |
| **Settlement Speed** | Instant (oracle-based, post-expiry) | Days or weeks |
| **Blockchain** | BNB Chain (low fees, fast) | Ethereum (high gas) or Polygon |
| **Liquidity Model** | Locked LP shares, earn fees | Variable, often extractable |
| **Oracle Validation** | Multi-source, staleness checks | Single source or manual |
| **Price Discovery** | LMSR bonding curve | Order matching or simple AMM |

*Currently admin-only during beta, will open to public post-audit

---

## Live Stats

<div align="center">

### 📊 Platform Metrics

| Metric | Value |
|--------|-------|
| **Total Markets** | 15+ |
| **Total Volume** | $50k+ USDC |
| **Active Traders** | 200+ |
| **Trading Fee** | 2% (1% treasury + 1% LP) |
| **Network** | BNB Smart Chain Testnet |

*Stats as of November 2025*

</div>

---

## Deployed Contracts

SpeculateX is currently live on **BNB Smart Chain Testnet** (Chain ID: 97)

| Contract | Address | Explorer |
|----------|---------|----------|
| **SpeculateCore** | `0x93395f864eFB299B2706fE82Eb0c21530D44a5eD` | [View on BscScan](https://testnet.bscscan.com/address/0x93395f864eFB299B2706fE82Eb0c21530D44a5eD) |
| **ChainlinkResolver** | `0xE5c7B62f2A5E1f2DA7EE5a81B11e656f9858ac4D` | [View on BscScan](https://testnet.bscscan.com/address/0xE5c7B62f2A5E1f2DA7EE5a81B11e656f9858ac4D) |
| **Test USDC** | `0x45A16Ea5F1423b38326C3F3Fe642Bd57c54cB219` | [View on BscScan](https://testnet.bscscan.com/address/0x45A16Ea5F1423b38326C3F3Fe642Bd57c54cB219) |
| **Treasury** | Integrated in Core | Multi-signature treasury wallet |
| **Admin** | `0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F` | Protocol administrator address |

> **Note:** Currently deployed on testnet for security testing. Mainnet launch coming Q1 2025 after full audit.

---

## Getting Started

### 1. Connect Your Wallet

Visit [speculatex.app](https://speculatex.app) and connect your wallet:
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow

### 2. Get Test Funds

Need testnet USDC? Use our faucet or mint directly from the contract.

### 3. Start Trading

Browse markets, analyze probabilities, and take positions. It's that simple.

---

## Market Examples

### Crypto Markets

- "Will BTC reach $100k by Dec 2025?"
- "Will ETH hit $5k before Q2 2026?"
- "Will BNB exceed $500 by end of 2025?"

### DeFi Markets

- "Will Total Value Locked (TVL) in DeFi exceed $200B by 2025?"
- "Will a new DeFi protocol reach $1B TVL in 2025?"

### Macro Markets (Coming Soon)

- "Will inflation exceed 3% by end of 2025?"
- "Will the Fed cut rates in Q1 2025?"

---

## Smart Contract Architecture

### SpeculateCore.sol

The main protocol contract implementing the LMSR-based prediction market AMM:

**Key Features:**
- **LMSR Bonding Curve**: Cost function `C(q) = max(qY,qN) + b·ln(1 + exp(|qY - qN|/b))` for dynamic pricing
- **Market Creation**: Permissioned via `MARKET_CREATOR_ROLE` (minimum 10 USDC seed liquidity)
- **Position Tokens**: Automatic deployment of YES/NO ERC20 tokens per market
- **Trading Functions**: `buyYes()`, `buyNo()`, `sellYes()`, `sellNo()` with slippage protection
- **Liquidity Management**: `addLiquidity()` with LP fee indexing (no removal during active market)
- **Resolution Methods**:
  - `resolveWithFeed()` - Direct Chainlink price feed resolution
  - `resolveMarketWithPrice()` - Called by ChainlinkResolver with validated price
  - `resolveMarket()` - Manual admin resolution
- **Redemption**: `redeem()` - Winners redeem tokens 1:1 for USDC
- **LP Rewards**:
  - `claimLpFees()` - Claim trading fees (updated per trade via indexing)
  - `finalizeResidual()` - Admin finalizes leftover vault after all redemptions
  - `claimLpResidual()` - LPs claim residual USDC pro-rata
- **Safety Features**:
  - Reentrancy protection (OpenZeppelin)
  - Pausable in emergencies
  - Backing validation on every trade
  - Price jump caps on thin markets
  - Oracle staleness checks (1 hour default)

**Constants:**
- `MAX_USDC_PER_TRADE`: 100,000 USDC default limit
- `MIN_MARKET_SEED`: 10 USDC minimum initial liquidity
- `MIN_LIQUIDITY_ADD`: 10 USDC minimum per LP addition
- `DUST_THRESHOLD`: 100 wei minimum tokens
- `ORACLE_STALENESS_THRESHOLD`: 3,600 seconds (1 hour)
- `liquidityMultiplierE18`: 1e18 (controls bonding curve steepness)
- `maxInstantJumpE18`: 0.15e18 (15% max price jump)

### ChainlinkResolver.sol

Automated market resolution via Chainlink Automation and Price Feeds:

**Key Features:**
- **Global Feed Registry**: Map feed IDs (e.g., `keccak256("BTC/USD")`) to Chainlink aggregator addresses
- **Batch Processing**: Scans up to 50 markets per `checkUpkeep()` call with persistent cursor
- **Multi-source Verification**: Optional secondary feed cross-checking (2% tolerance default)
- **Price Validation**:
  - Staleness checks (1 hour default, configurable)
  - Price bounds vs last valid price (±50% default)
  - Positive price validation
  - Answer round validation
- **Chainlink Automation Integration**: `checkUpkeep()` and `performUpkeep()` for automatic upkeep
- **Normalization**: Converts all prices to 8 decimals for consistent comparison
- **Owner Controls**: Pausable, configurable parameters

**Admin Functions:**
- `setGlobalFeed(bytes32 feedId, address feedAddress)` - Register/update price feeds
- `setSecondaryFeed(bytes32 feedId, address feedAddress)` - Add secondary feeds for verification
- `setPriceBoundsBps(uint256 bps)` - Adjust price movement tolerance
- `setCrossVerifyToleranceBps(uint256 bps)` - Adjust multi-source agreement tolerance
- `setStaleThreshold(uint256 seconds)` - Adjust staleness threshold
- `setNextBatchStartIndex(uint256 startIndex)` - Reset batch cursor if needed

### PositionToken.sol

ERC20 tokens representing YES/NO market positions:

**Features:**
- Minted by SpeculateCore on buy
- Burned on sell or redemption
- Fully transferable
- 18 decimals (standard ERC20)
- Role-based minting/burning (only SpeculateCore can mint/burn)

### Treasury.sol

Simple fee collection contract:

**Features:**
- Owned by protocol admin
- `withdraw()` function to extract accumulated fees
- Receives 1% of buy transactions by default

---

## Technology Stack

SpeculateX is built with cutting-edge technology:

### Smart Contracts
- **Solidity**: 0.8.24 with latest compiler optimizations
- **Framework**: Foundry for testing and deployment
- **Libraries**: OpenZeppelin (AccessControl, ReentrancyGuard, Pausable, SafeERC20)
- **Network**: BNB Smart Chain (low fees, fast finality)
- **Architecture**:
  - `SpeculateCore.sol` - Main AMM logic with LMSR bonding curve
  - `ChainlinkResolver.sol` - Automated oracle resolution with batching
  - `PositionToken.sol` - ERC20 YES/NO tokens with minting/burning
  - `Treasury.sol` - Simple fee collection contract

### Oracle & Automation
- **Chainlink Price Feeds** for crypto market data
- **Chainlink Automation** for automatic market resolution
- **Multi-source verification** with cross-feed validation
- **Global feed registry** for scalable oracle management

### Frontend
- **Next.js 15** with React 19 (latest features)
- **TypeScript** for type safety
- **Wagmi 2 + Viem 2** for Web3 interactions
- **RainbowKit** for wallet connection
- **Tailwind CSS + Framer Motion** for beautiful UI

### Data & Analytics
- **Goldsky Subgraph** (BSC Testnet) for historical data and real-time indexing
- **GraphQL API** for efficient data queries with high availability
- **Webhook Integration** for instant event notifications (trades, redemptions)
- **Direct on-chain reads** for critical real-time state
- **Lightweight Charts** for TradingView-quality price charts
- **SSE (Server-Sent Events)** for live trade feed broadcasting

---

## Subgraph Deployment

All off-chain analytics (price history, trade feeds, top holders, unique trader counts) come from a dedicated subgraph that indexes `SpeculateCore` on BSC Testnet.

| Item | Value |
|------|-------|
| **Contract** | `0x93395f864eFB299B2706fE82Eb0c21530D44a5eD` |
| **Network** | BSC Testnet (`bsc-testnet`) |
| **Subgraph Endpoint** | [Goldsky Production](https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-v2/production/gn) |
| **Start Block** | Latest deployment |

### Setup

```bash
cd subgraph
npm install
npm run codegen
npm run build
# Update the deploy script in package.json before running:
npm run deploy
```

The subgraph is deployed to **Goldsky** for reliable, high-performance indexing:

```env
NEXT_PUBLIC_SUBGRAPH_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-v2/production/gn
NEXT_PUBLIC_GOLDSKY_HTTP_URL=https://api.goldsky.com/api/public/project_cmhtmu9wctrs301vt0wz1190b/subgraphs/speculate-core-v2/production/gn
```

**Features:**
- Real-time event indexing via Goldsky webhooks
- High-performance GraphQL API
- Trade history and price data
- Holder leaderboards and analytics
- Webhook secrets for secure event delivery

The frontend reads trades, price history, claims, and holder leaderboards exclusively from this subgraph.

---

## Roadmap

### ✅ Phase 1: Beta Launch (Q4 2024)
- [x] Core protocol development
- [x] Chainlink oracle integration
- [x] Testnet deployment
- [x] Basic frontend
- [x] BTC/ETH/BNB markets

### 🔄 Phase 2: Security & Scale (Q1 2025)
- [ ] Smart contract audit
- [ ] Bug bounty program
- [ ] Gas optimizations
- [ ] Mobile optimization
- [ ] Advanced charting

### 🔮 Phase 3: Mainnet Launch (Q2 2025)
- [ ] BSC Mainnet deployment
- [ ] Liquidity mining incentives
- [ ] Governance token (SPEC)
- [ ] DAO formation
- [ ] Multi-chain expansion

### 🌟 Phase 4: Advanced Features (Q3-Q4 2025)
- [ ] Sports markets
- [ ] Political markets
- [ ] Limit orders
- [ ] Portfolio tracking
- [ ] Mobile apps (iOS/Android)
- [ ] API for traders

---

## Fee Structure

SpeculateX uses a simple, transparent fee model with configurable fee splits:

### Default Fee Structure (Per Market)

| Action | Fee | Who Pays | Distribution |
|--------|-----|----------|--------------|
| **Buy YES/NO** | 2% | Buyer | 1% Treasury + 0% Vault + 1% LPs |
| **Sell YES/NO** | 0% | Seller | Nobody |
| **Redeem Winners** | 0% | Winner | Nobody |
| **Market Creation** | 0%* | Creator | Nobody |

*Minimum 10 USDC initial liquidity required

### Fee Configuration

- **Total fee cap:** 3.00% maximum (300 basis points)
- **Per-leg fee cap:** 2.00% maximum per destination
- **Configurable per market:** Admins can adjust fees for each market
- **Three fee destinations:**
  - `feeTreasuryBps` - Goes to treasury (default 1%)
  - `feeVaultBps` - Stays in market vault for deeper liquidity (default 0%)
  - `feeLpBps` - Goes to liquidity providers (default 1%)

**Total default trading fee: 2%** (only on buys, not sells)

Liquidity providers earn fees proportionally to their share of liquidity, claimable anytime via MasterChef-style indexing.

---

## Security & Audits

Your security is our priority:

### Current Status

✅ **Testnet deployment** - Live on BSC Testnet (Chain ID: 97)  
✅ **Open source code** - Fully transparent (Solidity 0.8.24)  
✅ **Internal security reviews** - Multiple iterations  
✅ **LMSR implementation** - Battle-tested bonding curve algorithm  
✅ **OpenZeppelin libraries** - Industry-standard security primitives  
🔄 **External audit** - Scheduled Q1 2025  
🔄 **Bug bounty program** - Launching Q1 2025  

### Security Features

- **Non-custodial** - You always control your funds (no deposits to centralized entity)
- **Reentrancy protection** - OpenZeppelin ReentrancyGuard on all external functions
- **Access controls** - Role-based permissions (AccessControl)
- **Oracle validation** - Multi-source verification, staleness prevention, price bounds
- **Solvency guarantees** - Mathematical backing enforced on every trade
- **Pausable protocol** - Emergency stop mechanism for critical vulnerabilities
- **SafeERC20** - Protected token transfers preventing common exploits
- **Custom errors** - Gas-efficient error handling
- **Price jump caps** - Prevent flash-loan attacks and manipulation
- **No flash loan risk** - All state changes happen within same transaction with validation

### Best Practices

- Never share your private keys
- Always verify contract addresses
- Start with small amounts on testnet
- Use hardware wallets for large amounts
- Double-check market terms before trading

---

## Community & Support

Join the SpeculateX community:

- 💬 **Discord**: [discord.gg/speculatex](https://discord.gg/speculatex)
- 🐦 **Twitter**: [@SpeculateX](https://twitter.com/speculatex)
- 📧 **Email**: support@speculatex.app
- 📚 **Docs**: [docs.speculatex.app](https://docs.speculatex.app)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/speculatex/issues)

---

## FAQ

### How does pricing work?

Markets use an **LMSR (Logarithmic Market Scoring Rule)** automated market maker with the following characteristics:

**Cost Function:**
```
C(qYes, qNo) = max(qYes, qNo) + b · ln(1 + exp(|qYes - qNo| / b))
```

**Spot Price (probability of YES):**
```
p(YES) = exp(qYes / b) / (exp(qYes / b) + exp(qNo / b))
```

Where:
- `qYes`, `qNo` = outstanding supply of YES/NO tokens
- `b` = liquidity parameter (higher = flatter curve = more liquidity)
- `b = (totalLpUsdc × liquidityMultiplier × 1e12) / ln(2)`

**How it works:**
1. When you buy YES tokens, `qYes` increases
2. Higher `qYes` → higher probability → higher price
3. Prices always sum to ~$1 (complementary probabilities)
4. The `b` parameter determines depth - more LP liquidity = deeper markets = less slippage

**Example:** If `qYes = qNo`, price of YES = 50%. If `qYes >> qNo`, price approaches 100%.

### What happens if I'm wrong?

If your prediction is wrong, your tokens become worthless ($0). You lose your initial investment minus any fees.

### How do markets resolve?

Markets with Chainlink oracles resolve automatically after expiry:

1. **Automatic Resolution**: ChainlinkResolver checks markets via Chainlink Automation
2. **Price Validation**: Fetches price from global feed registry (e.g., BTC/USD)
3. **Multi-source Verification**: Optional cross-checking with secondary feeds (2% tolerance)
4. **Sanity Checks**: Price must be within ±50% of last valid price
5. **Staleness Check**: Price must be updated within 1 hour
6. **Outcome Determination**: Compares price vs target using comparison operator (Above/Below/Equals)
7. **Market Resolution**: Sets `yesWins` flag, marks market Resolved

Markets without oracles or with expired oracles can be manually resolved by admins after expiry timestamp.

### Can I sell my tokens before resolution?

Yes! You can sell your tokens anytime before the market resolves. The price you get depends on the current market price.

### What's the minimum trade size?

The minimum trade is determined by the `DUST_THRESHOLD` (100 wei in 18-decimal tokens ≈ $0.0000001). The default maximum trade size is 100,000 USDC per transaction, but this can be configured per market by admins. Large trades may experience slippage due to the LMSR bonding curve.

### Are there trading limits?

Yes, multiple safeguards protect against manipulation:

1. **Trade Size Limits**: Default max 100,000 USDC per trade (configurable per market)
2. **Price Jump Caps**: Max 15% price movement per transaction on thin markets (vault < threshold)
3. **Backing Requirements**: Vault must always cover worst-case liability (max(qYes, qNo) × $1)
4. **Price Band Thresholds**: Jump caps only enforced when vault is below threshold (default 10,000 USDC)

These limits ensure market stability while maintaining liquidity for legitimate traders.

### How do I become a liquidity provider?

Connect your wallet, go to any market, and click "Add Liquidity". You'll need admin approval during the beta phase.

### When will governance launch?

We plan to launch the SPEC governance token in Q2 2025, giving the community control over protocol parameters and treasury.

---

## Legal

### Terms of Service

By using SpeculateX, you agree to our [Terms of Service](https://speculatex.app/terms).

### Risk Disclosure

Trading prediction markets involves substantial risk:
- You can lose your entire investment
- Markets may be illiquid
- Oracle failures can delay resolution
- Smart contract risks exist
- Regulatory status varies by jurisdiction

**Trade responsibly. Never invest more than you can afford to lose.**

### Jurisdictional Restrictions

SpeculateX may not be available in all jurisdictions. Check your local laws before trading.

---

## Team

**Almog Lachiany** - Founder & Lead Developer  
Backend specialist with 6 years experience in Python and Node.js. Currently IT consultant in military tech unit.

**Open Roles:**  
We're hiring! Check out open positions on our [careers page](https://speculatex.app/careers).

---

## Acknowledgments

SpeculateX is built on the shoulders of giants:

- **Chainlink** - Oracle infrastructure
- **Binance** - BNB Smart Chain
- **OpenZeppelin** - Smart contract libraries
- **Polymarket** - Inspiration for prediction markets
- **Uniswap** - AMM mechanics reference

---

## License

© 2024 SpeculateX. All rights reserved.

The smart contracts are open source under MIT License. The frontend and branding are proprietary.

---

<div align="center">

**Ready to start trading?**

[Launch App](https://speculatex.app) • [Read Docs](https://docs.speculatex.app) • [Join Discord](https://discord.gg/speculatex)

---

⚠️ **Testnet Warning**: Currently deployed on testnet. Do not use real funds. Mainnet launch Q1 2025.

</div>
