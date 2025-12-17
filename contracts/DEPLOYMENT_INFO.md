# Deployment Information

## BSC Testnet (Chain ID: 97)

**Deployed:** December 2024 (Diamond Architecture)

### Core Contracts
- **Core Router**: `0xE2BD9a1ac99B8215620628FC43838e4361D476a0`
- **Treasury**: `0xDB6787414d4Ed14Dbd46eB58129bd72352725948`
- **MockUSDC (with faucet)**: `0xbCD27B18f51FCB7536b9e7DDB5cAFC9628CA9489`
- **ChainlinkResolver**: `0x39FD1A9AE3556340D2aBfED7654F900db688b464`
- **Admin**: `0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F`

### Facets
- **MarketFacet**: `0x62ECF466B3AC466a9874d9dFA8F22a2E3Df73aa4`
- **TradingFacet**: `0x2188635103765aBD7b81fB9C71d44e38d79Aa405`
- **LiquidityFacet**: `0x2CF2d8818DE346d72925bBcbe52c056c64B4D320`
- **SettlementFacet**: `0x572B3607EbE805e9f7C18c0c19a17B8d185d2bf3`

### Timelock Operations
All facets and resolver are scheduled via 24-hour timelock.
See `opids-testnet.json` for operation IDs.

**Next Step:** After 24 hours, execute operations:
```bash
cd contracts
forge script script/ExecuteAfterDelay.s.sol --rpc-url https://data-seed-prebsc-1-s1.bnbchain.org:8545 --broadcast --legacy --gas-price 1000000000
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
