# Execute Timelock Operations Guide

## Overview

Your contracts were deployed with a **24-hour (86,400 seconds) timelock** on BSC Mainnet. All facet operations were scheduled during deployment but are NOT yet active.

**You must wait 24 hours from deployment time before executing these operations.**

---

## Current Mainnet Deployment (January 2026)

| Contract | Address |
|----------|---------|
| **CoreRouter** | `0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E` |
| **ChainlinkResolver** | `0xbff5aC1fd8EdB1aEf0a32e3Dedd01ff351DBa446` |
| **Treasury** | `0x50c377AedEB8E87f9C3715Af4D84f4fA23154553` |
| **MarketFacet** | `0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58` |
| **TradingFacet** | `0x1e88647a37DDb2191F4B72Aa134cFcb98782e694` |
| **LiquidityFacet** | `0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2` |
| **SettlementFacet** | `0x3F7831134683d6fC0F5658E5503b2cF7774A0697` |
| **AdminFacet** | `0x1FeFe6E8C47fbf1f0919aeF65C18722E89a8769e` |

---

## Check Timelock Status

### 1. Find Deployment Time

Check the CoreRouter contract creation on BscScan:
- https://bscscan.com/address/0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E

Look for the "Contract Creation" transaction timestamp.

### 2. Check If Ready

```bash
cd contracts

# Check current block timestamp
cast block latest --rpc-url bsc_mainnet | grep timestamp

# The readyAt time for operations is: deployment_timestamp + 86400 (24 hours)
# If current timestamp >= readyAt, you can execute
```

---

## Execute All Timelock Operations

### Quick Command (Bash/Linux/Mac)

```bash
cd contracts

CORE_ROUTER=0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E \
RESOLVER=0xbff5aC1fd8EdB1aEf0a32e3Dedd01ff351DBa446 \
MARKET_FACET=0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58 \
TRADING_FACET=0x1e88647a37DDb2191F4B72Aa134cFcb98782e694 \
LIQUIDITY_FACET=0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2 \
SETTLEMENT_FACET=0x3F7831134683d6fC0F5658E5503b2cF7774A0697 \
ADMIN_FACET=0x1FeFe6E8C47fbf1f0919aeF65C18722E89a8769e \
forge script script/ExecuteAfterDelay.s.sol:ExecuteAfterDelay \
  --rpc-url bsc_mainnet \
  --broadcast \
  --legacy
```

### Windows PowerShell

```powershell
cd contracts

$env:CORE_ROUTER="0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E"
$env:RESOLVER="0xbff5aC1fd8EdB1aEf0a32e3Dedd01ff351DBa446"
$env:MARKET_FACET="0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58"
$env:TRADING_FACET="0x1e88647a37DDb2191F4B72Aa134cFcb98782e694"
$env:LIQUIDITY_FACET="0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2"
$env:SETTLEMENT_FACET="0x3F7831134683d6fC0F5658E5503b2cF7774A0697"
$env:ADMIN_FACET="0x1FeFe6E8C47fbf1f0919aeF65C18722E89a8769e"

forge script script/ExecuteAfterDelay.s.sol:ExecuteAfterDelay --rpc-url bsc_mainnet --broadcast --legacy
```

### Using .env File

Add these to your `contracts/.env`:

```env
CORE_ROUTER=0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E
RESOLVER=0xbff5aC1fd8EdB1aEf0a32e3Dedd01ff351DBa446
MARKET_FACET=0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58
TRADING_FACET=0x1e88647a37DDb2191F4B72Aa134cFcb98782e694
LIQUIDITY_FACET=0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2
SETTLEMENT_FACET=0x3F7831134683d6fC0F5658E5503b2cF7774A0697
ADMIN_FACET=0x1FeFe6E8C47fbf1f0919aeF65C18722E89a8769e
```

Then run:

```bash
cd contracts
source .env
forge script script/ExecuteAfterDelay.s.sol:ExecuteAfterDelay --rpc-url bsc_mainnet --broadcast --legacy
```

---

## What Gets Executed (22 Operations)

### 1. Resolver (1 operation)
- `setResolver` - Connects ChainlinkResolver for price feeds

### 2. MarketFacet (7 operations)
| Function | Selector |
|----------|----------|
| `createMarket` | `0x56c8d23d` |
| `createScheduledMarket` | `0xf00bccd9` |
| `getMarketState` | `0x88b1f1c3` |
| `getMarketResolution` | `0x232e45d7` |
| `getMarketQuestion` | `0x4397c4ce` |
| `getMarketInvariants` | `0x294d54c1` |
| `getMarketTokens` | `0xf0f3684e` |

### 3. TradingFacet (7 operations)
| Function | Selector |
|----------|----------|
| `spotPriceYesE18` | `0x6ad6c254` |
| `spotPriceYesE6` | `0xdfe0662a` |
| `getMaxJumpE18` | `0x6778c3a2` |
| `buy(4 params)` | `0xbdad35e5` |
| `sell(4 params)` | `0x0abf1899` |
| `buy(5 params + deadline)` | `0xe023fc66` |
| `sell(5 params + deadline)` | `0xe2cad131` |

### 4. LiquidityFacet (3 operations)
| Function | Selector |
|----------|----------|
| `addLiquidity` | `0x9cd441da` |
| `removeLiquidity` | `0x9d7de6b3` |
| `claimLpFees` | `0x99406c9b` |

### 5. SettlementFacet (5 operations)
| Function | Selector |
|----------|----------|
| `resolveMarketWithPrice` | `0xcab7cde9` |
| `emergencyCancelMarket` | `0xc996d690` |
| `redeem` | `0xd65a06b0` |
| `pendingLpResidual` | `0x9f29c18f` |
| `claimLpResidual` | `0xb7a8d60e` |

---

## Verify Execution Success

After running the script, verify facets are connected:

```bash
cd contracts

# Check createMarket is wired to MarketFacet
cast call 0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E "facetOf(bytes4)(address)" 0x56c8d23d --rpc-url bsc_mainnet
# Expected: 0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58

# Check buy is wired to TradingFacet
cast call 0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E "facetOf(bytes4)(address)" 0xbdad35e5 --rpc-url bsc_mainnet
# Expected: 0x1e88647a37DDb2191F4B72Aa134cFcb98782e694

# Check addLiquidity is wired to LiquidityFacet
cast call 0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E "facetOf(bytes4)(address)" 0x9cd441da --rpc-url bsc_mainnet
# Expected: 0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2

# Check redeem is wired to SettlementFacet
cast call 0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E "facetOf(bytes4)(address)" 0xd65a06b0 --rpc-url bsc_mainnet
# Expected: 0x3F7831134683d6fC0F5658E5503b2cF7774A0697
```

---

## Troubleshooting

### Error: "Operation not ready"
- The 24-hour timelock hasn't passed yet
- Check the `readyAt` timestamp in the script output
- Wait until `block.timestamp >= readyAt`

### Error: "Operation expired"
- Operations expire 7 days after their ready time
- You'll need to reschedule using `scheduleOp()` on the CoreRouter

### Error: "Unauthorized"
- Make sure you're using the admin wallet
- Admin address: `0x29D67d1Ad683A76b2750f74B40b6e79d715C933c`
- Check `PRIVATE_KEY_MAIN` or `PRIVATE_KEY` in your `.env`

### Error: "vm.envAddress: environment variable not found"
- Make sure all environment variables are set
- On Windows, use PowerShell `$env:VAR="value"` syntax
- On Linux/Mac, use `VAR=value` inline or `export VAR=value`

### Script shows "status: Executed"
- The operation was already executed previously
- This is fine - the script skips already-executed operations

---

## After Execution

Once all 22 operations are executed:

1. **Test the system** - Create a test market via frontend
2. **Update frontend** - Ensure addresses match in `.env.production`
3. **Update subgraph** - Point to the new CoreRouter address
4. **Announce launch** - Your protocol is now live!

---

## Security Notes

- **Admin wallet**: `0x29D67d1Ad683A76b2750f74B40b6e79d715C933c`
  - Only this wallet can execute timelock operations
  - **PROTECT THIS PRIVATE KEY!**

- **Timelock protection**:
  - All facet upgrades require 24-hour wait
  - Operations expire after 7 days if not executed
  - Cannot bypass timelock (enforced in contract)

---

## Execution Status: ⏳ PENDING NEW OPERATION

**Previous execution:** December 30, 2025 - All 22 initial timelock operations completed.

**New operations scheduled:** December 31, 2025
- `createScheduledMarket` selector (`0xf00bccd9`) - Scheduled for new MarketFacet

### Pending Timelock Operation
| OpId | Selector | Facet | Ready At |
|------|----------|-------|----------|
| `0x8728ff92112b17e6130e42dc6380831d9c47743027327fd5d5ab530155697a38` | `0xf00bccd9` | `0x333be16200CA738D49B40CDDe056F9aa7ccf643E` | Jan 1, 2026 ~06:03 UTC |

### Execute After 24 Hours

```bash
cd contracts

# Execute createScheduledMarket selector
cast send 0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E \
  "executeSetFacet(bytes32,bytes4,address)" \
  0x8728ff92112b17e6130e42dc6380831d9c47743027327fd5d5ab530155697a38 \
  0xf00bccd9 \
  0x333be16200CA738D49B40CDDe056F9aa7ccf643E \
  --private-key $PRIVATE_KEY_MAIN \
  --rpc-url https://bsc-dataseed.binance.org/
```

### Verify After Execution

```bash
# Check createScheduledMarket is wired to new MarketFacet
cast call 0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E "facetOf(bytes4)(address)" 0xf00bccd9 --rpc-url https://bsc-dataseed.binance.org/
# Expected: 0x333be16200CA738D49B40CDDe056F9aa7ccf643E
```

---

## Testnet Deployment (January 2026 - Dynamic USDC + AdminFacet)

| Contract | Address |
|----------|---------|
| **CoreRouter** | `0x9315fc0082d85ABa5Dd680C30b53D73b0F032C2D` |
| **Treasury** | `0x8566B7c306099c7CdB1c2fcACA099C86cf74C977` |
| **Resolver** | `0x997a2393976e2629bb1DF909Ee4e42A800d2D0BD` |
| **MockUSDC** | `0x34F7d01f7529F176fF682aACD468Ba99A89E5aAF` |
| **MarketFacet** | `0xdba345d7535E7f4c1745667B181e13c9EF74F056` |
| **TradingFacet** | `0xbdC0b854289F29B95C919A9A05474d815C806960` |
| **LiquidityFacet** | `0xc1C8C0eC33e055Ef092E207B12594ca5E9120528` |
| **SettlementFacet** | `0x6312F6730891924c78735E762eC7042634B4D1fA` |
| **AdminFacet** | `0x22A62b5ABE7Eb54A72066c75cC61bd9343Dab804` |

**Note**: Testnet has no timelock delay (0 seconds). All operations execute immediately during deployment.
