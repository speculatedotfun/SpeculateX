# SpeculateX Protocol

<div align="center">

![SpeculateX](https://img.shields.io/badge/SpeculateX-Prediction%20Markets-blue?style=for-the-badge)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-11-orange?style=for-the-badge)
![Audit](https://img.shields.io/badge/Audit-Passed-brightgreen?style=for-the-badge)

**Decentralized Prediction Markets powered by LMSR and Chainlink Oracles**

[Live Demo](https://speculatex.io) • [Documentation](#-documentation) • [Quick Start](#-quick-start) • [Security](#-security)

</div>

---

## 🚀 Mainnet Deployment

**Status:** ✅ **Live on BSC Mainnet**
**Network:** Binance Smart Chain (Chain ID: 56)
**All Contracts Verified** on [BscScan](https://bscscan.com/)

### Contract Addresses

| Contract | Address | Verified |
|----------|---------|----------|
| **CoreRouter** ⭐ | [`0x101450a49E730d2e9502467242d0B6f157BABe60`](https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#code) | ✅ |
| Treasury | [`0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70`](https://bscscan.com/address/0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70#code) | ✅ |
| ChainlinkResolver | [`0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b`](https://bscscan.com/address/0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b#code) | ✅ |

⭐ **Use CoreRouter address** for all protocol interactions

[View all contracts →](contracts/deployments/mainnet/addresses.json) | [Deployment Details →](DEPLOYMENT_SUCCESS.md)

---

## 📖 Table of Contents

- [What is SpeculateX?](#-what-is-speculatex)
- [How It Works](#-how-it-works)
- [Architecture](#%EF%B8%8F-architecture)
- [Smart Contracts](#-smart-contracts)
- [Key Features](#-key-features)
- [Security](#-security)
- [Deployment](#-deployment)
- [Developer Guide](#-developer-guide)
- [API Reference](#-api-reference)
- [Documentation](#-documentation)

---

## 🎯 What is SpeculateX?

SpeculateX is a **decentralized prediction market protocol** that allows users to trade on the outcome of future events using cryptocurrency. Unlike traditional betting platforms, SpeculateX has no centralized operator - prices are determined by supply and demand, and payouts are guaranteed by smart contracts.

### Key Advantages

| Traditional Betting | SpeculateX |
|---------------------|------------|
| Trust the bookmaker | Trust the code |
| House can refuse payout | Automatic, guaranteed payout |
| House sets the odds | Market sets the odds |
| Centralized control | Fully decentralized |
| Your funds in their custody | Your funds in your wallet |

---

## 🔮 How It Works

### The Basic Flow

```
1. MARKET CREATION
   └── "Will BTC be above $100,000 on Jan 1, 2026?"
   
2. TRADING PHASE
   ├── Users who think YES → Buy YES tokens
   └── Users who think NO → Buy NO tokens
   
3. PRICE DISCOVERY
   └── Token prices = Market's belief (YES at $0.70 = 70% probability)
   
4. RESOLUTION
   └── Chainlink oracle reports BTC price on Jan 1, 2026
   
5. PAYOUT
   ├── If BTC > $100k → YES holders get $1 per token
   └── If BTC ≤ $100k → NO holders get $1 per token
```

### Practical Example

```
Market: "Will ETH exceed $5,000 by June 2025?"

Current State:
├── YES Token Price: $0.35
├── NO Token Price: $0.65
└── Market Belief: 35% chance ETH hits $5k

Alice thinks ETH will hit $5k:
├── Spends: 100 USDC
├── Fees: 2 USDC (1% treasury + 1% LP)
├── Receives: ~280 YES tokens (at $0.35 each)
└── If correct: 280 × $1 = $280 (180% profit)
    If wrong: 280 × $0 = $0 (100% loss)
```

### LMSR Pricing

SpeculateX uses the **Logarithmic Market Scoring Rule (LMSR)** for pricing:

```
Price_YES = e^(qYes/b) / (e^(qYes/b) + e^(qNo/b))

Where:
- qYes = Total YES tokens minted
- qNo = Total NO tokens minted  
- b = Liquidity parameter (higher = more stable prices)
```

**Key Properties:**
- Prices always between $0 and $1
- YES + NO prices always equal ~$1
- More liquidity (b) = smaller price impact per trade
- Mathematically guaranteed solvency

---

## ⚙️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│                    (Web App / Mobile / API)                          │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SPECULATECOREROUTER                              │
│                    (Diamond Proxy Pattern)                           │
│                                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ MarketFacet │ │TradingFacet │ │LiquidityFacet│ │SettlementFacet│  │
│  │             │ │             │ │             │ │             │   │
│  │• createMkt  │ │• buy        │ │• addLiq     │ │• resolve    │   │
│  │• getState   │ │• sell       │ │• removeLiq  │ │• redeem     │   │
│  │• getInfo    │ │• spotPrice  │ │• claimFees  │ │• cancel     │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                                      │
│                         CORE STORAGE                                 │
│              (Shared state across all facets)                        │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                         │
         ▼                    ▼                         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│    TREASURY     │  │      USDC       │  │   CHAINLINK RESOLVER    │
│                 │  │   (Collateral)  │  │                         │
│ Collects 1% fee │  │ Backs all       │  │ • Reads price feeds     │
│ from trades     │  │ positions       │  │ • Validates rounds      │
│                 │  │                 │  │ • Triggers resolution   │
└─────────────────┘  └─────────────────┘  └─────────────────────────┘
```

### Why Diamond Pattern?

The protocol uses [EIP-2535 Diamond Standard](https://eips.ethereum.org/EIPS/eip-2535) for:

1. **Upgradeability** - Fix bugs or add features without changing the main address
2. **Size Limits** - Bypass the 24KB contract size limit
3. **Modularity** - Each facet handles one responsibility
4. **Gas Efficiency** - Only deploy what you need

---

## 📜 Smart Contracts

### Contract Overview

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| `SpeculateCoreRouter` | Main entry point, routes calls to facets | `scheduleOp`, `executeSetFacet`, `fallback` |
| `CoreStorage` | Shared storage layout for all facets | N/A (inherited) |
| `MarketFacet` | Market creation and queries | `createMarket`, `getMarketState` |
| `TradingFacet` | Buy/sell operations | `buy`, `sell`, `spotPriceYesE6` |
| `LiquidityFacet` | LP operations | `addLiquidity`, `removeLiquidity`, `claimLpFees` |
| `SettlementFacet` | Market resolution and payouts | `resolveMarketWithPrice`, `redeem`, `emergencyCancelMarket` |
| `ChainlinkResolver` | Oracle integration | `resolve` |
| `Treasury` | Protocol fee collection | `withdraw`, `scheduleLargeWithdraw` |
| `PositionToken` | YES/NO ERC20 tokens | `mint`, `burn` (core only) |
| `LMSRMath` | Pricing mathematics | `calculateCost`, `calculateSpotPrice` |

### Contract Details

#### SpeculateCoreRouter

The main entry point for all user interactions. Uses `delegatecall` to route function calls to the appropriate facet.

```solidity
// All admin operations require 24h timelock
function scheduleOp(bytes32 tag, bytes calldata data) external returns (bytes32 opId);
function executeSetFacet(bytes32 opId, bytes4 selector, address facet) external;
function executePause(bytes32 opId) external;
function executeUnpause(bytes32 opId) external;

// Pause whitelist - these work even when paused:
// - resolveMarketWithPrice (settle markets)
// - redeem (withdraw winnings)
// - claimLpFees (withdraw LP rewards)
// - claimLpResidual (withdraw LP residual)
// - emergencyCancelMarket (emergency refund)
```

#### MarketFacet

Handles market creation and information queries.

```solidity
function createMarket(
    string memory question,      // "Will BTC > $100k?"
    string memory yesName,       // "BTC-100K-YES"
    string memory yesSymbol,     // "YES"
    string memory noName,        // "BTC-100K-NO"
    string memory noSymbol,      // "NO"
    uint256 initUsdc,            // Initial liquidity (min 500 USDC)
    uint256 expiryTimestamp,     // When market expires
    address oracleFeed,          // Chainlink feed address
    bytes32 priceFeedId,         // Optional identifier
    uint256 targetValue,         // Target price (e.g., 100000e8)
    Comparison comparison        // Above, Below, or Equals
) external returns (uint256 id);

function getMarketState(uint256 id) external view returns (...);
function getMarketResolution(uint256 id) external view returns (...);
function getMarketQuestion(uint256 id) external view returns (string memory);
function getMarketInvariants(uint256 id) external view returns (...);
```

#### TradingFacet

Handles all trading operations with MEV protection.

```solidity
// Buy tokens (with deadline for MEV protection)
function buy(
    uint256 id,           // Market ID
    bool isYes,           // true = YES, false = NO
    uint256 usdcIn,       // Amount to spend
    uint256 minSharesOut  // Slippage protection
) external;

function buy(
    uint256 id,
    bool isYes,
    uint256 usdcIn,
    uint256 minSharesOut,
    uint256 deadline      // Transaction expires after this timestamp
) external;

// Sell tokens
function sell(uint256 id, bool isYes, uint256 sharesIn, uint256 minUsdcOut) external;
function sell(uint256 id, bool isYes, uint256 sharesIn, uint256 minUsdcOut, uint256 deadline) external;

// Price queries
function spotPriceYesE18(uint256 id) external view returns (uint256); // 18 decimals
function spotPriceYesE6(uint256 id) external view returns (uint256);  // 6 decimals (USDC)
```

#### LiquidityFacet

Manages liquidity provider operations.

```solidity
function addLiquidity(uint256 id, uint256 usdcAdd) external;
function removeLiquidity(uint256 id, uint256 usdcRemove) external;
function claimLpFees(uint256 id) external;
```

**How LP Works:**
1. LPs deposit USDC → receive proportional shares
2. Every trade pays 1% fee to LPs (accumulated per-USDC)
3. LPs can claim fees anytime via `claimLpFees`
4. After resolution, excess vault funds go to LPs as "residual"

#### SettlementFacet

Handles market resolution and payouts.

```solidity
// Called by ChainlinkResolver only
function resolveMarketWithPrice(uint256 id, uint256 price) external;

// Emergency cancel (24h timelock, 50% payout to all)
function emergencyCancelMarket(bytes32 opId, uint256 id) external;

// Redeem winning tokens for USDC
function redeem(uint256 id, bool isYes) external;

// LP claims residual after resolution
function claimLpResidual(uint256 id) external;
function pendingLpResidual(uint256 id, address lp) external view returns (uint256);
```

#### ChainlinkResolver

Trustless oracle integration with manipulation protection.

```solidity
function resolve(uint256 marketId, uint80 roundId) external;
```

**Resolution Requirements:**
1. Market must be expired (`block.timestamp >= expiryTimestamp`)
2. `roundId` must be the **first** Chainlink round **after** expiry
3. Previous round must be **before** expiry (proves first-ness)
4. Data must not be stale (< 2 hours old)
5. Decimals must match what was recorded at market creation

**Why "First Round After Expiry"?**
```
Without this rule:
- Expiry: Jan 1, 12:00
- Round A (11:55): BTC = $99,500
- Round B (12:05): BTC = $100,500

Attacker could pick whichever round benefits them.

With this rule:
- Only Round B is valid (first after expiry)
- No manipulation possible
```

---

## 🔑 Key Features

### 1. MEV Protection

```solidity
// Deadline parameter prevents stale transactions
function buy(..., uint256 deadline) {
    if (deadline != 0 && block.timestamp > deadline) revert Expired();
    ...
}
```

If your transaction gets stuck in the mempool and prices move against you, the deadline ensures it fails instead of executing at a bad price.

### 2. Slippage Protection

```solidity
// minSharesOut ensures you get at least this many tokens
if (sharesOut < minSharesOut) revert SlippageExceeded();
```

### 3. Solvency Guarantee

```solidity
// Invariant: vault >= max(circulatingYes, circulatingNo) / 1e12
// Checked on EVERY trade
function _enforceSafety(...) {
    uint256 maxCir = max(cirYes, cirNo);
    uint256 liabilityUSDC = maxCir / 1e12;
    if (vaultValue < liabilityUSDC) revert BackingInsufficient();
}
```

The vault **always** has enough USDC to pay the winning side.

### 4. Price Band Protection

```solidity
// Limits price movement per trade (default: 15%)
if (priceDiff > maxInstantJumpE18) revert SolvencyIssue();
```

Prevents manipulation in low-liquidity markets.

### 5. 24h Admin Timelock

```solidity
// All admin actions require scheduling + 24h wait
uint256 public constant ABSOLUTE_MIN_DELAY = 24 hours;
```

Gives users time to exit if they disagree with upcoming changes.

### 6. Pause Whitelist

Even when paused, users can still:
- ✅ Resolve markets
- ✅ Redeem winnings  
- ✅ Claim LP fees
- ✅ Claim LP residual

This ensures users can always access their funds in emergencies.

---

## 🔐 Security

### Audit Status

| Audit | Status | Report |
|-------|--------|--------|
| Internal Review v11 | ✅ Passed | See `audits/v11_audit.md` |
| External Audit | 🔄 Pending | - |

### Security Features

| Feature | Implementation |
|---------|----------------|
| Reentrancy Protection | `nonReentrant` modifier on all state-changing functions |
| Access Control | OpenZeppelin `AccessControl` with roles |
| Overflow Protection | Solidity 0.8+ native checks |
| Oracle Validation | Staleness checks, round validation, decimal verification |
| Admin Timelock | 24h minimum delay on all admin operations |
| Pause Mechanism | Emergency stop with user withdrawal whitelist |
| Solvency Checks | Enforced on every trade |

### Trust Assumptions

1. **Chainlink Oracles** - Trusted for price data (industry standard)
2. **Admin Multisig** - Can upgrade facets (timelocked 24h)
3. **USDC** - Assumed to be standard ERC20

### Known Limitations

- Maximum market duration: 365 days
- Maximum trade size: 100,000 USDC (configurable)
- Minimum liquidity: 500 USDC
- Resolution depends on Chainlink uptime

---

## 🚀 Deployment

### BSC Mainnet (Chain ID: 56)

| Contract | Address |
|----------|---------|
| SpeculateCore (Legacy) | `0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725` |
| ChainlinkResolver | `0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3` |
| Treasury | `0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778` |
| USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |

### BSC Testnet (Chain ID: 97)

| Contract | Address |
|----------|---------|
| SpeculateCoreRouter | `0x601c5DA28dacc049481eD853E5b59b9F20Dd44a8` |
| MarketFacet | `0x12886B7d5C5Ebb15B29F70e3De1c90A359a74B93` |
| TradingFacet | `0xe9521eA09C960780fe58bf625CA2b94D60E37a70` |
| LiquidityFacet | `0xe975a09183a61Cdb1f7279265B75da6EEB24e6A4` |
| SettlementFacet | `0x88A7F6DdeA0BCD7998d78331313E6fb8504039c1` |
| ChainlinkResolver | `0xe51729af202D801B7F7f87A6d04B447CcBaDe576` |
| Treasury | `0x155FB12aD27259212f000443531fAe8a629F2A19` |
| MockUSDC | `0x845740D345ECba415534df44C580ebb3A2432719` |

### Function Selectors (v11)

```solidity
// TradingFacet (7 selectors)
bytes4(keccak256("spotPriceYesE18(uint256)"))
bytes4(keccak256("spotPriceYesE6(uint256)"))
bytes4(keccak256("getMaxJumpE18(uint256)"))
bytes4(keccak256("buy(uint256,bool,uint256,uint256)"))
bytes4(keccak256("buy(uint256,bool,uint256,uint256,uint256)"))
bytes4(keccak256("sell(uint256,bool,uint256,uint256)"))
bytes4(keccak256("sell(uint256,bool,uint256,uint256,uint256)"))

// MarketFacet (5 selectors)
bytes4(keccak256("createMarket(string,string,string,string,string,uint256,uint256,address,bytes32,uint256,uint8)"))
bytes4(keccak256("getMarketState(uint256)"))
bytes4(keccak256("getMarketResolution(uint256)"))
bytes4(keccak256("getMarketQuestion(uint256)"))
bytes4(keccak256("getMarketInvariants(uint256)"))

// LiquidityFacet (3 selectors)
bytes4(keccak256("addLiquidity(uint256,uint256)"))
bytes4(keccak256("removeLiquidity(uint256,uint256)"))
bytes4(keccak256("claimLpFees(uint256)"))

// SettlementFacet (5 selectors)
bytes4(keccak256("resolveMarketWithPrice(uint256,uint256)"))
bytes4(keccak256("emergencyCancelMarket(bytes32,uint256)"))
bytes4(keccak256("redeem(uint256,bool)"))
bytes4(keccak256("pendingLpResidual(uint256,address)"))
bytes4(keccak256("claimLpResidual(uint256)"))

// Total: 20 selectors
```

---

## 💻 Developer Guide

### Prerequisites

- [Foundry](https://getfoundry.sh/) (forge, cast, anvil)
- [Node.js](https://nodejs.org/) v18+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/speculatex/speculatex-protocol.git
cd speculatex-protocol

# Install dependencies
cd contracts
forge install

# Copy environment file
cp .env.example .env
# Edit .env with your values
```

### Environment Variables

```env
# Required
PRIVATE_KEY=your_deployer_private_key
BSC_TESTNET_RPC_URL=https://bsc-testnet.publicnode.com
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org
BSCSCAN_API_KEY=your_bscscan_api_key

# Optional
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Build & Test

```bash
# Compile
forge build

# Run tests
forge test

# Run tests with verbosity
forge test -vvvv

# Run specific test
forge test --match-contract TradingFacetTest

# Check coverage
forge coverage

# Gas report
forge test --gas-report
```

### Deploy

#### Testnet

```bash
# Deploy all contracts
forge script script/DeploySpeculateX.s.sol:DeploySpeculateX \
  --rpc-url bsc_testnet \
  --broadcast \
  --verify

# Note: Testnet uses timelock=0 for convenience
```

#### Mainnet

```bash
# ⚠️ IMPORTANT: Change ABSOLUTE_MIN_DELAY to 24 hours before mainnet!

forge script script/DeploySpeculateX.s.sol:DeploySpeculateX \
  --rpc-url bsc_mainnet \
  --broadcast \
  --verify \
  --slow
```

### Verify Contracts

```bash
forge verify-contract \
  --chain-id 97 \
  --watch \
  CONTRACT_ADDRESS \
  src/ContractName.sol:ContractName
```

---

## 📚 API Reference

### For Traders

```solidity
// Check current price
uint256 price = router.spotPriceYesE6(marketId);
// Returns: 650000 = $0.65

// Buy YES tokens
router.buy(
    marketId,           // Market ID
    true,               // isYes
    100e6,              // 100 USDC
    90e18,              // Minimum 90 tokens (slippage protection)
    block.timestamp + 300  // 5 minute deadline
);

// Sell YES tokens
router.sell(
    marketId,
    true,               // isYes
    50e18,              // 50 tokens
    45e6,               // Minimum 45 USDC back
    block.timestamp + 300
);

// Redeem after resolution
router.redeem(marketId, true); // isYes
```

### For Liquidity Providers

```solidity
// Add liquidity
router.addLiquidity(marketId, 1000e6); // 1000 USDC

// Check pending fees
uint256 fees = router.pendingLpFees(marketId, myAddress);

// Claim fees
router.claimLpFees(marketId);

// Remove liquidity
router.removeLiquidity(marketId, 500e6); // 500 USDC

// After resolution: claim residual
router.claimLpResidual(marketId);
```

### For Market Creators

```solidity
// Create market
uint256 marketId = router.createMarket(
    "Will BTC exceed $150,000 by Dec 31, 2025?",
    "BTC-150K-YES",
    "YES",
    "BTC-150K-NO", 
    "NO",
    5000e6,                           // 5000 USDC initial liquidity
    1767139200,                       // Dec 31, 2025 00:00 UTC
    0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c,  // Chainlink BTC/USD
    bytes32(0),                       // Optional ID
    150000e8,                         // Target: $150,000 (8 decimals)
    Comparison.Above                  // YES wins if price > target
);
```

### For Admins

```solidity
// Schedule facet update (requires 24h wait)
bytes32 opId = router.scheduleOp(
    keccak256("OP_SET_FACET"),
    abi.encode(selector, newFacetAddress)
);

// Wait 24 hours...

// Execute update
router.executeSetFacet(opId, selector, newFacetAddress);

// Emergency pause
bytes32 pauseOpId = router.scheduleOp(keccak256("OP_PAUSE"), "");
// Wait 24 hours...
router.executePause(pauseOpId);
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Technical Guide](./docs/TECHNICAL_GUIDE.md) | Deep dive into how everything works |
| [Security Audit](./audits/v11_audit.md) | v11 security audit report |
| [Deployment Guide](./docs/DEPLOYMENT.md) | Step-by-step deployment instructions |
| [Contract Addresses](./docs/ADDRESSES.md) | All deployed contract addresses |
| [Chainlink Setup](./docs/CHAINLINK.md) | Oracle configuration guide |




# Open PR
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## ⚠️ Disclaimer

This is production software handling real funds. Use at your own risk. Prediction markets involve financial risk. Trade responsibly. Not financial advice.

---

<div align="center">

**Built with ❤️ by the SpeculateX Team**

[Website](https://speculatex.io) • [Twitter](https://twitter.com/speculatex) • [Discord](https://discord.gg/speculatex) • [Docs](https://docs.speculatex.io)

</div>