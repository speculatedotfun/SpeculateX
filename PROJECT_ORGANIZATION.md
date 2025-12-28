# Project Organization & Cleanup Guide

## 🎯 Current Status
- ✅ Deployed to BSC Mainnet
- ✅ Treasury verified on BscScan
- ⏳ Remaining contracts need verification
- ⏳ 48-hour timelock before activation

---

## 📁 Recommended Project Structure

```
speculatev1/
├── .claude/                          # Keep - Claude Code settings
├── .git                              # Keep - Git repository
├── .gitignore                        # Keep - Git ignore rules
├── .gitmodules                       # Keep - Git submodules
├── README.md                         # Keep - Main documentation
│
├── contracts/                        # Smart Contracts (Forge)
│   ├── .env                          # Keep - Environment variables (GITIGNORED!)
│   ├── .env.example                  # Keep - Template for .env
│   ├── .gitignore                    # Keep
│   ├── foundry.toml                  # Keep - Forge configuration
│   ├── foundry.lock                  # Keep - Dependency lock
│   │
│   ├── src/                          # Keep - Contract source code
│   │   ├── SpeculateCoreRouter.sol
│   │   ├── CoreStorage.sol
│   │   ├── Treasury.sol
│   │   ├── ChainlinkResolver.sol
│   │   ├── PositionToken.sol
│   │   ├── LMSRMath.sol
│   │   ├── MockUSDC.sol              # Keep for testing
│   │   ├── facets/
│   │   │   ├── MarketFacet.sol
│   │   │   ├── TradingFacet.sol
│   │   │   ├── LiquidityFacet.sol
│   │   │   └── SettlementFacet.sol
│   │   └── interfaces/
│   │       └── AggregatorV3Interface.sol
│   │
│   ├── script/                       # Keep - Deployment scripts
│   │   ├── deploy.sol
│   │   ├── ExecuteAfterDelay.s.sol
│   │   ├── DeployResolverOnly.s.sol
│   │   └── after.timelock.sol
│   │
│   ├── test/                         # Keep - Test files
│   │   ├── TestSetup.sol
│   │   ├── MarketFacet.t.sol
│   │   ├── TradingFacet.t.sol
│   │   ├── LiquidityFacet.t.sol
│   │   ├── SettlementFacet.t.sol
│   │   ├── ChainlinkResolver.t.sol
│   │   ├── RouterAdmin.t.sol
│   │   ├── RouterTimelock.t.sol
│   │   ├── TradingFees.t.sol
│   │   ├── MarketCreation.t.sol
│   │   ├── LiquidityPriceInvariant.t.sol
│   │   └── ForceSendETH.sol
│   │
│   ├── lib/                          # Keep - Forge dependencies
│   ├── out/                          # Keep - Compiled artifacts (can regenerate)
│   ├── cache/                        # Keep - Compiler cache (can regenerate)
│   │
│   ├── broadcast/                    # Keep - Deployment records
│   │   └── deploy.sol/
│   │       └── 56/                   # BSC Mainnet
│   │           ├── run-latest.json
│   │           └── run-*.json
│   │
│   ├── deployments/                  # CREATE - Organized deployment info
│   │   ├── mainnet/
│   │   │   ├── addresses.json
│   │   │   ├── deployment-info.md
│   │   │   └── verification/
│   │   │       ├── treasury-input.json
│   │   │       ├── core-router-input.json
│   │   │       ├── resolver-input.json
│   │   │       ├── market-facet-input.json
│   │   │       ├── trading-facet-input.json
│   │   │       ├── liquidity-facet-input.json
│   │   │       └── settlement-facet-input.json
│   │   └── testnet/
│   │       └── addresses.json
│   │
│   ├── docs/                         # CREATE - Contract documentation
│   │   ├── DEPLOYMENT.md             # Main deployment guide
│   │   ├── VERIFICATION.md           # Verification guide
│   │   ├── TIMELOCK_EXECUTION.md     # Timelock guide
│   │   ├── CHAINLINK_SETUP.md
│   │   └── CHAINLINK_AUTOMATION_SETUP.md
│   │
│   └── scripts/                      # Keep - Helper scripts (NOT Solidity)
│       └── prepare-sourcify.ps1
│
├── frontend/                         # Keep - Next.js frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── subgraph/                         # Keep - The Graph indexing
│   ├── src/
│   ├── schema.graphql
│   ├── subgraph.yaml
│   └── ...
│
├── docs/                             # Keep - Project documentation
│   └── ...
│
└── scripts/                          # Keep - Root-level scripts
    ├── test-complete-flow.ps1
    ├── test-sse.ps1
    ├── test-sse-broadcast.ps1
    ├── test-webhook.ps1
    └── verify-deployment.ps1
```

---

## 🗑️ Files to DELETE (Duplicates/Outdated)

### Root Level
```bash
# Delete duplicate/outdated docs
rm CONTRACT_ADDRESSES.md          # Duplicate - move info to deployments/
rm DEPLOYED_ADDRESSES.md           # Duplicate - move info to deployments/
rm ENV_SETUP.md                    # Duplicate - info is in contracts/.env.example
rm README_NEW.md                   # Duplicate - merge into README.md
rm hardhat.config.js               # Unused - project uses Forge, not Hardhat
rm package.json                    # Unused at root (only needed in frontend/)
rm package-lock.json               # Unused at root
```

### Contracts Directory
```bash
cd contracts

# Delete duplicate/outdated markdown docs
rm CHAINLINK_AUTOMATION_SETUP.md   # Move to docs/
rm CHAINLINK_SETUP.md              # Move to docs/
rm DEPLOY_NEW.md                   # Outdated - replaced by guides
rm DEPLOYMENT_INFO.md              # Outdated - replaced by guides
rm DEPLOYMENT_STEPS.md             # Outdated - replaced by guides
rm ENV_MAINNET_TEMPLATE.md         # Duplicate - info in .env.example
rm MAINNET_DEPLOYMENT.md           # Outdated - replaced by guides
rm QUICK_DEPLOY.md                 # Outdated - replaced by guides
rm VERIFICATION_GUIDE.md           # Duplicate - replace with new one
rm VERIFICATION_INSTRUCTIONS.md    # Keep this one (most recent)

# Delete old/outdated JSON files
rm ChainlinkResolver_ABI.json      # Outdated - use broadcast/ or out/
rm compiler_input_final.json       # Outdated - replaced by new inputs
rm deploy_output.json              # Outdated - use broadcast/
rm opids-testnet.json              # Old testnet data
rm SpeculateCore_ABI_FULL.json     # Outdated - use out/ folder

# Delete verification JSONs after organizing
# (MOVE to deployments/mainnet/verification/ first!)
# rm treasury-input.json
# rm core-router-input.json
# rm resolver-input.json
# rm market-facet-input.json
# rm trading-facet-input.json
# rm liquidity-facet-input.json
# rm settlement-facet-input.json

# Delete test batch file
rm deploy.bat                      # Windows batch - use PowerShell or Bash

# Delete old package files
rm package-lock.json               # Unused

# Delete flattened contracts (not needed anymore)
rm -rf flattened/

# Delete disabled tests (if not planning to re-enable)
# rm -rf test_disabled/            # Optional - keep if you want to fix them
```

---

## 📦 Files to MOVE

### Create Deployment Organization Structure
```bash
# Create deployment folders
mkdir -p deployments/mainnet/verification
mkdir -p deployments/testnet
mkdir -p docs

# Move verification JSON files
mv treasury-input.json deployments/mainnet/verification/
mv core-router-input.json deployments/mainnet/verification/
mv resolver-input.json deployments/mainnet/verification/
mv market-facet-input.json deployments/mainnet/verification/
mv trading-facet-input.json deployments/mainnet/verification/
mv liquidity-facet-input.json deployments/mainnet/verification/
mv settlement-facet-input.json deployments/mainnet/verification/

# Move documentation
mv EXECUTE_TIMELOCK_GUIDE.md docs/TIMELOCK_EXECUTION.md
mv VERIFICATION_INSTRUCTIONS.md docs/VERIFICATION.md
mv CHAINLINK_SETUP.md docs/
mv CHAINLINK_AUTOMATION_SETUP.md docs/
```

---

## 📝 Files to CREATE

### 1. Create `deployments/mainnet/addresses.json`
```json
{
  "chainId": 56,
  "network": "BSC Mainnet",
  "deploymentDate": "2025-12-28",
  "deployer": "0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c",
  "admin": "0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c",
  "contracts": {
    "Treasury": "0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70",
    "CoreRouter": "0x101450a49E730d2e9502467242d0B6f157BABe60",
    "ChainlinkResolver": "0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b",
    "MarketFacet": "0x8edbAa8A0E00859a1b5D613c23C642880ad63f31",
    "TradingFacet": "0x60F75d38399C44b295FD33FFDbb1cD35c9fF5257",
    "LiquidityFacet": "0x1Fda96fb1A1c6136856Eb355d08f2aa94c7f3516",
    "SettlementFacet": "0x9EfBED36e561db021014962d6aA08C308203fb1B"
  },
  "tokens": {
    "USDT": "0x55d398326f99059fF775485246999027B3197955"
  },
  "config": {
    "timelockDelay": 172800,
    "treasuryDailyLimit": 50000000000
  },
  "verification": {
    "Treasury": "verified",
    "CoreRouter": "pending",
    "ChainlinkResolver": "pending",
    "MarketFacet": "pending",
    "TradingFacet": "pending",
    "LiquidityFacet": "pending",
    "SettlementFacet": "pending"
  }
}
```

### 2. Create `deployments/mainnet/deployment-info.md`
Document the deployment with transaction hashes, gas costs, etc.

### 3. Create `docs/DEPLOYMENT.md`
Consolidated deployment guide combining all the scattered MD files.

---

## ✅ Files to KEEP (Important!)

### Critical Files
- `.env` - **NEVER COMMIT THIS!** Contains private keys
- `foundry.toml` - Forge configuration
- `broadcast/deploy.sol/56/run-latest.json` - Deployment record
- All files in `src/` - Contract source code
- All files in `test/` - Test files
- All files in `script/` - Deployment scripts
- `lib/` - Dependencies (OpenZeppelin, PRB-Math)

### Generated Files (Can Regenerate)
- `out/` - Compiled artifacts (run `forge build`)
- `cache/` - Compiler cache (run `forge build`)

---

## 🚀 Cleanup Commands

Run these commands to clean up the project:

```bash
cd contracts

# 1. Create new directory structure
mkdir -p deployments/mainnet/verification
mkdir -p deployments/testnet
mkdir -p docs

# 2. Move verification JSONs
mv *-input.json deployments/mainnet/verification/

# 3. Move/rename docs
mv EXECUTE_TIMELOCK_GUIDE.md docs/TIMELOCK_EXECUTION.md
mv VERIFICATION_INSTRUCTIONS.md docs/VERIFICATION.md
mv CHAINLINK_SETUP.md docs/
mv CHAINLINK_AUTOMATION_SETUP.md docs/

# 4. Delete duplicates and outdated files
rm CHAINLINK_AUTOMATION_SETUP.md CHAINLINK_SETUP.md 2>/dev/null || true
rm DEPLOY_NEW.md DEPLOYMENT_INFO.md DEPLOYMENT_STEPS.md 2>/dev/null || true
rm ENV_MAINNET_TEMPLATE.md MAINNET_DEPLOYMENT.md QUICK_DEPLOY.md 2>/dev/null || true
rm VERIFICATION_GUIDE.md 2>/dev/null || true
rm ChainlinkResolver_ABI.json compiler_input_final.json deploy_output.json 2>/dev/null || true
rm opids-testnet.json SpeculateCore_ABI_FULL.json 2>/dev/null || true
rm deploy.bat package-lock.json 2>/dev/null || true
rm -rf flattened/

# 5. Go back to root
cd ..

# 6. Clean root directory
rm CONTRACT_ADDRESSES.md DEPLOYED_ADDRESSES.md ENV_SETUP.md README_NEW.md 2>/dev/null || true
rm hardhat.config.js package.json package-lock.json 2>/dev/null || true

# 7. Rebuild to verify everything works
cd contracts && forge build
```

---

## 📋 Final Structure

After cleanup, your project will be:
- ✅ Well-organized with clear separation
- ✅ No duplicate files
- ✅ Easy to navigate
- ✅ Production-ready
- ✅ Easy to maintain

**Main entry points:**
- `README.md` - Project overview
- `contracts/README.md` - Contract documentation
- `frontend/README.md` - Frontend setup
- `subgraph/README.md` - Subgraph setup
- `deployments/mainnet/addresses.json` - Current deployment addresses
