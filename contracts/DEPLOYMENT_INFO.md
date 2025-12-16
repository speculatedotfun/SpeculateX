# Deployment Information

## BSC Testnet (Chain ID: 97)

**Deployed:** December 2024 (Diamond Architecture)

### Core Contracts
- **Core Router**: `0x77dF457e9DD84881702996Bd75F59817786e9D59`
- **Treasury**: `0x7D3e9D7E08caF9E0922256360a92F521d7B868C3`
- **MockUSDC**: `0xcC12497956DBdE4cE52566476679C2445d29Ea0F`
- **ChainlinkResolver**: `0xFB94C0F7396a5Cf927270FAe3eC542c35d5A6601`
- **Admin**: `0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F`

### Facets
- **MarketFacet**: `0x4F6457D9C07Aa15f7804e17be79F31Fd0004BEeA`
- **TradingFacet**: `0xC9CEC1366A387EeB86d926633c5858297d8b7165`
- **LiquidityFacet**: `0x78F54898A4a6B69ef9846c940E3c018513162434`
- **SettlementFacet**: `0x6ccc6aFF2FC3246597D0c03d77E24c3fF79a7D8C`

### Timelock Operations
All facets and resolver are scheduled via 24-hour timelock.
See `opids-testnet.json` for operation IDs.

**Next Step:** After 24 hours, execute operations:
```bash
forge script script/ExecuteAfterDelay.s.sol --rpc-url bsc_testnet --broadcast
```

---

## BSC Mainnet (Chain ID: 56)

**Deployed:** December 2024 (Monolithic Architecture)

### Core Contracts
- **Core**: `0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725`
- **Treasury**: `0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778`
- **USDC (Bridged)**: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
- **ChainlinkResolver**: `0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3`
- **Admin**: `0x4dc74a8532550ffca11fb958549ca0b72e3f1f1c`

**Note:** Mainnet uses old monolithic `SpeculateCore`. Consider upgrading to Diamond architecture.

---

## Architecture

### Diamond Standard (Testnet)
- **Router**: Single entry point that delegates to facets
- **Facets**: Modular logic contracts (upgradeable)
- **Timelock**: 24h delay for all upgrades

### Facet Functions
- **MarketFacet**: `createMarket`, `getMarketState`, `getMarketResolution`
- **TradingFacet**: `buy`, `sell`, `spotPriceYesE6`, `spotPriceYesE18`
- **LiquidityFacet**: `addLiquidity`, `claimLpFees`
- **SettlementFacet**: `resolveMarketWithPrice`, `redeem`, `claimLpResidual`

---

## Frontend Integration

The frontend automatically detects the network and uses:
- **Mainnet**: Old `SpeculateCore` ABI
- **Testnet**: Combined Router + Facets ABI

All contract calls go through the Router address, which delegates to the appropriate facet.

---

## Verification

All contracts verified on BscScan:
- **Testnet**: https://testnet.bscscan.com/
- **Mainnet**: https://bscscan.com/
