# Execute Timelock Operations Guide

## Overview

Your contracts were deployed with a **24-hour (86,400 seconds) timelock** on BSC Mainnet. All facet operations were scheduled during deployment but are NOT yet active.

**You must wait 24 hours from deployment time before executing these operations.**

---

## Current Mainnet Deployment

| Contract | Address |
|----------|---------|
| **CoreRouter** | `0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b` |
| **ChainlinkResolver** | `0x4076a6951B8d1EB2f4008A8b1E73FCB614e44dC2` |
| **MarketFacet** | `0x333be16200CA738D49B40CDDe056F9aa7ccf643E` |
| **TradingFacet** | `0x4c8806ce17594bA88EeCB27eBa00B40543778A43` |
| **LiquidityFacet** | `0x9E60cA13313ff0A20eE3b32E57675a4FB9e89FCf` |
| **SettlementFacet** | `0x7B95420f86c7325F4fdeCE2ad8C249C84708852B` |
| **Treasury** | `0x641b1FF8875eC2f1822F748C32858348409E0e39` |

### Previous Facet Versions (Pre-Scheduled Markets)
| Contract | Address |
|----------|---------|
| **MarketFacet (v1)** | `0xf670Eb4cfe8B0a6f98Ba5Dbbdf145Cad49a94ba2` |
| **TradingFacet (v1)** | `0xBca0707dAc82c3946a2A326Ba33C821c0A2E28bE` |
| **LiquidityFacet (v1)** | `0xD9DCA9eC368E44d7bDAe1A6997f4BB21ADDFeb87` |

---

## Check Timelock Status

### 1. Find Deployment Time

Check the CoreRouter contract creation on BscScan:
- https://bscscan.com/address/0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b

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

CORE_ROUTER=0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b \
RESOLVER=0x4076a6951B8d1EB2f4008A8b1E73FCB614e44dC2 \
MARKET_FACET=0xf670Eb4cfe8B0a6f98Ba5Dbbdf145Cad49a94ba2 \
TRADING_FACET=0xBca0707dAc82c3946a2A326Ba33C821c0A2E28bE \
LIQUIDITY_FACET=0xD9DCA9eC368E44d7bDAe1A6997f4BB21ADDFeb87 \
SETTLEMENT_FACET=0x7B95420f86c7325F4fdeCE2ad8C249C84708852B \
forge script script/ExecuteAfterDelay.s.sol:ExecuteAfterDelay \
  --rpc-url bsc_mainnet \
  --broadcast \
  --legacy
```

### Windows PowerShell

```powershell
cd contracts

$env:CORE_ROUTER="0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b"
$env:RESOLVER="0x4076a6951B8d1EB2f4008A8b1E73FCB614e44dC2"
$env:MARKET_FACET="0xf670Eb4cfe8B0a6f98Ba5Dbbdf145Cad49a94ba2"
$env:TRADING_FACET="0xBca0707dAc82c3946a2A326Ba33C821c0A2E28bE"
$env:LIQUIDITY_FACET="0xD9DCA9eC368E44d7bDAe1A6997f4BB21ADDFeb87"
$env:SETTLEMENT_FACET="0x7B95420f86c7325F4fdeCE2ad8C249C84708852B"

forge script script/ExecuteAfterDelay.s.sol:ExecuteAfterDelay --rpc-url bsc_mainnet --broadcast --legacy
```

### Using .env File

Add these to your `contracts/.env`:

```env
CORE_ROUTER=0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b
RESOLVER=0x4076a6951B8d1EB2f4008A8b1E73FCB614e44dC2
MARKET_FACET=0xf670Eb4cfe8B0a6f98Ba5Dbbdf145Cad49a94ba2
TRADING_FACET=0xBca0707dAc82c3946a2A326Ba33C821c0A2E28bE
LIQUIDITY_FACET=0xD9DCA9eC368E44d7bDAe1A6997f4BB21ADDFeb87
SETTLEMENT_FACET=0x7B95420f86c7325F4fdeCE2ad8C249C84708852B
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
cast call 0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b "facetOf(bytes4)(address)" 0x56c8d23d --rpc-url bsc_mainnet
# Expected: 0xf670Eb4cfe8B0a6f98Ba5Dbbdf145Cad49a94ba2

# Check buy is wired to TradingFacet
cast call 0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b "facetOf(bytes4)(address)" 0xbdad35e5 --rpc-url bsc_mainnet
# Expected: 0xBca0707dAc82c3946a2A326Ba33C821c0A2E28bE

# Check addLiquidity is wired to LiquidityFacet
cast call 0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b "facetOf(bytes4)(address)" 0x9cd441da --rpc-url bsc_mainnet
# Expected: 0xD9DCA9eC368E44d7bDAe1A6997f4BB21ADDFeb87

# Check redeem is wired to SettlementFacet
cast call 0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b "facetOf(bytes4)(address)" 0xd65a06b0 --rpc-url bsc_mainnet
# Expected: 0x7B95420f86c7325F4fdeCE2ad8C249C84708852B
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
cast send 0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b \
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
cast call 0xC0b288C9d0ae817BdA2DA810F34268b0224faC4b "facetOf(bytes4)(address)" 0xf00bccd9 --rpc-url https://bsc-dataseed.binance.org/
# Expected: 0x333be16200CA738D49B40CDDe056F9aa7ccf643E
```

---

## Testnet Deployment (v2 - Scheduled Markets)

| Facet | Address |
|-------|---------|
| **MarketFacet** | `0xF27C3a35840Befef553bE912A0ec7Ee60d5C64e0` |
| **TradingFacet** | `0x8578569669Eaa1246382A9Ea7d45df88B8d26BF2` |
| **LiquidityFacet** | `0x8c51494c0a9d5ad030d489ACa61E01D0dDb5A677` |
| **SettlementFacet** | `0x4B6e27aEbd6eaB2F6b239fE1D8470C2275B6B5c9` |

**Testnet Router**: `0x22B5E95C7B81D340CfCEBE93A2EE665dC310C491`

### Wire createScheduledMarket on Testnet

Testnet has no timelock delay, execute immediately after scheduling:

```bash
# Execute createScheduledMarket selector on testnet
cast send 0x22B5E95C7B81D340CfCEBE93A2EE665dC310C491 \
  "executeSetFacet(bytes32,bytes4,address)" \
  0x9af8897c1dac83145081c64fb783559210f72beb3db07c2a249e3691a67f9b40 \
  0xf00bccd9 \
  0xF27C3a35840Befef553bE912A0ec7Ee60d5C64e0 \
  --private-key $PRIVATE_KEY_MAIN \
  --rpc-url https://data-seed-prebsc-1-s1.binance.org:8545 \
  --gas-price 5000000000
```
