# 🚀 Quick Deployment Guide

## Ready to Deploy

All contracts have been updated with the latest security fixes and are ready for deployment.

### New Functions Added

The deployment script now registers these additional functions:

1. **`getMarketInvariants(uint256)`** - MarketFacet
   - Monitoring helper for ops/bots
   - Returns circulating supply, liability, vault, and bE18

2. **`removeLiquidity(uint256,uint256)`** - LiquidityFacet
   - Allows LPs to withdraw liquidity
   - Includes solvency checks and minimum liquidity floor

3. **`emergencyCancelMarket(bytes32,uint256)`** - SettlementFacet
   - Timelocked emergency cancellation
   - Allows admin to cancel markets in emergency situations

## Deployment Command

### Testnet (Timelock = 0)

```bash
cd contracts
forge script script/deploy.sol:DeployAndSchedule --rpc-url bsc_testnet --broadcast --legacy --gas-price 1000000000 -vvv
```

### Mainnet (Timelock = 24 hours)

First, set in `.env`:
```
TIMELOCK_DELAY=86400
```

Then deploy:
```bash
cd contracts
forge script script/deploy.sol:DeployAndSchedule --rpc-url bsc_mainnet --broadcast --legacy --gas-price 5000000000 -vvv
```

## What Gets Deployed

1. **Treasury** - Fee collection contract
2. **MockUSDC** (testnet) or **USDC** (mainnet) - Payment token
3. **SpeculateCoreRouter** - Diamond router
4. **ChainlinkResolver** - Oracle resolution
5. **MarketFacet** - Market creation
6. **TradingFacet** - Buy/sell operations
7. **LiquidityFacet** - Add/remove liquidity
8. **SettlementFacet** - Market resolution & cancellation

## Post-Deployment Steps

1. **Update Frontend Addresses**
   - Edit `frontend/lib/contracts.ts`
   - Replace with new deployed addresses

2. **Copy ABIs**
   ```powershell
   Copy-Item contracts\out\SpeculateCoreRouter.sol\SpeculateCoreRouter.json frontend\lib\abis\SpeculateCoreRouter.json -Force
   Copy-Item contracts\out\MarketFacet.sol\MarketFacet.json frontend\lib\abis\MarketFacet.json -Force
   Copy-Item contracts\out\TradingFacet.sol\TradingFacet.json frontend\lib\abis\TradingFacet.json -Force
   Copy-Item contracts\out\LiquidityFacet.sol\LiquidityFacet.json frontend\lib\abis\LiquidityFacet.json -Force
   Copy-Item contracts\out\SettlementFacet.sol\SettlementFacet.json frontend\lib\abis\SettlementFacet.json -Force
   Copy-Item contracts\out\ChainlinkResolver.sol\ChainlinkResolver.json frontend\lib\abis\ChainlinkResolver.v2.json -Force
   Copy-Item contracts\out\Treasury.sol\Treasury.json frontend\lib\abis\Treasury.json -Force
   ```

3. **Update CONTRACT_ADDRESSES.md**
   - Document all new addresses

4. **Test**
   - Create a test market
   - Test buy/sell
   - Test add/remove liquidity
   - Test resolution

## All Registered Selectors

### MarketFacet (5 functions)
- `createMarket(...)`
- `getMarketState(uint256)`
- `getMarketResolution(uint256)`
- `getMarketQuestion(uint256)`
- `getMarketInvariants(uint256)` ✨

### TradingFacet (4 functions)
- `spotPriceYesE18(uint256)`
- `spotPriceYesE6(uint256)`
- `buy(uint256,bool,uint256,uint256)`
- `sell(uint256,bool,uint256,uint256)`

### LiquidityFacet (3 functions)
- `addLiquidity(uint256,uint256)`
- `removeLiquidity(uint256,uint256)` ✨
- `claimLpFees(uint256)`

### SettlementFacet (5 functions)
- `resolveMarketWithPrice(uint256,uint256)`
- `emergencyCancelMarket(bytes32,uint256)` ✨
- `redeem(uint256,bool)`
- `pendingLpResidual(uint256,address)`
- `claimLpResidual(uint256)`

**Total: 17 function selectors registered**

---

Ready to deploy! 🎉

