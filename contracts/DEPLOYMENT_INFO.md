# Deployment Information

## BSC Testnet (Chain ID: 97)

**Deployed:** December 2024 (Diamond Architecture) — redeployed with question string on-chain storage + `getMarketQuestion` getter

### Core Contracts
- **Core Router**: `0x601c5DA28dacc049481eD853E5b59b9F20Dd44a8`
- **Treasury**: `0x155FB12aD27259212f000443531fAe8a629F2A19`
- **MockUSDC (with faucet)**: `0x845740D345ECba415534df44C580ebb3A2432719`
- **ChainlinkResolver**: `0xe51729af202D801B7F7f87A6d04B447CcBaDe576` (Deterministic Resolution - resolves based on first Chainlink round after expiry)
- **Admin**: `0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F` (update with actual deployer)

### Facets
- **MarketFacet**: `0x12886B7d5C5Ebb15B29F70e3De1c90A359a74B93`
- **TradingFacet**: `0xe9521eA09C960780fe58bf625CA2b94D60E37a70`
- **LiquidityFacet**: `0xe975a09183a61Cdb1f7279265B75da6EEB24e6A4`
- **SettlementFacet**: `0x88A7F6DdeA0BCD7998d78331313E6fb8504039c1`

### New Features
- **Question string stored on-chain**: Market questions are now stored directly in the `Market` struct, eliminating dependency on event logs or subgraph for market titles.
- **`getMarketQuestion(uint256)` getter**: Separate function to read question string (handles dynamic type encoding correctly).

### Timelock Operations
**Testnet convenience:** timelock delay is set to `0` in `script/deploy.sol`, so resolver + facets are executed immediately after deployment.

**Production note:** For real deployments, set the timelock delay back to `24 hours` and execute operations after the delay.

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

### Oracle semantics (important)
- **Deterministic Resolution**: Chainlink markets resolve based on the **first price update after expiry** using Chainlink's historical round data.
- The `resolve(uint256 marketId, uint80 roundId)` function requires a specific `roundId` that must be the first round after the market's `expiryTimestamp`.
- This ensures **deterministic resolution** - the same result regardless of when `resolve()` is called (as long as it's after expiry).
- The frontend automatically searches for the correct `roundId` when resolving markets.

### Decimals guardrails (safety)
- At market creation, the core records the feed `decimals()` as `oracleDecimals`.
- It also sanity-checks `targetValue` against the **current** feed price to catch common scaling mistakes (e.g. `1e6` vs `1e8`).
- At resolution, the resolver verifies the feed decimals still match `oracleDecimals`.

### Facet Functions
- **MarketFacet**: `createMarket`, `getMarketState`, `getMarketResolution`, `getMarketQuestion`
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
