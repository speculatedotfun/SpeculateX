# SpeculateX: Be the Market

## TL;DR

SpeculateX introduces a new standard for prediction markets, one where anyone can become the market itself.

Instead of simply betting on outcomes, users create, fund, and own markets, earning a share of the fees they generate.

In V1, markets are launched instantly with self-funded liquidity.

In V2, a Bonding Curve and Launch Liquidity Threshold (LLT) mechanism let communities collectively bootstrap markets before they go live.

SpeculateX empowers creators, traders, and liquidity providers alike, transforming prediction markets into a new form of on-chain competition and ownership.

---

## Overview: Be the Market

Traditional prediction markets are limited by centralized control, low liquidity, and one-sided participation.

SpeculateX changes that by introducing a fully decentralized model where anyone can open a market, supply liquidity, and share in the platform's revenue.

Here, you don't just trade the market — you become the market.

Each market is a self-contained economy with its own liquidity pool, fee system, and market dynamics.

SpeculateX's AMM engine ensures that prices are fair and self-adjusting, while the LP fee structure guarantees that contributors benefit directly from activity in the markets they help create.

---

## The Problem

Prediction markets hold immense potential for discovering truth and aggregating collective intelligence, but existing systems are still far from realizing that vision.

1. **Centralized control** - most markets are limited to what a single platform or team decides to list, restricting creativity and innovation.

2. **Low liquidity** - many markets lack depth, making prices volatile and discouraging serious participation.

3. **Passive users** - traders speculate, but they don't share in the success of the markets they help grow.

4. **Barriers to creation** - launching a market often requires complex setups or large capital requirements.

5. **Fragmented incentives** - creators, traders, and liquidity providers operate in isolation instead of mutually benefiting from one another.

SpeculateX solves these problems by redesigning prediction markets from the ground up, transforming them from isolated pools of speculation into collaborative, self-owned economies.

---

## What Differentiates SpeculateX

SpeculateX is not another betting platform. It's an open prediction economy built around fairness, accessibility, and participation.

Here's what sets it apart:

1. **Anyone Can "Be the Market"** - On SpeculateX, anyone can create a market, provide liquidity, and share in its revenue. Ownership isn't limited to a protocol or a company; it's distributed among the participants who make the market thrive.

2. **Shared Fee Model** - Every action — creation, trading, or liquidity provision — generates fees that are shared between creators, LPs, and the protocol, aligning incentives across all participants.

3. **Dynamic and Fair Market Discovery** - Through the bonding curve mechanism, early participants gain better entry prices and transparent price discovery before markets activate — reducing manipulation and improving fairness.

4. **Curated Expansion Path** - SpeculateX begins with fully on-chain markets but is designed to scale into curated off-chain and real-world predictions managed by verified creators and curators, enabling wider adoption with credibility.

5. **Sustainable Ecosystem** - A 1% fee on every trade — split between protocol, creators, and LPs — ensures ongoing liquidity, continuous development, and a sustainable economic loop.

---

## How It Works

Every SpeculateX market is composed of two shares — YES and NO — representing the possible outcomes of an event.

These shares are always traded against one another within a single liquidity pool.

- Traders buy or sell shares to express their belief in an outcome.
- The price of each share represents the market-implied probability of that outcome.
- Liquidity Providers (LPs) supply funds to enable deeper trading depth and earn a share of transaction fees.
- Market Creators set up the market parameters and share in LP rewards.

When the market resolves, holders of the correct outcome (YES or NO) can redeem their shares for 1 unit of settlement value (e.g., 1 USDC).

---

## Version 1: Instant Market Creation

### Overview

In SpeculateX V1, anyone can create a market instantly.

To launch, the creator deposits an initial liquidity amount that allows immediate trading between YES and NO shares.

- Each share starts at 0.5 USDC (representing 50% probability for YES and NO).
- Trading begins as soon as the pool is live.
- Prices move dynamically as traders buy or sell shares, updating the implied odds.

### Market Creation

1. The creator defines the market parameters (question, resolution criteria, expiry time).
2. They deposit initial liquidity into the pool — this becomes the market's starting capital.
3. YES and NO shares are automatically minted in equal proportions.
4. The market goes live, and traders can begin buying or selling.

> **Note:** The creator's liquidity is locked and cannot be withdrawn. This ensures commitment and stability for the market.

### Trading & Pricing

- All trades occur between YES and NO within a single shared pool.
- The AMM adjusts the price based on the ratio of YES and NO shares held in liquidity.
- Each trade incurs a 1% fee, distributed between the protocol, LPs, and the market creator.

### Liquidity Provision

- Anyone can add liquidity at any time, increasing market depth.
- LPs earn a share of the trading fees proportional to their liquidity share.
- LPs can withdraw liquidity at any time (except the original creator).

### Market Types

- In V1, only on-chain prediction markets can be created by anyone.
- Off-chain or real-world markets are limited to verified creators, team members, and curators for accuracy and compliance.

---

## Version 2: The Bonding Curve Upgrade

### Overview

V2 introduces a Bonding Curve Launch Phase, transforming how markets launch and gain liquidity.

Instead of needing large initial capital from one creator, the community collectively funds markets until they're ready to launch.

This is powered by two core mechanisms:

- **Bonding Curve** – dynamically prices YES and NO shares during funding.
- **LLT (Launch Liquidity Threshold)** – defines when the market transitions from funding → active trading.

### Market Creation in V2

1. **Create Market:**
   - Any user can propose a new market question and define its LLT (e.g., 10,000 USDC).

2. **Funding Phase:**
   - Traders can buy YES or NO shares along a bonding curve.
   - Early buyers pay lower prices.
   - As demand grows, share prices rise smoothly along the curve.

3. **LLT Reached:**
   - Once total liquidity equals the LLT, the market automatically launches into live trading mode.

4. **Live Market Trading:**
   - The pool is initialized with the liquidity accumulated during funding.
   - If the curve ended at 60% YES and 40% NO, those ratios define the starting market odds.

5. **Fee Revenue:**
   - From launch onward, trades incur the same 1% fee, distributed between LPs, creators, and the protocol.

### Why the Bonding Curve Matters

- Creates fair, transparent price discovery before the market even launches.
- Enables community-driven bootstrapping of liquidity.
- Reduces risk for individual creators by decentralizing the funding phase.
- Ensures instant depth when the market activates, avoiding thin or illiquid openings.

### LLT (Launch Liquidity Threshold)

The LLT represents the minimum liquidity required for a market to go live.

**For example:**

If a creator sets the LLT at 10,000 USDC, traders buy YES/NO shares along the bonding curve until that total liquidity is reached.

Once achieved, the market instantly transitions from funding mode to active trading mode, with the final price ratio serving as the starting odds.

---

## Core Innovation

### 1. "Be the Market"

SpeculateX replaces passive speculation with active participation.

Creators don't just start markets; they own part of their economics.

Liquidity providers don't just stake funds; they become the core infrastructure that fuels market activity.

This blurs the line between creator, trader, and investor — making every participant an integral part of the market they engage in.

### 2. Dual-Phase Architecture

- **V1:** Instant creation for agile, on-chain markets.
- **V2:** Collective funding and fair price discovery via the bonding curve.

This phased evolution allows gradual decentralization while maintaining stability and transparency.

### 3. Shared Fee Model

Every action in SpeculateX — creating, trading, or funding — contributes to the market economy.

Creators and LPs both share in the trading revenue, aligning incentives for everyone to build, trade, and sustain markets together.

### 4. Democratized Liquidity

The bonding curve enables anyone to participate in the early formation of new markets, removing traditional entry barriers and enabling deeper liquidity from day one.

---

## Fee Structure

Every trade on SpeculateX (buy or sell) incurs a 1% fee, distributed as follows:

| Participant | Fee Share | Description |
|-------------|-----------|-------------|
| Protocol Treasury | 50% | Sustains the platform and ecosystem. |
| Liquidity Providers (LPs) | 50% | Earn proportional rewards based on liquidity share. |
| Market Creator | Included in LP share | The creator's locked liquidity earns a portion of LP rewards. |

This model ensures that every stakeholder benefits from the market's success — traders drive activity, LPs sustain liquidity, and creators profit from engagement.

---

## Roadmap

| Phase | Milestone | Description |
|-------|-----------|-------------|
| Q4 2025 | SpeculateX V1 Launch | Enable anyone to create on-chain markets on BNB with instant liquidity. |
| Q1 2026 | V1 Expansion & Curated Markets | Add verified off-chain markets (via team & curators). |
| Q2 2026 | SpeculateX V2 Rollout | Introduce bonding curve funding and LLT-based launches. |
| Q3 2026 | Multi-Chain Expansion | Deploy on additional chains (e.g., Base, Arbitrum). |

---

## Conclusion

SpeculateX isn't just a prediction market — it's an ownership protocol for collective intelligence.

By allowing anyone to open, fund, and profit from markets, SpeculateX redefines speculation as a collaborative, transparent, and rewarding experience.

**Be the Market. Own the Outcome.**

---

*Source: [SpeculateX: Be the Market - Notion](https://www.notion.so/speculatex/SpeculateX-Be-the-Market-2a1d9db365a0806cbbedcbce9c77adc3)*

