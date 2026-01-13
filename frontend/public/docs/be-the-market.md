# How SpeculateX Works

## What is SpeculateX?

SpeculateX is a **decentralized prediction market** where you can trade on the outcome of future events. Instead of betting against a bookmaker, you're trading against other users — and the market itself sets the odds.

---

## The Basics in 30 Seconds

1. **Buy YES or NO shares** on any question
2. **Price = Probability** — YES at 70¢ means the market thinks there's a 70% chance
3. **Win $1 per share** if you're right, $0 if wrong
4. **Sell anytime** — don't wait for the outcome

> **Example:** If you buy YES at 30¢ and win, you profit 70¢ per share (233% return)

---

<div id="how-trading-works"></div>

## How Trading Works

### Step 1: Find a Market

Browse markets like:
- "Will BTC trade above $100,000 by Jan 31?"
- "Will ETH hit $5,000 this quarter?"

### Step 2: Buy Your Position

Each market has two tokens:
- **YES Token** — Pays $1 if the outcome is YES
- **NO Token** — Pays $1 if the outcome is NO

The prices always add up to roughly $1:
```
If YES = 70¢, then NO ≈ 30¢
```

### Step 3: Wait or Trade

You can:
- **Hold until resolution** — Wait for the outcome
- **Sell anytime** — Lock in profit or cut losses early

### Step 4: Claim Winnings

After the market resolves:
- **If you're right:** Each share pays $1
- **If you're wrong:** Each share pays $0

---

## Why This is Different

| Traditional Betting | SpeculateX |
|---------------------|------------|
| Trust the bookmaker | Trust the code |
| House can refuse payout | Automatic, guaranteed payout |
| House sets the odds | Market sets the odds |
| Your funds in their custody | Your funds in your wallet |

---

## Understanding Prices

The price of a YES token is the market's belief in the probability:

| YES Price | What it Means |
|-----------|---------------|
| 80¢ | Market thinks 80% likely |
| 50¢ | Complete uncertainty (coin flip) |
| 20¢ | Market thinks 20% likely |

**Pro tip:** If you think the true probability is higher than the current price, buy. If lower, sell.

---

## Fees

Every trade has a small fee:
- **1% to Treasury** — Protocol sustainability
- **1% to LPs** — Rewards liquidity providers

Example: Trade 100 USDC → 2 USDC in fees

---

## How Markets Resolve

Markets use **Chainlink oracles** for trustless resolution:

1. Market expires at the set time
2. Chainlink provides the official price/data
3. Contract automatically determines winner
4. Users redeem winning tokens for $1 each

**No human can manipulate the outcome** — it's all automated.

---

## Liquidity Providers (LPs)

Want to earn passive income? Add liquidity to markets:

1. **Deposit USDC** to deepen the market
2. **Earn fees** on every trade (1%)
3. **Claim residual** after resolution

> LPs help make prices more stable and earn rewards for it.

---

## Safety Features

### Your Funds Are Safe

- **Solvency guaranteed** — The vault always has enough to pay winners
- **No rug pulls** — 24-hour timelock on all admin actions
- **Pause protection** — Even if paused, you can always withdraw winnings

### Slippage Protection

- Set a minimum output to avoid bad fills
- Deadline parameter prevents stale transactions

---

<div id="getting-started"></div>

## Getting Started

### 1. Connect Your Wallet
Use MetaMask or any Web3 wallet on BSC network.

### 2. Get USDC
You'll need USDC (on BSC) to trade.

### 3. Find a Market
Browse active markets and pick one you have an opinion on.

### 4. Trade!
Buy YES or NO shares based on your prediction.

### 5. Monitor
Track your positions in the Portfolio page.

### 6. Redeem
After resolution, claim your winnings!

---

<div id="faq"></div>

## FAQ

### How is the price determined?
SpeculateX uses **LMSR (Logarithmic Market Scoring Rule)**, a mathematical formula that adjusts prices based on supply and demand. No order book, no counterparty.

### Can I lose more than I invested?
No. Maximum loss is what you paid for shares.

### What if the oracle is wrong?
Markets use Chainlink, the industry-standard decentralized oracle network. Staleness checks and decimal verification add extra safety.

### Can I trade on mobile?
Yes! The web app works on all devices.

### Is there a minimum trade?
The protocol requires minimum 500 USDC liquidity per market, but individual trades can be smaller.

---

## Quick Reference

| Action | What Happens |
|--------|--------------|
| Buy YES | You're betting the outcome is YES |
| Buy NO | You're betting the outcome is NO |
| Sell | Exit your position before resolution |
| Redeem | Convert winning tokens to USDC |
| Add Liquidity | Earn fees from trades |

---

## Need Help?

- **Questions?** Join our [Discord](https://discord.gg/speculatex)
- **Updates?** Follow on [Twitter](https://twitter.com/speculatex)
- **Bugs?** Report in Discord or GitHub

---

*Prediction markets involve risk. Trade responsibly.*
