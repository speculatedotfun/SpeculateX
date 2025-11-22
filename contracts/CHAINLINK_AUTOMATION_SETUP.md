# Chainlink Automation Setup Guide

## ✅ What's Working:
- ChainlinkResolver deployed: `0x363eaff32ba46F804Bc7E6352A585A705ac97aBD`
- Feeds registered: BTC/USD, ETH/USD, BNB/USD
- Manual resolution works (tested successfully)

## ❌ Issue: Automation Not Running

Chainlink Automation needs to be configured correctly. Here's what to check:

### 1. Verify Upkeep Registration

Go to [Chainlink Automation (BSC Testnet)](https://automation.chain.link/bnb_testnet) and check:

**Upkeep Details:**
- **Target Contract**: `0x363eaff32ba46F804Bc7E6352A585A705ac97aBD` (ChainlinkResolver)
- **Function Selector**: `performUpkeep(bytes)` - `0x27a3d4c5`
- **Check Data**: Leave empty `0x` (resolver uses persistent cursor)
- **Gas Limit**: At least `500,000` (resolution can be gas-intensive)
- **Starting Balance**: Must have LINK tokens (at least 2-3 LINK for testing)

### 2. Check Upkeep Status

In Chainlink Automation dashboard, verify:
- ✅ Status: **Active** (not paused)
- ✅ Balance: Has LINK tokens
- ✅ Last Check: Should show recent checks
- ✅ Last Perform: Should show when it last resolved

### 3. Common Issues:

**Issue: Upkeep not funded**
- Solution: Add LINK tokens to the upkeep balance

**Issue: Wrong function selector**
- Must be: `performUpkeep(bytes)` = `0x27a3d4c5`
- NOT: `checkUpkeep(bytes)` (that's only for checking)

**Issue: Wrong target contract**
- Must be: ChainlinkResolver address
- NOT: SpeculateCore address

**Issue: Upkeep paused**
- Check if upkeep is paused in the dashboard
- Unpause if needed

**Issue: Gas limit too low**
- Increase gas limit to at least 500,000

### 4. Test the Setup:

You can manually test by calling `checkUpkeep("")` on the resolver:
- Should return `(true, <encoded market data>)` if markets need resolution

### 5. Expected Behavior:

Once configured correctly:
- Chainlink Automation checks every few minutes
- When `checkUpkeep()` returns `true`, it calls `performUpkeep()`
- Markets get resolved automatically

### 6. Manual Resolution (Temporary):

Until Automation is fixed, you can manually resolve markets using:
```bash
forge script script/ManualResolveMarket.s.sol --rpc-url <rpc> --broadcast
```

This will resolve one market at a time.

