# ChainlinkResolver Verification Instructions

> **⚠️ NOTE: This file is for reference only. All contracts have been redeployed and verified automatically.**
> **Current Testnet Resolver:** `0x997a2393976e2629bb1DF909Ee4e42A800d2D0BD` (✅ Already Verified)

## Current Testnet Deployment (January 2026)

All contracts were automatically verified during deployment. If you need to manually verify:

### Current Testnet ChainlinkResolver
- **Address**: `0x997a2393976e2629bb1DF909Ee4e42A800d2D0BD`
- **Network**: BSC Testnet (Chain ID: 97)
- **BscScan**: https://testnet.bscscan.com/address/0x997a2393976e2629bb1DF909Ee4e42A800d2D0BD
- **Status**: ✅ Verified

### Constructor Arguments (for reference)
```
00000000000000000000000029d67d1ad683a76b2750f74b40b6e79d715c933c0000000000000000000000009315fc0082d85aba5dd680c30b53d73b0f032c2d
```

This decodes to:
- `admin`: 0x29D67d1Ad683A76b2750f74B40b6e79d715C933c
- `core`: 0x9315fc0082d85ABa5Dd680C30b53D73b0F032C2D

## Manual Verification (if needed)

If automated verification fails, use these settings:

- **Compiler Type**: Solidity (Single file)
- **Compiler Version**: v0.8.24+commit.e11b9ed9
- **Optimization**: Yes (200 runs)
- **EVM Version**: default
- **Via-IR**: Yes (matches deployment settings)
- **License**: MIT
