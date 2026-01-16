# BSC Testnet Deployment Summary
**Date:** January 2026
**Network:** BSC Testnet (Chain ID: 97)
**Deployer:** 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
**FinalAdmin:** 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
**Start Block:** 84802491

## Deployed Contracts

### Core Contracts
- **Treasury:** [0x8566B7c306099c7CdB1c2fcACA099C86cf74C977](https://testnet.bscscan.com/address/0x8566B7c306099c7CdB1c2fcACA099C86cf74C977)
- **CoreRouter:** [0x9315fc0082d85ABa5Dd680C30b53D73b0F032C2D](https://testnet.bscscan.com/address/0x9315fc0082d85ABa5Dd680C30b53D73b0F032C2D)
- **ChainlinkResolver:** [0x997a2393976e2629bb1DF909Ee4e42A800d2D0BD](https://testnet.bscscan.com/address/0x997a2393976e2629bb1DF909Ee4e42A800d2D0BD)
- **MockUSDC:** [0x34F7d01f7529F176fF682aACD468Ba99A89E5aAF](https://testnet.bscscan.com/address/0x34F7d01f7529F176fF682aACD468Ba99A89E5aAF)

### Facets (Diamond Pattern)
- **MarketFacet:** [0xdba345d7535E7f4c1745667B181e13c9EF74F056](https://testnet.bscscan.com/address/0xdba345d7535E7f4c1745667B181e13c9EF74F056)
- **TradingFacet:** [0xbdC0b854289F29B95C919A9A05474d815C806960](https://testnet.bscscan.com/address/0xbdC0b854289F29B95C919A9A05474d815C806960)
- **LiquidityFacet:** [0xc1C8C0eC33e055Ef092E207B12594ca5E9120528](https://testnet.bscscan.com/address/0xc1C8C0eC33e055Ef092E207B12594ca5E9120528)
- **SettlementFacet:** [0x6312F6730891924c78735E762eC7042634B4D1fA](https://testnet.bscscan.com/address/0x6312F6730891924c78735E762eC7042634B4D1fA)
- **AdminFacet:** [0x22A62b5ABE7Eb54A72066c75cC61bd9343Dab804](https://testnet.bscscan.com/address/0x22A62b5ABE7Eb54A72066c75cC61bd9343Dab804)

## Configuration

- **USDC Token:** 0x34F7d01f7529F176fF682aACD468Ba99A89E5aAF (MockUSDC with faucet, 6 decimals)
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
2. **Get Testnet USDC:** Use MockUSDC faucet at 0x34F7d01f7529F176fF682aACD468Ba99A89E5aAF
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
