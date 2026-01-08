# 🎉 BSC Mainnet Deployment - COMPLETE

## ✅ Deployment Status: VERIFIED & ACTIVE

**Deployment Date:** January 2, 2026
**Network:** BSC Mainnet (Chain ID: 56)
**Deployer:** 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
**Admin:** 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
**Start Block:** 73821951

---

## 📋 Deployed Contracts (All Verified ✅)

| Contract | Address | Verification |
|----------|---------|--------------|
| **Treasury** | `0x5fB4E87Dd91d60fb55405d4593Ec3B58225c2651` | ✅ Verified |
| **CoreRouter** ⭐ | `0xfBd5dD6bC095eA9C3187AEC24E4D1F04F25f8365` | ✅ Verified |
| **ChainlinkResolver** | `0xe11c1Dc5768858732d4a255A3baE579860780AE2` | ✅ Verified |
| **MarketFacet** | `0x8aE4e9fAA34aFA70cf7D01239f1fB87b1ea303e7` | ✅ Verified |
| **TradingFacet** | `0x55390A0AAc12b1FD765969e3B5A9Ee51894E8830` | ✅ Verified |
| **LiquidityFacet** | `0x5A5350E102C3224024901ad9379Baf9af4FBAb87` | ✅ Verified |
| **SettlementFacet** | `0xc12560a00609FFd23110a5630497d4926da4d83D` | ✅ Verified |

⭐ **Main Contract** - Use this address in your frontend/subgraph

---

## 🔗 BscScan Links

- [Treasury](https://bscscan.com/address/0x5fB4E87Dd91d60fb55405d4593Ec3B58225c2651#code)
- [CoreRouter](https://bscscan.com/address/0xfBd5dD6bC095eA9C3187AEC24E4D1F04F25f8365#code) ⭐
- [ChainlinkResolver](https://bscscan.com/address/0xe11c1Dc5768858732d4a255A3baE579860780AE2#code)
- [MarketFacet](https://bscscan.com/address/0x8aE4e9fAA34aFA70cf7D01239f1fB87b1ea303e7#code)
- [TradingFacet](https://bscscan.com/address/0x55390A0AAc12b1FD765969e3B5A9Ee51894E8830#code)
- [LiquidityFacet](https://bscscan.com/address/0x5A5350E102C3224024901ad9379Baf9af4FBAb87#code)
- [SettlementFacet](https://bscscan.com/address/0xc12560a00609FFd23110a5630497d4926da4d83D#code)

---

## ⏱️ Timelock Status

**Timelock Delay:** 24 hours (86,400 seconds)
**Status:** ⏳ Waiting for timelock to pass

### What's Happening?

All 23 facet operations (including `createScheduledMarket`) were **scheduled** during deployment but are **NOT active yet**.

The 24-hour timelock is a security feature that:
- Prevents immediate changes to the protocol
- Gives users time to review scheduled operations
- Protects against malicious upgrades

### Next Steps

1. **Wait 24 hours** from deployment time (block 73821951)
2. **Execute timelock operations** to activate all facets
3. **System becomes fully operational**

See `../docs/TIMELOCK_EXECUTION.md` for detailed execution instructions.

---

## 🔧 Configuration

| Parameter | Value |
|-----------|-------|
| **Timelock Delay** | 86,400 seconds (24 hours) |
| **Treasury Daily Limit** | 50,000 USDC (50,000,000,000 with 6 decimals) |
| **Collateral Token** | USDC (0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d) |
| **Operations Scheduled** | 23 (1 resolver + 22 facets, including createScheduledMarket) |

---

## 🎯 Integration Guide

### Frontend Integration

Update your frontend environment variables:

```env
NEXT_PUBLIC_MAINNET_CORE=0xfBd5dD6bC095eA9C3187AEC24E4D1F04F25f8365
NEXT_PUBLIC_MAINNET_TREASURY=0x5fB4E87Dd91d60fb55405d4593Ec3B58225c2651
NEXT_PUBLIC_MAINNET_RESOLVER=0xe11c1Dc5768858732d4a255A3baE579860780AE2
NEXT_PUBLIC_MAINNET_USDC=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
NEXT_PUBLIC_MAINNET_FACET_MARKET=0x8aE4e9fAA34aFA70cf7D01239f1fB87b1ea303e7
NEXT_PUBLIC_MAINNET_FACET_TRADING=0x55390A0AAc12b1FD765969e3B5A9Ee51894E8830
NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY=0x5A5350E102C3224024901ad9379Baf9af4FBAb87
NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT=0xc12560a00609FFd23110a5630497d4926da4d83D
NEXT_PUBLIC_CHAIN_ID=56
```

### Subgraph Integration

Update `subgraph.mainnet.yaml`:

```yaml
dataSources:
  - name: SpeculateCore
    network: bsc
    source:
      address: "0xfBd5dD6bC095eA9C3187AEC24E4D1F04F25f8365"
      abi: SpeculateCore
      startBlock: 73821951
```

### ABI Files

Get ABIs from:
- BscScan (verified contracts)
- `contracts/out/` directory
- Broadcast file

---

## ✅ Verification Checklist

- [x] All contracts deployed
- [x] All contracts verified on BscScan
- [x] Admin roles configured
- [x] Timelock operations scheduled (23 operations)
- [ ] Wait 24 hours
- [ ] Execute timelock operations
- [ ] Update frontend
- [ ] Update subgraph
- [ ] Test market creation
- [ ] Test scheduled market creation
- [ ] Public announcement

---

## 🚨 Important Notes

### Security

- **Admin Address:** `0x29D67d1Ad683A76b2750f74B40b6e79d715C933c`
  - Has full control over protocol
  - Can schedule upgrades (24h+ timelock required)
  - Can pause protocol in emergencies
  - **PROTECT THIS PRIVATE KEY!**

- **Timelock Protection:**
  - All facet upgrades require 24-hour wait
  - Operations expire after 7 days if not executed
  - Cannot bypass timelock (enforced in contract)

### Before Going Live

1. ✅ Contracts verified
2. ⏳ Timelock executed (after 24h)
3. ⏳ Frontend updated with new addresses
4. ⏳ Subgraph deployed and synced
5. ⏳ Test market creation works
6. ⏳ Test scheduled market creation works
7. ⏳ Test trading works
8. ⏳ Test liquidity provision works
9. ⏳ Test market resolution works

---

## 📞 Support & Resources

**Documentation:**
- Verification Guide: `../docs/VERIFICATION.md`
- Timelock Execution: `../docs/TIMELOCK_EXECUTION.md`
- Contract Addresses: `addresses.json`

**Repository:**
- Deployment Records: `broadcast/deploy.sol/56/`
- Contract Source: `../../src/`
- Tests: `../../test/`

**Network Info:**
- Network: BSC Mainnet
- Chain ID: 56
- RPC: https://bsc-dataseed.binance.org/
- Explorer: https://bscscan.com/

---

## 🎉 Congratulations!

Your SpeculateX protocol is successfully deployed and verified on BSC Mainnet!

**Next milestone:** Execute timelock operations in 24 hours to make the protocol fully operational.

---

**Deployment completed on:** January 2, 2026
**By:** Almog
