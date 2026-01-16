# 🎉 BSC Mainnet Deployment - COMPLETE

## ✅ Deployment Status: VERIFIED & ACTIVE

**Deployment Date:** January 2026
**Network:** BSC Mainnet (Chain ID: 56)
**Deployer:** 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
**Admin:** 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
**Start Block:** (Update after deployment)

---

## 📋 Deployed Contracts (All Verified ✅)

| Contract | Address | Verification |
|----------|---------|--------------|
| **Treasury** | `0x50c377AedEB8E87f9C3715Af4D84f4fA23154553` | ✅ Verified |
| **CoreRouter** ⭐ | `0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E` | ✅ Verified |
| **ChainlinkResolver** | `0xbff5aC1fd8EdB1aEf0a32e3Dedd01ff351DBa446` | ✅ Verified |
| **MarketFacet** | `0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58` | ✅ Verified |
| **TradingFacet** | `0x1e88647a37DDb2191F4B72Aa134cFcb98782e694` | ✅ Verified |
| **LiquidityFacet** | `0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2` | ✅ Verified |
| **SettlementFacet** | `0x3F7831134683d6fC0F5658E5503b2cF7774A0697` | ✅ Verified |
| **AdminFacet** | `0x1FeFe6E8C47fbf1f0919aeF65C18722E89a8769e` | ✅ Verified |

⭐ **Main Contract** - Use this address in your frontend/subgraph

---

## 🔗 BscScan Links

- [Treasury](https://bscscan.com/address/0x50c377AedEB8E87f9C3715Af4D84f4fA23154553#code)
- [CoreRouter](https://bscscan.com/address/0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E#code) ⭐
- [ChainlinkResolver](https://bscscan.com/address/0xbff5aC1fd8EdB1aEf0a32e3Dedd01ff351DBa446#code)
- [MarketFacet](https://bscscan.com/address/0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58#code)
- [TradingFacet](https://bscscan.com/address/0x1e88647a37DDb2191F4B72Aa134cFcb98782e694#code)
- [LiquidityFacet](https://bscscan.com/address/0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2#code)
- [SettlementFacet](https://bscscan.com/address/0x3F7831134683d6fC0F5658E5503b2cF7774A0697#code)
- [AdminFacet](https://bscscan.com/address/0x1FeFe6E8C47fbf1f0919aeF65C18722E89a8769e#code)

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
| **Treasury Daily Limit** | 50,000 USDC (50,000 * 10^18 with 18 decimals) |
| **Collateral Token** | USDC (0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d, 18 decimals) |
| **Operations Scheduled** | 28 (1 resolver + 27 facets, including AdminFacet) |

---

## 🎯 Integration Guide

### Frontend Integration

Update your frontend environment variables:

```env
NEXT_PUBLIC_MAINNET_CORE=0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E
NEXT_PUBLIC_MAINNET_TREASURY=0x50c377AedEB8E87f9C3715Af4D84f4fA23154553
NEXT_PUBLIC_MAINNET_RESOLVER=0xbff5aC1fd8EdB1aEf0a32e3Dedd01ff351DBa446
NEXT_PUBLIC_MAINNET_USDC=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
NEXT_PUBLIC_MAINNET_USDC_DECIMALS=18
NEXT_PUBLIC_MAINNET_FACET_MARKET=0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58
NEXT_PUBLIC_MAINNET_FACET_TRADING=0x1e88647a37DDb2191F4B72Aa134cFcb98782e694
NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY=0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2
NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT=0x3F7831134683d6fC0F5658E5503b2cF7774A0697
NEXT_PUBLIC_CHAIN_ID=56
```

### Subgraph Integration

Update `subgraph.mainnet.yaml`:

```yaml
dataSources:
  - name: SpeculateCore
    network: bsc
    source:
      address: "0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E"
      abi: SpeculateCore
      startBlock: (Update after deployment)
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
