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
| **SpeculateCore** | `0x297f325e98DdFd682dd2dc964a5BEda9861D54D5` | [View](https://testnet.bscscan.com/address/0x297f325e98DdFd682dd2dc964a5BEda9861D54D5) | ✅ Active |
| **ChainlinkResolver** | `0x363eaff32ba46F804Bc7E6352A585A705ac97aBD` | [View](https://testnet.bscscan.com/address/0x363eaff32ba46F804Bc7E6352A585A705ac97aBD) | ✅ Active |
| **Treasury** | `0xfa8CC09b570e7e35FA1C71A4986D856262Faf29a` | [View](https://testnet.bscscan.com/address/0xfa8CC09b570e7e35FA1C71A4986D856262Faf29a) | ✅ Deployed |
| **Admin** | `0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F` | [View](https://testnet.bscscan.com/address/0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F) | ✅ Admin |

### External Contracts

| Contract | Address | BscScan | Type |
|----------|---------|---------|------|
| **MockUSDC** | `0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e` | [View](https://testnet.bscscan.com/address/0x8e38899dEC73FbE6Bde8276b8729ac1a3A6C0b8e) | Mock Token (Faucet) |

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

**עדכון אחרון**: 11/12/2025 (לאחר פריסת Mainnet)

