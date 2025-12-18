---
# SpeculateX — Be the Market

## TL;DR

SpeculateX is a prediction market protocol where:
- **Creators** launch markets by seeding liquidity.
- **Traders** buy YES/NO positions with instant execution (AMM/LMSR).
- **Liquidity providers (LPs)** deepen markets and **earn trading fees**.

Each market is its own mini-economy: pricing, liquidity, fees, and settlement are handled on-chain.

> **Scope of this doc:** This describes the **current V1 implementation** (Diamond Router + Facets on Testnet). Any “V2” concepts below are explicitly marked as roadmap.

---

## What “Be the Market” means

Most prediction markets have two big problems:
- **Liquidity is thin** → prices jump, slippage is high, and traders don’t trust the odds.
- **Users are passive** → traders trade, but don’t benefit from market growth.

SpeculateX flips this:
- If you add liquidity to a market, you become part of the infrastructure that powers it.
- You earn a share of the market’s trading fees.

You’re not just trading against a platform — you’re helping run the market.

---

## How a SpeculateX market works (V1)

Each market has exactly two outcome tokens:
- **YES** token (ERC20)
- **NO** token (ERC20)

Trading is handled by an AMM (LMSR). The **YES price** (0 to 1) represents the market-implied probability of YES; NO is roughly \(1 - p_{yes}\).

### Lifecycle

1. **Create**: a creator sets the question + expiry + resolution config and seeds USDC.
2. **Trade**: users buy/sell YES/NO using USDC.
3. **Resolve**: after expiry, the market is resolved (e.g., via Chainlink feed).
4. **Redeem**: winners redeem for payout; LPs claim any residual vault funds.

---

## V1: Instant market creation (what’s live today)

### Market creation

To create a market, the creator provides:
- A **question** (human-readable title)
- Outcome token names/symbols
- Initial seed liquidity (**initUsdc**)
- Expiry time (**expiryTimestamp**)
- Optional Chainlink oracle config (feed + target + comparison)

**Important implementation detail:** In the current V1 contracts, liquidity is **not withdrawable**. There is no `removeLiquidity()`.

Why:
- It simplifies solvency and accounting.
- It aligns LP incentives with market quality and trading volume.

### Trading & pricing (LMSR AMM)

Traders can:
- **Buy** YES or NO with USDC
- **Sell** YES or NO back to the pool

Prices move continuously based on LMSR math. There is no order book.

### Fees (V1)

Each trade takes a fee (basis points) split between:
- **Protocol treasury**
- **Liquidity providers (LPs)** (claimable via `claimLpFees`)
- **Market vault** (reinvested into the vault to deepen liquidity/solvency)

> Fees are configurable on-chain. Do not assume a fixed 1% split unless the deployed config sets it.

### LP economics (V1)

LP actions:
- **Add liquidity** at any time (`addLiquidity`)
- **Claim fees** at any time (`claimLpFees`)
- **After resolution**, claim any **residual vault funds** (`claimLpResidual`)

LPs cannot withdraw principal in V1. The “reward” is fees + residuals.

---

## Resolution: what users must understand

### Resolve-time snapshot

For Chainlink markets, resolution is **snapshotted at resolve-time**:
- The first successful call to the resolver after `expiryTimestamp` determines the price used for resolution.

This is a design choice:
- **Pro:** no single party can block resolution forever.
- **Con:** there is a “race” to resolve first; automation is recommended to reduce timing discretion.

### Oracle safety

The system enforces:
- **staleness bounds** (reject old oracle updates)
- **decimal guardrails** (avoid accidental scaling mismatches)

---

## Market titles without subgraphs

Market questions are stored on-chain and read via:
- `getMarketQuestion(uint256)`

This means the frontend does **not** need to depend on a subgraph for market titles (important for reliability when subgraphs lag or RPC nodes prune logs).

---

## Architecture note (V1 on Testnet today)

The Testnet deployment uses a Diamond-style architecture:
- **Router**: single entry point (`SpeculateCoreRouter`)
- **Facets**: `MarketFacet`, `TradingFacet`, `LiquidityFacet`, `SettlementFacet`

This makes it easier to modularize logic and avoid contract size limits.

---

## V2 (Roadmap): Bonding curve launch + LLT

This section is conceptual and **not deployed** in the current contracts.

In a potential V2, markets could start in a funding phase:
- A bonding curve provides transparent early price discovery.
- A **Launch Liquidity Threshold (LLT)** defines when the market becomes fully active.

Goal:
- Reduce reliance on a single creator’s seed capital.
- Let communities bootstrap markets into deep liquidity before live trading.

---

## FAQ

### Can I withdraw liquidity?
Not in V1. You can claim fees during the market and claim residuals after resolution.

### Who can resolve?
Anyone can call the resolver after expiry (or automation/bots can do it).

### Does the UI require the subgraph for market titles?
No. Titles are on-chain via `getMarketQuestion(uint256)`.

---

## Disclaimer

This document is informational. Prediction markets involve risk. Always verify deployed contract behavior and parameters before using real funds.
