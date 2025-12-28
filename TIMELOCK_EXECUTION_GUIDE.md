# 🕐 Timelock Execution Guide - BSC Mainnet Deployment

## Understanding Your Deployment

Your deployment scheduled **21 separate operations** on BSC Mainnet:

### Operations Breakdown:
1. **1x Resolver Setup** - Set ChainlinkResolver address
2. **20x Facet Functions** - Register all function selectors for the 4 facets:
   - **MarketFacet**: 6 functions (createMarket, getMarketState, etc.)
   - **TradingFacet**: 6 functions (buy, sell, spotPrice, etc.)
   - **LiquidityFacet**: 3 functions (addLiquidity, removeLiquidity, claimLpFees)
   - **SettlementFacet**: 5 functions (resolve, redeem, emergencyCancel, etc.)

**Each operation has its own unique `opId` hash and must be executed individually.**

---

## How the Timelock Works

### Timeline:
```
Deployment Time (Now)
    ↓
    ├─ 48 hours waiting period (172,800 seconds)
    ↓
Execution Window Opens
    ↓
    ├─ 7 days to execute (604,800 seconds)
    ↓
Operations Expire (if not executed)
```

### Status Flow:
- **⏳ Scheduled** → Waiting for 48-hour timelock
- **✅ Ready** → Can be executed (after 48 hours)
- **✔️ Executed** → Successfully applied to protocol
- **❌ Expired** → Missed the 7-day execution window
- **🚫 Cancelled** → Manually cancelled by admin

---

## Using the Admin Panel UI

### Step 1: Access the Admin Panel
1. Go to `/admin` in your frontend
2. Connect your wallet with the admin address: `0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c`
3. Click the **"Pending"** tab in Protocol Operations section

### Step 2: Monitor the Countdown
You'll see **21 operation cards**, each showing:
- **Operation name** (e.g., "Set Facet")
- **Live countdown timer** updating every second
- **Progress bar** showing % completion (0-100%)
- **Execution date/time** - exact moment when operation becomes executable
- **Status badge**: "⏳ Timelock Active" → "✓ Ready to Execute"

Example display:
```
┌─────────────────────────────────────────────┐
│ 🕐 Set Facet                     ⏳ Timelock Active │
│ OpId: 0x1234...5678                         │
│                                             │
│ Timelock Progress            ████████░░ 80% │
│                                             │
│ Ready In: 9h 36m 24s                        │
│ Execute After: Dec 30, 02:30 PM EST         │
│                                             │
│ [Cancel Operation] [Execute Now - disabled] │
└─────────────────────────────────────────────┘
```

### Step 3: Wait for 48 Hours
- The countdown will tick down from 48 hours to 0
- Progress bar fills from 0% to 100%
- When ready, cards turn green and show "✓ Ready to Execute"

### Step 4: Execute the Operations

#### Option A: Execute All at Once (RECOMMENDED)
When any operations are ready, a green button appears at the top:

```
[Execute All Ready (21)] ← Click this!
```

This will:
1. Execute all 21 operations sequentially
2. Show progress toasts: "Set Facet executed (1/21)", "Set Facet executed (2/21)", etc.
3. Wait for each transaction to confirm before moving to next
4. Show final summary: "21 succeeded, 0 failed"

**Estimated time:** ~5-10 minutes (depending on BSC block times)

#### Option B: Execute Individually
Click "Execute Now" on each operation card one by one.

**Use this if:**
- You want to execute specific operations only
- The batch execution failed partway through
- You want more control over gas prices per transaction

---

## What Happens After Execution?

### Immediate Effects:
✅ All 21 function selectors are registered in the CoreRouter
✅ Users can now call all protocol functions through the CoreRouter
✅ The protocol becomes fully operational!

### Testing After Execution:
1. **Create a test market** - Verify createMarket works
2. **Add liquidity** - Test addLiquidity function
3. **Buy/Sell** - Test trading functions
4. **Check prices** - Verify spotPrice functions work

### Frontend Integration:
- Your frontend already has the correct addresses in `lib/contracts.ts`
- All functions will automatically work through the CoreRouter
- No code changes needed!

---

## Troubleshooting

### "No operations ready to execute"
- Wait the full 48 hours from deployment
- Check the countdown timer on each card
- Refresh the page to update the current time

### "Operation already executed"
- The operation was already executed
- Check if it shows in the executed list
- Verify on BscScan that the function selector is registered

### "Transaction failed: Timelock not expired"
- The 48 hours haven't passed yet
- Double-check the "Execute After" time
- Make sure your local clock is accurate

### "Execute All" button not appearing
- No operations are ready yet (still in timelock)
- Check individual operation statuses
- Click "Refresh" to update the list

### Gas Estimation Failed
- Increase gas limit manually in wallet
- Try executing operations one by one instead of batch
- Check that your wallet has enough BNB for gas

---

## Technical Details

### Contract Function:
```solidity
function executeOp(bytes32 opId, bytes32 tag) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### What Each Operation Does:
```solidity
// Example: Registering the createMarket function
bytes4 selector = bytes4(keccak256("createMarket(...)"));
// Maps selector → MarketFacet address in CoreRouter
// Now calls to core.createMarket(...) → delegatecall to MarketFacet
```

### Event Emitted:
```solidity
event OperationExecuted(bytes32 indexed opId);
```

### RPC Calls Made:
1. `getLogs` - Fetch OperationScheduled events (when you load operations)
2. `getLogs` - Fetch OperationExecuted events (to filter out executed ops)
3. `getBlock` - Get block timestamps for progress calculation
4. `eth_sendTransaction` - Execute each operation
5. `eth_getTransactionReceipt` - Wait for confirmation

---

## Important Notes

### Security:
- ⚠️ Only the admin address can execute operations
- ⚠️ Operations expire after 7 days if not executed
- ⚠️ Cannot bypass the 48-hour timelock (enforced in contract)
- ✅ All operations are visible on-chain before execution

### Best Practices:
1. **Don't rush** - Wait the full 48 hours
2. **Test after execution** - Verify everything works
3. **Monitor gas prices** - Execute during low gas times if possible
4. **Keep admin key safe** - You'll need it for future protocol updates

### After Full Activation:
- Update your README.md with "✅ LIVE ON BSC MAINNET"
- Announce to your community
- Monitor the first few markets closely
- Have your admin wallet ready for market resolution

---

## Quick Reference

| Item | Value |
|------|-------|
| **Total Operations** | 21 |
| **Timelock Duration** | 48 hours (172,800 seconds) |
| **Execution Window** | 7 days (604,800 seconds) |
| **Admin Address** | `0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c` |
| **CoreRouter** | `0x101450a49E730d2e9502467242d0B6f157BABe60` |
| **Network** | BSC Mainnet (Chain ID: 56) |

---

## Next Steps After Execution

1. ✅ Execute all 21 operations
2. ✅ Test protocol functionality
3. ✅ Update frontend `.env.local` with mainnet addresses
4. ✅ Deploy subgraph with mainnet addresses
5. ✅ Create first test market
6. ✅ Public announcement
7. 🚀 **GO LIVE!**

---

**Congratulations!** Once you execute these operations, your prediction market protocol will be fully live on BSC Mainnet! 🎉
