# Deployment Steps for New Core Contract

## Step 1: Set SpeculateCore Address on USDC
This allows the Core contract to mint USDC when needed.

```bash
cd contracts

# Set environment variables
export USDC_ADDRESS=0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e
export SPECULATE_CORE_ADDRESS=0x62E390c9251186E394cEF754FbB42b8391331d0F
export BSC_TESTNET_RPC_URL=https://bsc-testnet.publicnode.com

# Run the script
forge script script/SetSpeculateCoreOnUSDC.s.sol --rpc-url $BSC_TESTNET_RPC_URL --broadcast --legacy
```

## Step 2: Add Admin as Minter (Optional)
This allows the admin wallet to manually mint USDC if needed.

```bash
# Set environment variables
export USDC_ADDRESS=0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e
export ADMIN_ADDRESS=0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F  # Your admin wallet address
export BSC_TESTNET_RPC_URL=https://bsc-testnet.publicnode.com

# Run the script
forge script script/AddMinterToUSDC.s.sol --rpc-url $BSC_TESTNET_RPC_URL --broadcast --legacy
```

## Important Notes:
- `ADMIN_ADDRESS` should be your **wallet address** (0x9D767...), NOT the Core contract address
- `SPECULATE_CORE_ADDRESS` is the Core contract address (0x62E390c...)
- Step 1 is **required** for the Core to function properly
- Step 2 is **optional** (only if you want to manually mint USDC)

