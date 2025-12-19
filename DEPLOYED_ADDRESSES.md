# 📋 Deployed Contract Addresses

רשימה מלאה של כל כתובות החוזים שנפרסו.

---

## 🌐 BSC Mainnet (Chain ID: 56)

### ✅ נפרס היום (11/12/2025)

| Contract | Address | BscScan | Status |
|----------|---------|---------|--------|
| **SpeculateCore** | `0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725` | [View](https://bscscan.com/address/0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725) | ✅ Deployed |
| **ChainlinkResolver** | `0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3` | [View](https://bscscan.com/address/0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3) | ✅ Deployed |
| **Treasury** | `0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778` | [View](https://bscscan.com/address/0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778) | ✅ Deployed |
| **Admin** | `0x4dc74a8532550ffca11fb958549ca0b72e3f1f1c` | [View](https://bscscan.com/address/0x4dc74a8532550ffca11fb958549ca0b72e3f1f1c) | ✅ Admin |

### External Contracts

| Contract | Address | BscScan | Type |
|----------|---------|---------|------|
| **USDC** | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | [View](https://bscscan.com/address/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d) | Bridged USDC |

### Chainlink Price Feeds (Mainnet)

| Feed | Address | BscScan |
|------|---------|---------|
| **BTC/USD** | `0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf` | [View](https://bscscan.com/address/0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf) |
| **ETH/USD** | `0x9eF1b8c0E4F7dc8bF36B6Fb137B0c48bA715B9c8` | [View](https://bscscan.com/address/0x9eF1b8c0E4F7dc8bF36B6Fb137B0c48bA715B9c8) |
| **BNB/USD** | `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` | [View](https://bscscan.com/address/0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE) |

---

## 🧪 BSC Testnet (Chain ID: 97)

### Core Contracts

| Contract | Address | BscScan | Status |
|----------|---------|---------|--------|
| **SpeculateCoreRouter** | `0xcdCcB359E566E4DBE129F6752Ab185E0AdBE452a` | [View](https://testnet.bscscan.com/address/0xcdCcB359E566E4DBE129F6752Ab185E0AdBE452a) | ✅ Active (Final Security Hardening) |
| **ChainlinkResolver** | `0x68Fd129dfA440ce5FC18717AFD759F5A4499E60c` | [View](https://testnet.bscscan.com/address/0x68Fd129dfA440ce5FC18717AFD759F5A4499E60c) | ✅ Active (All Audit Fixes) |
| **Treasury** | `0x0f4197D85e1439D56AEc7b00C4F195c1e6967C21` | [View](https://testnet.bscscan.com/address/0x0f4197D85e1439D56AEc7b00C4F195c1e6967C21) | ✅ Deployed (With Cap) |
| **Admin** | *(deployer wallet)* | *(see `vm.addr(PRIVATE_KEY)`)* | ✅ Admin |

### External Contracts

| Contract | Address | BscScan | Type |
|----------|---------|---------|------|
| **MockUSDC** | `0xb1b655406eb0bfA53Fc306C36A6B9D5d7Eb4ab07` | [View](https://testnet.bscscan.com/address/0xb1b655406eb0bfA53Fc306C36A6B9D5d7Eb4ab07) | Mock Token (Faucet) |

### Facets (Diamond)

| Facet | Address | BscScan | Status |
|------|---------|---------|--------|
| **MarketFacet** | `0x6595128E5D19375D914c76e1Df88dB7a0Bd722eA` | [View](https://testnet.bscscan.com/address/0x6595128E5D19375D914c76e1Df88dB7a0Bd722eA) | ✅ Active |
| **TradingFacet** | `0x7b460E01040875Ee2b41CF90B8A2a67a92aa6e8C` | [View](https://testnet.bscscan.com/address/0x7b460E01040875Ee2b41CF90B8A2a67a92aa6e8C) | ✅ Active |
| **LiquidityFacet** | `0x638682376128Eb2CEB1DC9f9c7EB38cea683C2DF` | [View](https://testnet.bscscan.com/address/0x638682376128Eb2CEB1DC9f9c7EB38cea683C2DF) | ✅ Active |
| **SettlementFacet** | `0x341db5dA04feA672b78493cB0a5168154c962254` | [View](https://testnet.bscscan.com/address/0x341db5dA04feA672b78493cB0a5168154c962254) | ✅ Active |

### Chainlink Price Feeds (Testnet)

| Feed | Address | BscScan |
|------|---------|---------|
| **BTC/USD** | `0x5741306c21795FdCBb9b265Ea0255F499DFe515C` | [View](https://testnet.bscscan.com/address/0x5741306c21795FdCBb9b265Ea0255F499DFe515C) |
| **ETH/USD** | `0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7` | [View](https://testnet.bscscan.com/address/0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7) |

---

## 📝 שימוש ב-.env

### `contracts/.env`

```bash
# Mainnet Addresses (לאחר פריסה)
USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
SPECULATE_CORE_ADDRESS=0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725
CHAINLINK_RESOLVER_ADDRESS=0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3
TREASURY_ADDRESS=0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778

# Testnet Addresses (אופציונלי)
# SPECULATE_CORE_ADDRESS=0x297f325e98DdFd682dd2dc964a5BEda9861D54D5
# CHAINLINK_RESOLVER_ADDRESS=0x363eaff32ba46F804Bc7E6352A585A705ac97aBD
# USDC_ADDRESS=0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e
```

### `frontend/.env.local`

```bash
# כתובות כבר מוגדרות בקוד (contracts.ts)
# אפשר לדרוס אם צריך:
# NEXT_PUBLIC_CORE_ADDRESS=0x...
# NEXT_PUBLIC_USDC_ADDRESS=0x...
# NEXT_PUBLIC_CHAINLINK_RESOLVER_ADDRESS=0x...
```

---

## 🔗 קישורים שימושיים

- **BscScan Mainnet**: https://bscscan.com/
- **BscScan Testnet**: https://testnet.bscscan.com/
- **Chainlink Price Feeds**: https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain

---

**עדכון אחרון**: 12/12/2024 (עדכון ChainlinkResolver עם Deterministic Resolution)

