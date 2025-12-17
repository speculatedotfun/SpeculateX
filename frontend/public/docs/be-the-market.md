# SpeculateX // Be The Market

## Protocol Snapshot

**SpeculateX** is a decentralized prediction market protocol designed for active ownership.
* **Creators** launch markets and define the terms.
* **Traders** buy YES/NO positions with instant AMM execution.
* **LPs** don’t just watch—they own the flow, earning yields from trading volume.

Every market is an independent on-chain economy: self-contained pricing, liquidity, fees, and settlement.

> **Status:** This document reflects the **V1 Live Implementation** (Diamond Router on Testnet). Future features are marked as "Roadmap."

---

## The Philosophy: Don't Just Bet. Be the House.

Traditional prediction markets suffer from two flaws: thin liquidity (high slippage) and passive users (you win or lose, nothing else).

**SpeculateX flips the model:**
By providing liquidity, you transition from a player to infrastructure. You aren't betting against a platform; you are facilitating the market. In exchange, you capture a share of every trade that moves through your pool.

---

## V1 Mechanics: The Engine

Each market creates two ERC20 outcome tokens: **YES** and **NO**.

* **Pricing:** Powered by an **LMSR AMM**. Prices float between 0 and 1 based on demand.
* **Lifecycle:**
    1.  **Create:** Creator seeds liquidity (USDC) and sets the question/oracle.
    2.  **Trade:** Users swap USDC for YES/NO positions.
    3.  **Resolve:** Oracle (Chainlink) confirms the outcome after expiry.
    4.  **Redeem:** Winners claim payouts; LPs claim residuals.

### Instant Market Creation
Creators define the market logic upfront:
* **The Question:** Stored on-chain (human-readable).
* **The Odds:** Defined by the initial seed liquidity (`initUsdc`).
* **The Truth:** Oracle configuration (Feed ID + Target Value).

---

## Liquidity & Fees (The Alpha)

In V1, Liquidity Provision (LP) is designed for **commitment**, not speculation.

### 1. The "Locked Liquidity" Model
To ensure market solvency and prevent rug-pulls, **V1 Liquidity is not withdrawable.**
* Once you `addLiquidity`, that capital backs the market until resolution.
* **Why?** It guarantees traders can always exit positions and aligns LPs with the market's long-term volume rather than short-term farming.

### 2. The Payoff
LPs earn in two ways:
* **Streaming Fees:** Every trade incurs a fee. LPs can call `claimLpFees` to withdraw their share *at any time* during the market's life.
* **Residuals:** After resolution, any remaining funds in the vault (losing bets + surplus) are distributed to LPs via `claimLpResidual`.

---

## Resolution: The Truth Layer

### Snapshot Resolution
We use a **Resolve-Time Snapshot**. The market outcome is determined by the data returned by the first successful Oracle call *after* the `expiryTimestamp`.

* **The Race:** Anyone can trigger resolution.
* **The Safety:** The protocol enforces staleness checks and decimal guardrails to prevent bad data from settling markets.

---

## Developer Notes

### Subgraph-Free Titles
Reliability is paramount. Market questions are stored directly on-chain.
* **Frontend:** Call `getMarketQuestion(uint256)` directly.
* **Benefit:** Your UI will never show a "Loading..." error just because an indexer is lagging.

### Architecture (Diamond Standard)
To bypass contract size limits and ensure modularity, V1 uses a Diamond architecture:
* **Core:** `SpeculateCoreRouter` (The single entry point).
* **Facets:** Modular logic for `Market`, `Trading`, `Liquidity`, and `Settlement`.

---

## Roadmap: V2 Concepts
* **Bonding Curve Launch:** Markets will start in a funding phase.
* **LLT (Launch Liquidity Threshold):** Trading only goes live once the community crowdsources enough liquidity, reducing reliance on a single creator's capital.

---

## FAQ

**Q: Can I withdraw my LP capital before the market ends?**
**A:** No. In V1, liquidity is committed until resolution. You earn via trading fees (claimable anytime) and final residuals.

**Q: Who decides the winner?**
**A:** The code does, based on the Chainlink data feed. The actual transaction to trigger this can be sent by anyone (user or bot).

**Q: Do I need a Graph Node to run the UI?**
**A:** No. Critical metadata (Titles, Symbols) is readable directly from the blockchain.

---

### Disclaimer
*This document is for informational purposes. Prediction markets involve financial risk. Smart contracts are experimental technology—always verify parameters before deploying capital.*