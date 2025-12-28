# Manual Operation Execution Guide

## Problem
The public BSC RPC (`https://bsc-dataseed.binance.org/`) has extremely strict rate limits that prevent automated loading of operations in the admin UI.

## Solution: Manual Execution via BscScan

You can execute all 21 timelock operations directly through BscScan's Write Contract interface.

---

## Step 1: Verify Operations Exist

1. Go to BscScan Events Tab:
   https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#events

2. Look for **OperationScheduled** events
   - You should see 21 events
   - Each shows: `opId`, `tag`, and `readyAt` timestamp

3. Note the `readyAt` timestamp from any event:
   - Example: `1735516800` (Unix timestamp)
   - Convert to human time: https://www.unixtimestamp.com/
   - This is when the 48-hour timelock expires

---

## Step 2: Wait for Timelock to Expire

**Before you can execute:**
- Wait until the `readyAt` timestamp has passed
- Example: If `readyAt` is `1735516800`, execution is possible after Jan 2, 2025 12:00 PM

**Check current time:**
- Current Unix time: https://www.unixtimestamp.com/
- When current time > `readyAt`, you can execute!

---

## Step 3: Execute Operations via BscScan

Once the timelock expires, execute each operation:

### Method A: Using BscScan Write Contract (Recommended)

1. **Go to Write Contract Tab:**
   https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#writeContract

2. **Connect Your Wallet:**
   - Click "Connect to Web3"
   - Use MetaMask with admin address: `0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c`
   - Make sure you're on BSC Mainnet (Chain ID: 56)

3. **Find the `executeOp` Function:**
   - Scroll to function `executeOp`
   - It requires 2 parameters:
     - `opId` (bytes32) - From OperationScheduled event
     - `tag` (bytes32) - From OperationScheduled event

4. **Execute Each Operation:**
   - For each of the 21 OperationScheduled events you saw:
     1. Copy the `opId` value (e.g., `0x1234...`)
     2. Copy the `tag` value (e.g., `0x5678...`)
     3. Paste into the BscScan form
     4. Click "Write"
     5. Confirm in MetaMask
     6. Wait for transaction to confirm
     7. Repeat for next operation

5. **Verify Execution:**
   - After each transaction, check the Events tab
   - You should see a new **OperationExecuted** event
   - Once you see 21 OperationExecuted events, you're done!

---

## Step 4: Verify Protocol Activation

After executing all 21 operations, verify the protocol is active:

### Check Function Selectors Registered

1. **Go to Read Contract Tab:**
   https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#readContract

2. **Test a function selector:**
   - Find `facetOf` function
   - Enter a function selector (e.g., `0x12345678`)
   - Click "Query"
   - Should return a facet address (not 0x0000...)

### Test on Your Frontend

1. Navigate to your frontend
2. Try creating a test market
3. Try adding liquidity
4. All functions should work!

---

## Alternative: Execute All via Script

If you have Node.js and ethers installed, you can execute all operations programmatically:

```javascript
// execute-all-operations.js
const { ethers } = require('ethers');

const CORE_ADDRESS = '0x101450a49E730d2e9502467242d0B6f157BABe60';
const PRIVATE_KEY = 'your-admin-private-key'; // ⚠️ KEEP SECRET!
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

async function executeAll() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // Get all OperationScheduled events
  const filter = {
    address: CORE_ADDRESS,
    topics: [ethers.id('OperationScheduled(bytes32,bytes32,uint256)')],
    fromBlock: 73210700,
    toBlock: 73211200
  };

  const logs = await provider.getLogs(filter);
  console.log(`Found ${logs.length} operations to execute`);

  // Core ABI (minimal)
  const coreAbi = [
    'function executeOp(bytes32 opId, bytes32 tag) external'
  ];
  const core = new ethers.Contract(CORE_ADDRESS, coreAbi, wallet);

  // Execute each operation
  for (let i = 0; i < logs.length; i++) {
    const opId = logs[i].topics[1];
    const tag = logs[i].topics[2];

    console.log(`Executing operation ${i + 1}/${logs.length}...`);
    const tx = await core.executeOp(opId, tag);
    await tx.wait();
    console.log(`✅ Done! TxHash: ${tx.hash}`);
  }

  console.log('\\n🎉 All 21 operations executed!');
}

executeAll().catch(console.error);
```

**Run it:**
```bash
npm install ethers
node execute-all-operations.js
```

⚠️ **Security Warning:** Never commit your private key to git!

---

## Common Issues

### "Transaction will fail" error
- Timelock hasn't expired yet
- Wait until `readyAt` timestamp has passed

### "Only admin can execute" error
- You're not connected with the admin wallet
- Admin address: `0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c`

### "Operation not found" error
- `opId` doesn't exist
- Double-check you copied the correct value from Events tab

### Operations not appearing in Events tab
- They were scheduled in a different block range
- Check recent blocks around deployment time
- Filter by "OperationScheduled" event name

---

## Summary

**Because the public BSC RPC is so restrictive:**

1. ✅ **Manual execution via BscScan is the most reliable method**
2. ✅ **No code required** - just copy/paste from Events tab
3. ✅ **Safe** - MetaMask shows what you're executing
4. ✅ **Works every time** - no rate limits

**Steps:**
1. Check Events tab for 21 OperationScheduled events ✓
2. Wait for `readyAt` timestamp to pass ✓
3. Execute each operation via BscScan Write Contract ✓
4. Verify 21 OperationExecuted events appear ✓
5. Test protocol on frontend ✓

---

## Recommended: Upgrade RPC for Production

For better user experience after launch, use a dedicated RPC:

**Free Tier Options:**
- Ankr: https://www.ankr.com/rpc/bsc/
- PublicNode: https://bsc.publicnode.com
- 1RPC: https://1rpc.io/bnb

**Paid Options (Better Reliability):**
- QuickNode: $49/month - https://www.quicknode.com/
- Alchemy: Free tier available - https://www.alchemy.com/
- GetBlock: Shared nodes from $50/month - https://getblock.io/

**Update `.env.local`:**
```env
NEXT_PUBLIC_BSC_RPC_URL=https://your-dedicated-rpc-url
```

This will fix the rate limiting issues permanently for your users.

---

**Good luck!** Once you execute all 21 operations, your protocol goes LIVE! 🚀
