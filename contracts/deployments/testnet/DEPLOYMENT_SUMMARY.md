# BSC Testnet Deployment Summary
**Date:** January 2, 2026
**Network:** BSC Testnet (Chain ID: 97)
**Deployer:** 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
**Start Block:** 82087927

## Deployed Contracts

### Core Contracts
- **Treasury:** [0x03BDBFc8A9c237eB81C5c3F5dD4c566F79E9CfE7](https://testnet.bscscan.com/address/0x03BDBFc8A9c237eB81C5c3F5dD4c566F79E9CfE7)
- **CoreRouter:** [0x769706b79F3AfCb2D2aaa658D4444f68E6A03489](https://testnet.bscscan.com/address/0x769706b79F3AfCb2D2aaa658D4444f68E6A03489)
- **ChainlinkResolver:** [0x4A08A4764C6926c1a1d0C946E96808C13961c901](https://testnet.bscscan.com/address/0x4A08A4764C6926c1a1d0C946E96808C13961c901) (Verified: Auto-Resolve Policy with SLA + TWAP Fallback)
- **MockUSDC:** [0x3A84EDDD1A1C4bE4aEfB157476a82002bdD005D4](https://testnet.bscscan.com/address/0x3A84EDDD1A1C4bE4aEfB157476a82002bdD005D4)

### Facets (Diamond Pattern)
- **MarketFacet:** [0x858D0Bb450b208Ee5841FFC5f49cf0Fcc6Fc5cb3](https://testnet.bscscan.com/address/0x858D0Bb450b208Ee5841FFC5f49cf0Fcc6Fc5cb3)
- **TradingFacet:** [0xCc960988f0ea3B407DCE9886E1c43619F93F99B0](https://testnet.bscscan.com/address/0xCc960988f0ea3B407DCE9886E1c43619F93F99B0)
- **LiquidityFacet:** [0x47650b66e83bf8AE1F8538F270b5F07fc3c83db9](https://testnet.bscscan.com/address/0x47650b66e83bf8AE1F8538F270b5F07fc3c83db9)
- **SettlementFacet:** [0x20213F0E39DA96A8f09eb0756E33B3732eb9Fb25](https://testnet.bscscan.com/address/0x20213F0E39DA96A8f09eb0756E33B3732eb9Fb25)

## Configuration

- **USDC Token:** 0x3A84EDDD1A1C4bE4aEfB157476a82002bdD005D4 (MockUSDC with faucet)
- **Timelock Delay:** 0 seconds (instant execution for testnet)
- **Treasury Daily Limit:** 50,000 USDC
- **Minimum Market Seed:** 500 USDC
- **LP Fee Cooldown:** 1 block (H-01 fix: prevents same-block sandwich attacks)
- **Operations Wired:** All 23 operations (including createScheduledMarket)

## Verification Status

✅ All contracts verified on BSCScan Testnet

## Features

### ✅ Scheduled Markets Support
- `createMarket` - Standard market creation
- `createScheduledMarket` - Scheduled market creation with start time
- Trading disabled until start time
- All events indexed in subgraph

### ✅ Security Fixes Applied
- H-01: LP fee cooldown (sandwich attack prevention)
- H-02: Liquidity lock after expiry
- L-01: Fee validation
- L-06: Minimum duration enforcement
- M-03: Dynamic price jump caps
- M-01: Chainlink phase boundary handling

## Deployment Commands

### Deploy
```bash
cd contracts
$env:ADMIN_ADDRESS="0x29D67d1Ad683A76b2750f74B40b6e79d715C933c"
$env:DEPLOY_MOCK_USDC="true"
forge script script/deploy.sol:DeploySpeculateX --rpc-url bsc_testnet --broadcast --verify --legacy -vvv
```

### Verify Facet Connections
```bash
forge script script/CheckTestnetFacets.s.sol:CheckTestnetFacets --rpc-url bsc_testnet
```

### Check Market Creation Setup
```bash
forge script script/TestMarketCreation.s.sol:TestMarketCreation --rpc-url bsc_testnet
```

## Next Steps

1. **Frontend Integration:** Update frontend configuration to use testnet addresses
2. **Get Testnet USDC:** Use MockUSDC faucet at 0x3A84EDDD1A1C4bE4aEfB157476a82002bdD005D4
3. **Create Test Market:** Create a test prediction market via frontend
4. **Test Scheduled Market:** Create a scheduled market and verify trading restrictions
5. **Test Trading Flow:** Test complete user flow (buy, sell, add/remove liquidity)
6. **Test Settlement:** Test market resolution and redemption

## Notes

- All facets are properly wired and verified on BSCScan
- Router has timelock disabled (0 seconds) for testnet iteration
- Admin/Market Creator roles granted to deployer address
- All security fixes from audit implemented and tested
- Diamond pattern (facet-based architecture) working correctly
- All 23 operations executed immediately (no timelock on testnet)
