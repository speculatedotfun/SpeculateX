# ChainlinkResolver Verification Instructions

## Contract Details
- **Address**: `0x5E4Bf042933B9f8ec0789F97Df8179558960b412`
- **Network**: BSC Testnet (Chain ID: 97)
- **BscScan**: https://testnet.bscscan.com/address/0x5E4Bf042933B9f8ec0789F97Df8179558960b412

## Manual Verification on BscScan

Since automated verification is failing (bytecode mismatch), follow these steps:

### Step 1: Go to Verification Page
1. Visit: https://testnet.bscscan.com/address/0x5E4Bf042933B9f8ec0789F97Df8179558960b412#code
2. Click "Verify and Publish"

### Step 2: Select Verification Method
- **Compiler Type**: Solidity (Single file)
- **Compiler Version**: v0.8.24+commit.e11b9ed9
- **Open Source License Type**: MIT

### Step 3: Compiler Settings
- **Optimization**: Yes
- **Runs**: 200
- **EVM Version**: default
- **Via-IR**: NO (contract was deployed with `--legacy` flag)

### Step 4: Contract Source Code
Use the flattened file: `flattened_ChainlinkResolver_new.sol`

Copy and paste the entire contents of this file into the source code field.

### Step 5: Constructor Arguments (ABI-encoded)
```
00000000000000000000000029d67d1ad683a76b2750f74b40b6e79d715c933c000000000000000000000000769706b79f3afcb2d2aaa658d4444f68e6a03489
```

This decodes to:
- `admin`: 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
- `core`: 0x769706b79F3AfCb2D2aaa658D4444f68E6A03489

### Step 6: Submit
Click "Verify and Publish"

## Troubleshooting

If verification still fails with "bytecode mismatch":

### Option A: Redeploy
The safest option is to redeploy the contract:

```powershell
cd contracts
$env:CORE_ADDRESS="0x769706b79F3AfCb2D2aaa658D4444f68E6A03489"
$env:ADMIN_ADDRESS="0x29D67d1Ad683A76b2750f74B40b6e79d715C933c"
$env:BSCSCAN_API_KEY="FF3SJ2QQ2F5M286JD96V5E1I112M2ZWA48"
$rpcUrl = if ($env:BSC_TESTNET_RPC_URL) { $env:BSC_TESTNET_RPC_URL } else { "https://data-seed-prebsc-1-s1.binance.org:8545/" }

forge script script/DeployResolver.s.sol:DeployResolver --rpc-url $rpcUrl --broadcast --verify --legacy
```

The `--verify` flag will automatically verify after deployment.

### Option B: Try Different Compiler Settings
If manual verification fails, try these variations:
1. Toggle "Via-IR" on/off
2. Try different EVM versions (default, paris, shanghai)
3. Check if metadata hash needs to be disabled

## Notes
- The contract was deployed with `--legacy` flag (EIP-1559 disabled)
- Deployed from commit: `eb07e3a`
- Deployment timestamp: 2026-01-07
