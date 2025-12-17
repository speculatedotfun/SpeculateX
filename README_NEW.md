# SpeculateX Protocol

> Note: `README_NEW.md` is kept for historical reference. The up-to-date documentation is in `README.md`.

<div align="center">

![SpeculateX Banner](./docs/images/home-page.png)

**Decentralized, Automated Prediction Markets on BNB Chain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-e6e6e6?logo=solidity)](https://soliditylang.org/)
[![BSC Testnet](https://img.shields.io/badge/BSC-Testnet-yellow)](https://testnet.bscscan.com/)
[![Foundry](https://img.shields.io/badge/Foundry-1.0-blue)](https://getfoundry.sh/)

[🚀 Live Demo](http://localhost:3003) • [📚 Documentation](./docs) • [💬 Discord](https://discord.gg/speculatex) • [🐦 Twitter](https://twitter.com/speculatex)

</div>

-----

## 📖 Overview

**SpeculateX** is a decentralized prediction market protocol that allows users to trade on real-world events (Crypto Prices, Sports, Economics). Unlike traditional order-book exchanges, SpeculateX utilizes an **Automated Market Maker (AMM)** based on the **Logarithmic Market Scoring Rule (LMSR)** to ensure constant liquidity and fair pricing.

The protocol features a "Be The Market" architecture where users can provide liquidity to specific markets and earn trading fees, alongside a robust **Chainlink Automation** system for trustless market resolution.

-----

## ⚙️ Core Architecture

<div align="center">

![Markets Overview](./docs/images/markets-page.png)

*Explore active markets with real-time statistics*

</div>

The protocol consists of several modular smart contracts:

### 1. 🧠 SpeculateCore.sol (The Engine)

The central hub of the protocol.

- **Market Management:** Handles creation, trading, and liquidity provisioning.
- **Positions:** Mints and burns `YES` and `NO` ERC20 tokens.
- **Fees:** Distributes fees between the Treasury, the Market Vault, and Liquidity Providers.
- **Safety:** Implements slippage protection, price jump caps, and reentrancy guards.

### 2. 🧮 LMSRMath.sol (The Logic)

A specialized math library implementing the Logarithmic Market Scoring Rule.

- **Pricing:** Calculates spot prices and trade costs using high-precision fixed-point arithmetic (18 decimals).
- **Cost Function:** `C(q) = b * ln(exp(qYes/b) + exp(qNo/b))`.
- **Liquidity Parameter (b):** Dynamically adjusts based on the total liquidity in the pool.

### 3. 🤖 ChainlinkResolver.sol (The Oracle)

Ensures trustless and automated settlement.

- **Automation:** Implements `checkUpkeep` and `performUpkeep` for Chainlink Keepers to auto-resolve markets upon expiry.
- **Validation:** Checks for staleness, price bounds (±50% safety), and supports multi-source verification.
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

-----

## 🛠 Deployment (BSC Testnet)

<div align="center">

![Market Trading Interface](./docs/images/market-trading.png)

*Trade YES/NO positions with instant execution*

</div>

| Contract | Address | Explorer |
|----------|---------|----------|
| **SpeculateCore** | `0x297f325e98DdFd682dd2dc964a5BEda9861D54D5` | [View on BscScan](https://testnet.bscscan.com/address/0x297f325e98DdFd682dd2dc964a5BEda9861D54D5) |
| **ChainlinkResolver** | `0x363eaff32ba46F804Bc7E6352A585A705ac97aBD` | [View on BscScan](https://testnet.bscscan.com/address/0x363eaff32ba46F804Bc7E6352A585A705ac97aBD) |
| **MockUSDC** | `0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e` | [View on BscScan](https://testnet.bscscan.com/address/0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e) |
| **Treasury** | Integrated in Core | Multi-signature treasury wallet |
| **Admin** | `0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F` | Protocol administrator address |

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
- [Node.js](https://nodejs.org/) (for local scripts if needed)

### Installation

```bash
git clone https://github.com/speculatedotfun/SpeculateX.git
cd speculatev1
cd contracts
forge install
```

### Configuration

Create a `.env` file in the `contracts` directory:

```env
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSCSCAN_API_KEY=YourApiKey
PRIVATE_KEY=YourDeployerKey
```

### Build & Test

```bash
cd contracts

# Compile contracts
forge build

# Run unit tests
forge test

# Run specific test with traces
forge test --match-contract SpeculateCoreTest -vvvv
```

### Deployment

To deploy to BSC Testnet using the provided script:

```bash
forge script script/DeployCoreOnly.s.sol:DeployCoreOnly --rpc-url $BSC_TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify -vvvv
```

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

## 📄 License

This project is licensed under the **MIT License**.

-----

**Disclaimer:** This is experimental software deployed on Testnet. Do not use real funds. Prediction markets involve risk. Trade responsibly.

