# Deployment Steps (Testnet / Diamond Router)

These steps describe the current Testnet deployment flow for the **Diamond-style** architecture:
`SpeculateCoreRouter` + Facets (`MarketFacet`, `TradingFacet`, `LiquidityFacet`, `SettlementFacet`) + `ChainlinkResolver`.

## Step 1: Set environment variables

Create `contracts/.env`:

```bash
PRIVATE_KEY=0x...
BSC_TESTNET_RPC_URL=https://bsc-testnet.publicnode.com
```

## Step 2: Deploy + wire facets/resolver (timelock = 0 on Testnet)

The deploy script does everything:
- Deploys `Treasury`, `MockUSDC`, `SpeculateCoreRouter`, `ChainlinkResolver`, and all facets
- Grants `MINTER_ROLE` on `MockUSDC` to the router
- Schedules + executes facet wiring ops immediately (timelock=0)

```bash
cd contracts
forge script script/deploy.sol:DeployAndSchedule --rpc-url bsc_testnet --broadcast --legacy --gas-price 1000000000
```

## Step 3: Update the frontend addresses

Update:
- `frontend/lib/contracts.ts` (Testnet addresses)

## Step 4: Update frontend ABIs (when facet signatures change)

After a contract change, copy the updated artifact(s) into `frontend/lib/abis/`.
Example (PowerShell):

```powershell
Copy-Item contracts\out\MarketFacet.sol\MarketFacet.json frontend\lib\abis\MarketFacet.json -Force
```

## Notes
- **Market titles do not require the subgraph**: questions are stored on-chain and read via `getMarketQuestion(uint256)`.
- Public RPC providers can prune logs/history; avoid relying on event-log scans for critical UX.
