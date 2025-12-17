# SpeculateX Protocol

<div align="center">

![SpeculateX Banner](./docs/images/home-page.png)

**Decentralized, Automated Prediction Markets on BNB Chain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-e6e6e6?logo=solidity)](https://soliditylang.org/)
[![BSC Mainnet](https://img.shields.io/badge/BSC-Mainnet-green)](https://bscscan.com/)
[![BSC Testnet](https://img.shields.io/badge/BSC-Testnet-yellow)](https://testnet.bscscan.com/)
[![Foundry](https://img.shields.io/badge/Foundry-1.0-blue)](https://getfoundry.sh/)

[🚀 Live Demo](http://localhost:3003) • [📚 Documentation](./docs) • [💬 Discord](https://discord.gg/speculatex) • [🐦 Twitter](https://twitter.com/speculatex)

</div>

-----

## 📖 Overview

**SpeculateX** is a decentralized prediction market protocol that allows users to trade on real-world events (Crypto Prices, Sports, Economics). Unlike traditional order-book exchanges, SpeculateX utilizes an **Automated Market Maker (AMM)** based on the **Logarithmic Market Scoring Rule (LMSR)** to ensure constant liquidity and fair pricing.

The protocol features a "Be The Market" architecture where users can provide liquidity to specific markets and earn trading fees, alongside a robust **Chainlink Automation** system for trustless market resolution.

**Now Live on BSC Mainnet!** 🎉

-----

## ⚙️ Core Architecture

<div align="center">

![Markets Overview](./docs/images/markets-page.png)

*Explore active markets with real-time statistics*

</div>

The protocol consists of several modular smart contracts:

### 1. 🧠 Core (Engine)

The central hub of the protocol.

- **BSC Mainnet** uses the legacy **monolithic** `SpeculateCore`.
- **BSC Testnet** uses a **Diamond-style** architecture: `SpeculateCoreRouter` + Facets (`MarketFacet`, `TradingFacet`, `LiquidityFacet`, `SettlementFacet`).

### 2. 🧮 LMSRMath.sol (The Logic)

A specialized math library implementing the Logarithmic Market Scoring Rule.

- **Pricing:** Calculates spot prices and trade costs using high-precision fixed-point arithmetic (18 decimals).
- **Cost Function:** `C(q) = b * ln(exp(qYes/b) + exp(qNo/b))`.
- **Liquidity Parameter (b):** Dynamically adjusts based on the total liquidity in the pool.

### 3. 🤖 ChainlinkResolver.sol (The Oracle)

Ensures trustless and automated settlement.

- **Resolution:** Fetches Chainlink Aggregator price at expiry and calls the core settlement function.
- **Validation:** Checks for staleness and answer validity.
- **Data Feeds:** Fetches real-time price data (e.g., BTC/USD) from Chainlink Aggregators.

### 4. 💰 Financial Primitives

- **PositionToken.sol:** ERC20 tokens representing outcome shares (YES/NO), minted only by the Core.
- **Treasury.sol:** Collects protocol fees.
- **MockUSDC.sol:** A testnet-only stablecoin with a faucet for development.

-----

## 🚀 Key Features

<div align="center">

![Markets Page](./docs/images/markets-page.png)

*Browse and filter active prediction markets*

</div>

### "Be The Market" (Liquidity Provision)

Users can fund markets via `addLiquidity`.

- **No Impermanent Loss logic:** LPs own a share of the pool's "b" parameter.
- **Rewards:** LPs earn a configurable fee (default 1%) on every trade, tracked via an accumulator index (`accFeePerUSDCE18`).
- **Residual Claims:** Post-resolution, LPs claim remaining vault funds proportional to their share.

### Dynamic Fee Structure

Fees are calculated in Basis Points (BPS) and split three ways:

1. **Treasury:** Protocol sustainability.
2. **LP:** Rewards for liquidity providers.
3. **Vault:** Reinvested into the market to deepen liquidity.

### Safety Guardrails

- **Max Price Jump:** Prevents manipulation by limiting how much a single trade can move the price (Default: 15%).
- **Staleness Checks:** Markets won't resolve if Oracle data is older than 1 hour.
- **Admin Timelock:** Manual overrides require a 2-day delay for transparency.

### Multi-Network Support

- **BSC Mainnet:** Production deployment with real USDC
- **BSC Testnet:** Development and testing with MockUSDC faucet
- **Network Selector:** Easy switching between Mainnet and Testnet in the UI

-----

## 🛠 Deployment

<div align="center">

![Market Trading Interface](./docs/images/market-trading.png)

*Trade YES/NO positions with instant execution*

</div>

### 🌐 BSC Mainnet (Chain ID: 56)

| Contract | Address | Explorer |
|----------|---------|----------|
| **SpeculateCore** | `0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725` | [View on BscScan](https://bscscan.com/address/0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725) |
| **ChainlinkResolver** | `0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3` | [View on BscScan](https://bscscan.com/address/0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3) |
| **Treasury** | `0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778` | [View on BscScan](https://bscscan.com/address/0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778) |
| **USDC** | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | [View on BscScan](https://bscscan.com/address/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d) |
| **Admin** | `0x4dc74a8532550ffca11fb958549ca0b72e3f1f1c` | [View on BscScan](https://bscscan.com/address/0x4dc74a8532550ffca11fb958549ca0b72e3f1f1c) |

### 🧪 BSC Testnet (Chain ID: 97)

| Contract | Address | Explorer |
|----------|---------|----------|
| **SpeculateCoreRouter** | `0xE2BD9a1ac99B8215620628FC43838e4361D476a0` | [View on BscScan](https://testnet.bscscan.com/address/0xE2BD9a1ac99B8215620628FC43838e4361D476a0) |
| **ChainlinkResolver** | `0x39FD1A9AE3556340D2aBfED7654F900db688b464` | [View on BscScan](https://testnet.bscscan.com/address/0x39FD1A9AE3556340D2aBfED7654F900db688b464) |
| **Treasury** | `0xDB6787414d4Ed14Dbd46eB58129bd72352725948` | [View on BscScan](https://testnet.bscscan.com/address/0xDB6787414d4Ed14Dbd46eB58129bd72352725948) |
| **MockUSDC (faucet)** | `0xbCD27B18f51FCB7536b9e7DDB5cAFC9628CA9489` | [View on BscScan](https://testnet.bscscan.com/address/0xbCD27B18f51FCB7536b9e7DDB5cAFC9628CA9489) |
| **Admin** | `0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F` | [View on BscScan](https://testnet.bscscan.com/address/0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F) |

**Important (Testnet activation):** after deploying the Diamond contracts, facets/resolver are **scheduled** behind a 24h timelock. Until you execute them, `createMarket/buy/sell` will revert with `NO_FACET`. See `contracts/DEPLOYMENT_INFO.md` and `contracts/script/ExecuteAfterDelay.s.sol`.

**📋 Full Address List:** See [CONTRACT_ADDRESSES.md](./CONTRACT_ADDRESSES.md) for complete details.

-----

## 🎨 Platform Screenshots

<div align="center">

### Portfolio & Leaderboard

![Portfolio Page](./docs/images/portfolio-page.png) | ![Leaderboard Page](./docs/images/leaderboard-page.png)
:---: | :---:
*Track your positions and performance* | *Compete with top traders*

</div>

-----

## 💻 Developer Guide

### Prerequisites

- [Foundry](https://getfoundry.sh/)
- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

```bash
git clone https://github.com/speculatedotfun/SpeculateX.git
cd speculatev1

# Install contract dependencies
cd contracts
forge install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

#### Contracts

Create a `.env` file in the `contracts` directory:

```env
# Required
PRIVATE_KEY=your_deployer_private_key
BSC_TESTNET_RPC_URL=https://bsc-testnet.publicnode.com
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org
BSCSCAN_API_KEY=your_bscscan_api_key

# Optional (for scripts)
USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
SPECULATE_CORE_ADDRESS=0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725
CHAINLINK_RESOLVER_ADDRESS=0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3
TREASURY_ADDRESS=0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778
```

#### Frontend

Create a `.env.local` file in the `frontend` directory:

```env
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Optional (defaults provided)
NEXT_PUBLIC_RPC_URL=https://bsc-testnet.publicnode.com
NEXT_PUBLIC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org
NEXT_PUBLIC_GOLDSKY_HTTP_URL=your_goldsky_subgraph_url
```

**📝 Full Setup Guide:** See [ENV_SETUP.md](./ENV_SETUP.md) for detailed instructions.

### Build & Test

#### Contracts

```bash
cd contracts

# Compile contracts
forge build

# Run unit tests
forge test

# Run specific test with traces
forge test --match-contract SpeculateCoreTest -vvvv

# Check test coverage (qualitative assessment: 95%+)
forge coverage
```

#### Frontend

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

### Deployment

#### Testnet

```bash
cd contracts
forge script script/DeployCoreOnly.s.sol:DeployCoreOnly \
  --rpc-url $BSC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

#### Mainnet

```bash
cd contracts
forge script script/DeployMainnet.s.sol:DeployMainnet \
  --rpc-url bsc_mainnet \
  --broadcast \
  --verify
```

**⚠️ Important:** Before deploying to Mainnet:
1. Verify all Chainlink feed addresses
2. Ensure you have sufficient BNB for gas
3. Use a dedicated deployment wallet
4. Transfer ownership to a multisig after deployment

**📋 Full Deployment Guide:** See [MAINNET_DEPLOYMENT.md](./contracts/MAINNET_DEPLOYMENT.md) for complete instructions.

-----

## 📜 Interaction Guide

### 1. Creating a Market

Call `createMarket` on `SpeculateCore`:

```solidity
createMarket(
    "Will BTC hit 100k?", // Question
    "BTC100k-YES",        // Yes Symbol
    "BTC100k-NO",         // No Symbol
    1000 * 1e6,           // Initial Liquidity (USDC)
    expiryTimestamp,      // Unix Timestamp
    oracleAddress,        // Chainlink Feed Address (or 0x0 for manual)
    feedId,               // bytes32 ID (e.g. keccak256("BTC/USD"))
    targetValue,          // e.g. 100000 * 1e8
    Comparison.Above      // 0 = Above, 1 = Below, 2 = Equal
)
```

### 2. Trading

Call `buy` to purchase positions:

```solidity
// Buy YES tokens with 50 USDC
core.buy(marketId, true, 50 * 1e6, minTokensOut);
```

### 3. Resolution (Automated)

1. Chainlink Keepers call `checkUpkeep` to scan for expired markets.
2. If `upkeepNeeded` is true, Keepers call `performUpkeep`.
3. `ChainlinkResolver` fetches the price, verifies it, and calls `resolveMarketWithPrice` on the Core.
4. Winning outcome is set, and trading stops.

-----

## 🧪 Testing

The protocol includes comprehensive test coverage:

- **Unit Tests:** All core functionality tested
- **Fuzz Tests:** Randomized input testing
- **Invariant Tests:** System-wide property verification
- **Coverage:** 95%+ code coverage (qualitative assessment)

Run tests:

```bash
cd contracts
forge test -vvv
```

-----

## 📚 Documentation

- [Contract Addresses](./CONTRACT_ADDRESSES.md) - Complete address list for all networks
- [Deployed Addresses](./DEPLOYED_ADDRESSES.md) - Production deployment addresses
- [Environment Setup](./ENV_SETUP.md) - Detailed environment variable guide
- [Mainnet Deployment](./contracts/MAINNET_DEPLOYMENT.md) - Mainnet deployment guide
- [Chainlink Automation Setup](./contracts/CHAINLINK_AUTOMATION_SETUP.md) - Chainlink setup guide

-----

## 🔗 Links

- **BscScan Mainnet:** https://bscscan.com/
- **BscScan Testnet:** https://testnet.bscscan.com/
- **Chainlink Price Feeds:** https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain
- **WalletConnect Cloud:** https://cloud.reown.com/

-----

## 📄 License

This project is licensed under the **MIT License**.

-----

**Disclaimer:** This is production software deployed on BSC Mainnet. Use real funds at your own risk. Prediction markets involve risk. Trade responsibly.
