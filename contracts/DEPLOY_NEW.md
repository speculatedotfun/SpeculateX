# 🚀 Complete Deployment Guide - New Contracts

This guide covers deploying all contracts with the latest security fixes and new features.

## Prerequisites

1. **Environment Setup**
   ```bash
   cd contracts
   ```

2. **Create `.env` file** (if not exists):
   ```bash
   PRIVATE_KEY=0x...your_private_key
   BSC_TESTNET_RPC_URL=https://bsc-testnet.publicnode.com
   BSC_MAINNET_RPC_URL=https://bsc.publicnode.com
   BSCSCAN_API_KEY=your_bscscan_api_key
   ```

## Deployment Steps

### Step 1: Compile Contracts

```bash
forge build
```

### Step 2: Run Tests (Recommended)

```bash
forge test
```

### Step 3: Deploy to Testnet

The deployment script will:
- Deploy Treasury, MockUSDC, SpeculateCoreRouter, ChainlinkResolver
- Deploy all 4 Facets (Market, Trading, Liquidity, Settlement)
- Grant MINTER_ROLE to router
- Register all function selectors
- Set up resolver connection

**For Testnet (timelock = 0 for immediate setup):**
```bash
forge script script/deploy.sol:DeployAndSchedule --rpc-url bsc_testnet --broadcast --legacy --gas-price 1000000000 -vvv
```

**For Production (24h timelock):**
```bash
# Set timelock delay in .env
TIMELOCK_DELAY=86400

forge script script/deploy.sol:DeployAndSchedule --rpc-url bsc_mainnet --broadcast --legacy --gas-price 5000000000 -vvv
```

### Step 4: Update Frontend Addresses

After deployment, update `frontend/lib/contracts.ts` with the new addresses:

```typescript
const TESTNET_ADDRESSES = {
  core: '0x...' as `0x${string}`,        // SpeculateCoreRouter
  usdc: '0x...' as `0x${string}`,        // MockUSDC (testnet) or USDC (mainnet)
  chainlinkResolver: '0x...' as `0x${string}`,
  treasury: '0x...' as `0x${string}`,
  admin: '0x...' as `0x${string}`,       // Your deployer address
  facets: {
    market: '0x...' as `0x${string}`,
    trading: '0x...' as `0x${string}`,
    liquidity: '0x...' as `0x${string}`,
    settlement: '0x...' as `0x${string}`,
  },
};
```

### Step 5: Update ABIs

Copy the compiled ABIs to the frontend:

**PowerShell:**
```powershell
Copy-Item contracts\out\SpeculateCoreRouter.sol\SpeculateCoreRouter.json frontend\lib\abis\SpeculateCoreRouter.json -Force
Copy-Item contracts\out\MarketFacet.sol\MarketFacet.json frontend\lib\abis\MarketFacet.json -Force
Copy-Item contracts\out\TradingFacet.sol\TradingFacet.json frontend\lib\abis\TradingFacet.json -Force
Copy-Item contracts\out\LiquidityFacet.sol\LiquidityFacet.json frontend\lib\abis\LiquidityFacet.json -Force
Copy-Item contracts\out\SettlementFacet.sol\SettlementFacet.json frontend\lib\abis\SettlementFacet.json -Force
Copy-Item contracts\out\ChainlinkResolver.sol\ChainlinkResolver.json frontend\lib\abis\ChainlinkResolver.v2.json -Force
Copy-Item contracts\out\Treasury.sol\Treasury.json frontend\lib\abis\Treasury.json -Force
```

**Bash/Linux:**
```bash
cp contracts/out/SpeculateCoreRouter.sol/SpeculateCoreRouter.json frontend/lib/abis/SpeculateCoreRouter.json
cp contracts/out/MarketFacet.sol/MarketFacet.json frontend/lib/abis/MarketFacet.json
cp contracts/out/TradingFacet.sol/TradingFacet.json frontend/lib/abis/TradingFacet.json
cp contracts/out/LiquidityFacet.sol/LiquidityFacet.json frontend/lib/abis/LiquidityFacet.json
cp contracts/out/SettlementFacet.sol/SettlementFacet.json frontend/lib/abis/SettlementFacet.json
cp contracts/out/ChainlinkResolver.sol/ChainlinkResolver.json frontend/lib/abis/ChainlinkResolver.v2.json
cp contracts/out/Treasury.sol/Treasury.json frontend/lib/abis/Treasury.json
```

### Step 6: Verify Contracts on BscScan (Optional but Recommended)

```bash
# Verify Router
forge verify-contract <ROUTER_ADDRESS> SpeculateCoreRouter --chain bsc_testnet --constructor-args $(cast abi-encode "constructor(address,address,address,uint256)" <ADMIN> <USDC> <TREASURY> <TIMELOCK>)

# Verify Facets
forge verify-contract <MARKET_FACET_ADDRESS> MarketFacet --chain bsc_testnet
forge verify-contract <TRADING_FACET_ADDRESS> TradingFacet --chain bsc_testnet
forge verify-contract <LIQUIDITY_FACET_ADDRESS> LiquidityFacet --chain bsc_testnet
forge verify-contract <SETTLEMENT_FACET_ADDRESS> SettlementFacet --chain bsc_testnet

# Verify Resolver
forge verify-contract <RESOLVER_ADDRESS> ChainlinkResolver --chain bsc_testnet --constructor-args $(cast abi-encode "constructor(address,address)" <ADMIN> <CORE>)

# Verify Treasury
forge verify-contract <TREASURY_ADDRESS> Treasury --chain bsc_testnet --constructor-args $(cast abi-encode "constructor(address,uint256)" <ADMIN> <DAILY_LIMIT>)
```

## Registered Function Selectors

The deployment script registers all these functions:

### MarketFacet
- `createMarket(...)`
- `getMarketState(uint256)`
- `getMarketResolution(uint256)`
- `getMarketQuestion(uint256)`
- `getMarketInvariants(uint256)` ✨ **NEW**

### TradingFacet
- `spotPriceYesE18(uint256)`
- `spotPriceYesE6(uint256)`
- `buy(uint256,bool,uint256,uint256)`
- `sell(uint256,bool,uint256,uint256)`

### LiquidityFacet
- `addLiquidity(uint256,uint256)`
- `removeLiquidity(uint256,uint256)` ✨ **NEW**
- `claimLpFees(uint256)`

### SettlementFacet
- `resolveMarketWithPrice(uint256,uint256)`
- `emergencyCancelMarket(bytes32,uint256)` ✨ **NEW**
- `redeem(uint256,bool)`
- `pendingLpResidual(uint256,address)`
- `claimLpResidual(uint256)`

## Post-Deployment Checklist

- [ ] All contracts deployed successfully
- [ ] All facets registered with correct selectors
- [ ] Resolver connected to router
- [ ] MINTER_ROLE granted to router on USDC
- [ ] Frontend addresses updated
- [ ] Frontend ABIs updated
- [ ] Contracts verified on BscScan
- [ ] Test market creation
- [ ] Test buy/sell operations
- [ ] Test add/remove liquidity
- [ ] Test fee claiming
- [ ] Test market resolution
- [ ] Test emergency cancellation (if needed)

## Important Notes

1. **Timelock Delay**: 
   - Testnet: 0 (immediate execution)
   - Mainnet: 86400 (24 hours) - **REQUIRED**

2. **Treasury Daily Limit**: 
   - Default: 20,000 USDC
   - Can be updated via `setDailyLimit()` (max: 5M USDC)

3. **Admin Roles**:
   - Deployer gets DEFAULT_ADMIN_ROLE automatically
   - Grant MARKET_CREATOR_ROLE to allow market creation
   - Use multisig for production

4. **Security**:
   - All operations are timelocked (24h on mainnet)
   - Pause functionality available
   - Emergency cancellation available
   - ETH recovery available

## Troubleshooting

### "NO_FACET" errors
- Check that all facets are registered
- Verify selector matches function signature
- Check that router is calling correct facet address

### Timelock issues
- Verify `minTimelockDelay` is set correctly
- Check operation `readyAt` timestamp
- Ensure operation hasn't expired (>7 days)

### Status detection issues
- Use `getMarketState()` for reliable status reading
- Check that status enum values match (0=Active, 1=Resolved, 2=Cancelled)

---

**Last Updated**: After Final Security Hardening (All Audit Fixes Applied)

