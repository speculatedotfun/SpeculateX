# 🎉 BSC Mainnet Deployment - COMPLETE

## ✅ Deployment Status: VERIFIED & AWAITING TIMELOCK

**Deployment Date:** December 28, 2025
**Network:** BSC Mainnet (Chain ID: 56)
**Deployer:** 0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c
**Admin:** 0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c

---

## 📋 Deployed Contracts (All Verified ✅)

| Contract | Address | Verification |
|----------|---------|--------------|
| **Treasury** | `0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70` | ✅ Verified |
| **CoreRouter** ⭐ | `0x101450a49E730d2e9502467242d0B6f157BABe60` | ✅ Verified |
| **ChainlinkResolver** | `0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b` | ✅ Verified |
| **MarketFacet** | `0x8edbAa8A0E00859a1b5D613c23C642880ad63f31` | ✅ Verified |
| **TradingFacet** | `0x60F75d38399C44b295FD33FFDbb1cD35c9fF5257` | ✅ Verified |
| **LiquidityFacet** | `0x1Fda96fb1A1c6136856Eb355d08f2aa94c7f3516` | ✅ Verified |
| **SettlementFacet** | `0x9EfBED36e561db021014962d6aA08C308203fb1B` | ✅ Verified |

⭐ **Main Contract** - Use this address in your frontend/subgraph

---

## 🔗 BscScan Links

- [Treasury](https://bscscan.com/address/0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70#code)
- [CoreRouter](https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#code) ⭐
- [ChainlinkResolver](https://bscscan.com/address/0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b#code)
- [MarketFacet](https://bscscan.com/address/0x8edbAa8A0E00859a1b5D613c23C642880ad63f31#code)
- [TradingFacet](https://bscscan.com/address/0x60F75d38399C44b295FD33FFDbb1cD35c9fF5257#code)
- [LiquidityFacet](https://bscscan.com/address/0x1Fda96fb1A1c6136856Eb355d08f2aa94c7f3516#code)
- [SettlementFacet](https://bscscan.com/address/0x9EfBED36e561db021014962d6aA08C308203fb1B#code)

---

## ⏱️ Timelock Status

**Timelock Delay:** 48 hours (172,800 seconds)
**Status:** ⏳ Waiting for timelock to pass

### What's Happening?

All facet operations were **scheduled** during deployment but are **NOT active yet**.

The 48-hour timelock is a security feature that:
- Prevents immediate changes to the protocol
- Gives users time to review scheduled operations
- Protects against malicious upgrades

### Next Steps

1. **Wait 48 hours** from deployment time
2. **Execute timelock operations** to activate all facets
3. **System becomes fully operational**

See `../docs/TIMELOCK_EXECUTION.md` for detailed execution instructions.

---

## 🔧 Configuration

| Parameter | Value |
|-----------|-------|
| **Timelock Delay** | 172,800 seconds (48 hours) |
| **Treasury Daily Limit** | 50,000 USDT (50,000,000,000 with 6 decimals) |
| **Collateral Token** | USDT (0x55d398326f99059fF775485246999027B3197955) |

---

## 📊 Deployment Transactions

**Deployment Record:** `broadcast/deploy.sol/56/run-latest.json`

### Transaction Hashes

| Contract | Transaction Hash |
|----------|------------------|
| Treasury | `0x4b27edf0a3fe39f40c5e9935f97cd0f7ec2d40cc199cdc220af7ad4cd867cbbe` |
| CoreRouter | `0xb948a06d060fe25500ff8a64fcd95530ea0e1e4a9cc25b5690b7b5b748795e5c` |
| ChainlinkResolver | Check broadcast file |
| MarketFacet | Check broadcast file |
| TradingFacet | Check broadcast file |
| LiquidityFacet | Check broadcast file |
| SettlementFacet | Check broadcast file |

---

## 🎯 Integration Guide

### Frontend Integration

Update your frontend environment variables:

```env
NEXT_PUBLIC_CORE_ROUTER_ADDRESS=0x101450a49E730d2e9502467242d0B6f157BABe60
NEXT_PUBLIC_TREASURY_ADDRESS=0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70
NEXT_PUBLIC_RESOLVER_ADDRESS=0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b
NEXT_PUBLIC_USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
NEXT_PUBLIC_CHAIN_ID=56
```

### Subgraph Integration

Update `subgraph.mainnet.yaml`:

```yaml
dataSources:
  - name: SpeculateCore
    network: bsc
    source:
      address: "0x101450a49E730d2e9502467242d0B6f157BABe60"
      abi: SpeculateCore
      startBlock: <deployment_block>
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
- [x] Timelock operations scheduled
- [ ] Wait 48 hours
- [ ] Execute timelock operations
- [ ] Update frontend
- [ ] Update subgraph
- [ ] Test market creation
- [ ] Public announcement

---

## 🚨 Important Notes

### Security

- **Admin Address:** `0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c`
  - Has full control over protocol
  - Can schedule upgrades (24h+ timelock required)
  - Can pause protocol in emergencies
  - **PROTECT THIS PRIVATE KEY!**

- **Timelock Protection:**
  - All facet upgrades require 48-hour wait
  - Operations expire after 7 days if not executed
  - Cannot bypass timelock (enforced in contract)

### Before Going Live

1. ✅ Contracts verified
2. ⏳ Timelock executed (after 48h)
3. ⏳ Frontend updated with new addresses
4. ⏳ Subgraph deployed and synced
5. ⏳ Test market creation works
6. ⏳ Test trading works
7. ⏳ Test liquidity provision works
8. ⏳ Test market resolution works

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

**Next milestone:** Execute timelock operations in 48 hours to make the protocol fully operational.

---

**Deployment completed on:** December 28, 2025
**By:** Claude Code & Almog
