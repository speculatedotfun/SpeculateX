# Execute Timelock Operations Guide

## Overview

Your contracts were deployed with a **48-hour (172,800 seconds) timelock** on BSC Mainnet. All facet operations were scheduled during deployment but are NOT yet active.

**You must wait 48 hours from deployment time before executing these operations.**

## Deployment Time

Check the deployment transaction timestamp on BscScan:
- Treasury: https://bscscan.com/address/0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70
- Core Router: https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60

**Deployment Time:** Check the "Contract Creation" transaction timestamp

**Earliest Execution Time:** Deployment time + 48 hours

## Scheduled Operations

The following operations were scheduled and need to be executed:

### 1. Set Resolver
- Operation ID: `0xd1156b5f83145eddc2b89ac3c63394be678f3ff895fb55a6685f72cad242ef97`
- Function: `executeSetResolver(bytes32,address)`
- Resolver Address: `0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b`

### 2. MarketFacet Functions (6 operations)
```
0x122d4beaa621e7eaa93b919a719db32a29191168470f08f751766adebae50251 - createMarket
0x2804750fb278702df4ae450a26d5eaa3b5025f63a29ec5c9b325a1e088c3e311 - getMarketState
0x780d1502272db7cb3d4958a53ebfbae75e2dd3d7871aae759a156722a49c4241 - getMarketResolution
0x5ddf533830ab0290fe6a7affe2cb288e56874c2a6d70cb0237d9b8efc7710d4f - getMarketQuestion
0x79fbe488f5ac69237e85ad7cba1b225d337ca1953d56fa0e74dbfdedf30b9025 - getMarketInvariants
0xd7652ca316dae0e0c0612c5374ddef5d56183d3a82be83f1dbcb8905f0b026da - getMarketTokens
```

### 3. TradingFacet Functions (7 operations)
```
0x95df75d52d18331e1f196887cc20da68d74cdd98021665cf3265830ac25ae954 - spotPriceYesE18
0x6f07cc638e443784441b608d3c09ad14751269121c61994e4ce4f004e990c720 - spotPriceYesE6
0x8bb3a7c348a3900b43e7205c7cfd2edbe7113f0df5a9a8517dc97c38470093ac - getMaxJumpE18
0xb6a088f0bd096036d83a3a10b1ab1a5ab2a1cf312ca53589b5a74313901b8a2e - buy(4 params)
0x36081dee620bdb33761ab19eebe8b2c771397b5ac8a2aad302e17e10ba8e3f94 - sell(4 params)
0xc4fa34e5b7288296f9ddc0f8a06b01a86bebedf7a8a6ecfed95bc44cc7fc1257 - buy(5 params with deadline)
0x545f4a23b35fbb8a89c447a01970d5eefe77f12b71c68aa3b49039a872bff1a1 - sell(5 params with deadline)
```

### 4. LiquidityFacet Functions (3 operations)
```
0x9bd7b1e3aebad51433692333c91810f80b9faedc4d608230baaf211510b01817 - addLiquidity
0x638524dbd6013885d9eb7330a1652fb8949da08ebe8fa99b5f52220609c6fa26 - removeLiquidity
0x9d8409805453067bfe2994c8df8cf68aa5b423350d4f6b23c093c7069a34fbba - claimLpFees
```

### 5. SettlementFacet Functions (5 operations)
```
0x54acd6cc8acba8e86739fd38323864814f8dd8f0ceccd620e44f07ae321c4ab0 - resolveMarketWithPrice
0x4a7a10ebe79482f2827afa3ef4bd9c4b3f6304fb1e8b0a877e07e76de219f8b8 - emergencyCancelMarket
0xbb6a776537ea35e2e17c31dd3f9c5c52e035792108bcc41ad4d56e6f716ef580 - redeem
0x601f8d1dffcdfb0c037b6a5be4fa6a9e0c017e3b6a1876a264a514a58be40cbd - pendingLpResidual
0xd6639597d75735481ae25516d18c2fa35daaf2d4571ecf98be508f20d13cfaef - claimLpResidual
```

## Execution Script

A script has been provided to execute all operations: `script/ExecuteAfterDelay.s.sol`

### Check Timelock Status

Before executing, verify the timelock has passed:

```bash
cd contracts

# Check current block timestamp
cast block latest --rpc-url $BSC_MAINNET_RPC_URL | grep timestamp

# Check operation ready time (example for first operation)
cast call 0x101450a49E730d2e9502467242d0B6f157BABe60 "operations(bytes32)(uint256,uint256)" 0xd1156b5f83145eddc2b89ac3c63394be678f3ff895fb55a6685f72cad242ef97 --rpc-url $BSC_MAINNET_RPC_URL
```

The second returned value is the `readyTime`. If `block.timestamp >= readyTime`, you can execute.

### Execute All Operations

**IMPORTANT:** Make sure 48+ hours have passed since deployment!

```bash
cd contracts

# Run the execution script
forge script script/ExecuteAfterDelay.s.sol:ExecuteTimelockOps \
  --rpc-url bsc_mainnet \
  --broadcast \
  --legacy
```

### Manual Execution (If Script Fails)

If you need to execute manually through a wallet interface:

1. Connect to Core Router: `0x101450a49E730d2e9502467242d0B6f157BABe60`
2. For resolver, call: `executeSetResolver(bytes32,address)`
   - opId: `0xd1156b5f83145eddc2b89ac3c63394be678f3ff895fb55a6685f72cad242ef97`
   - resolver: `0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b`

3. For each facet operation, call: `executeSetFacet(bytes32,bytes4,address)`
   - Use the operation IDs listed above
   - Match function selectors with facet addresses
   - See broadcast file for exact details: `broadcast/deploy.sol/56/run-latest.json`

## Verification After Execution

After executing all operations, verify the facets are active:

```bash
# Test that a view function works through the router
cast call 0x101450a49E730d2e9502467242d0B6f157BABe60 "getMarketState(uint256)" 0 --rpc-url $BSC_MAINNET_RPC_URL
```

If this returns data (even if market 0 doesn't exist), the facets are active.

## Security Notes

- Only the admin wallet (`0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c`) can execute these operations
- Operations expire 7 days after their ready time
- If you miss the 7-day window, you'll need to reschedule
- The deployer wallet has already been granted all necessary roles
- After execution, the system will be fully operational

## Troubleshooting

**Error: "Operation not ready"**
- Wait longer, 48 hours haven't passed yet

**Error: "Operation expired"**
- Reschedule the operations using `scheduleOp()` on the Core Router

**Error: "Unauthorized"**
- Make sure you're using the admin wallet: `0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c`

## Next Steps After Execution

1. Test the system by creating a test market
2. Update your frontend to use the new Core Router address
3. Update your subgraph configuration (if applicable)
4. Announce the deployment to users
