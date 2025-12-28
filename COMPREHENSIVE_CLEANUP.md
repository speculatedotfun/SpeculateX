# 🧹 Comprehensive Project Cleanup Plan

## 🚨 CRITICAL ISSUES FOUND

### 1. **contracts/src/ - 12 ZIP/RAR FILES (260KB total)**
```
contracts/src/src.rar
contracts/src/src.zip
contracts/src/src1.zip through src10.zip
```
**❌ DELETE ALL** - These are old contract backups cluttering the source folder!

### 2. **frontend/frontend/ - Nested Duplicate Folder**
Entire `frontend/frontend/` directory appears to be a duplicate!

### 3. **test_disabled/ - Old Test Files**
5 old test files that are disabled

### 4. **Test Results & Reports**
- `frontend/test-results/` - Old test results
- `frontend/playwright-report/` - Old playwright reports
- `frontend/test-results.json` - Old test JSON
- `frontend/tsconfig.tsbuildinfo` - Build cache

### 5. **PowerShell Scripts**
- Multiple verification scripts in contracts/
- Test scripts in root

### 6. **Empty/Placeholder Files**
- `subgraph/goldsky` (0 bytes)
- `subgraph/oldsky` (0 bytes)

---

## 📋 DETAILED CLEANUP PLAN

### 🔴 CRITICAL - DELETE IMMEDIATELY

#### contracts/src/ (12 files - 260KB)
```bash
cd contracts/src
rm src.rar src.zip src1.zip src2.zip src3.zip src4.zip src5.zip \
   src6.zip src7.zip src8.zip src9.zip src10.zip
```

#### frontend/ - Nested Duplicate
```bash
cd frontend
rm -rf frontend/         # Entire nested duplicate folder
```

#### Subgraph - Empty Files
```bash
cd subgraph
rm goldsky oldsky
```

---

### 🟡 OPTIONAL - Clean Build Artifacts

#### Frontend Test Results (Can Regenerate)
```bash
cd frontend
rm -rf test-results/          # Old test results
rm -rf playwright-report/     # Old reports
rm test-results.json          # Old test JSON
rm tsconfig.tsbuildinfo       # Build cache
```

#### Contracts Test Disabled (If Not Planning to Fix)
```bash
cd contracts
rm -rf test_disabled/         # 5 old test files
```

---

### 🟢 ORGANIZE - Move to Better Locations

#### PowerShell Scripts
```bash
# Move verification scripts to scripts folder
cd contracts
mkdir -p scripts/verification
mv verify_all.ps1 scripts/verification/
mv verify_chainlink_resolver.ps1 scripts/verification/
mv prepare-sourcify.ps1 scripts/verification/

# Keep deploy/debug scripts in scripts/
# Already in contracts/scripts/debug/
```

#### Documentation
```bash
# Create a comprehensive docs structure
cd contracts
mkdir -p docs/images
mkdir -p docs/guides

# No action needed - already organized
```

---

## 🗂️ FINAL RECOMMENDED STRUCTURE

```
speculatev1/
│
├── contracts/
│   ├── src/                          # ✅ CLEAN - Only .sol files
│   │   ├── SpeculateCoreRouter.sol
│   │   ├── Treasury.sol
│   │   ├── ChainlinkResolver.sol
│   │   ├── CoreStorage.sol
│   │   ├── PositionToken.sol
│   │   ├── LMSRMath.sol
│   │   ├── MockUSDC.sol
│   │   ├── facets/
│   │   │   ├── MarketFacet.sol
│   │   │   ├── TradingFacet.sol
│   │   │   ├── LiquidityFacet.sol
│   │   │   └── SettlementFacet.sol
│   │   └── interfaces/
│   │       └── AggregatorV3Interface.sol
│   │
│   ├── script/                       # Deployment scripts
│   │   ├── deploy.sol
│   │   ├── ExecuteAfterDelay.s.sol
│   │   ├── DeployResolverOnly.s.sol
│   │   └── after.timelock.sol
│   │
│   ├── scripts/                      # Helper scripts
│   │   ├── verification/
│   │   │   ├── verify_all.ps1
│   │   │   ├── verify_chainlink_resolver.ps1
│   │   │   └── prepare-sourcify.ps1
│   │   └── debug/
│   │
│   ├── test/                         # Active tests
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
│   │   ├── ForceSendETH.sol
│   │   ├── invariants/
│   │   └── mocks/
│   │
│   ├── deployments/
│   │   ├── mainnet/
│   │   │   ├── addresses.json
│   │   │   └── verification/
│   │   │       └── *.json (7 files)
│   │   └── testnet/
│   │
│   ├── docs/
│   │   ├── VERIFICATION.md
│   │   └── TIMELOCK_EXECUTION.md
│   │
│   ├── broadcast/                    # Deployment records
│   ├── lib/                          # Dependencies
│   ├── out/                          # Build artifacts
│   └── cache/                        # Compiler cache
│
├── frontend/                         # ✅ NO NESTED frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── tests/
│   ├── __tests__/
│   ├── pages/
│   ├── .env.example
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── playwright.config.ts
│   ├── TESTING.md
│   └── CLEAR_CACHE.md
│
├── subgraph/                         # ✅ NO EMPTY FILES
│   ├── src/
│   ├── abis/
│   ├── schema.graphql
│   ├── subgraph.yaml
│   ├── subgraph.mainnet.yaml
│   ├── package.json
│   └── package.mainnet.json
│
├── docs/
│   └── be-the-market.md
│
├── scripts/                          # Root helper scripts
│   ├── test-complete-flow.ps1
│   ├── test-sse.ps1
│   ├── test-sse-broadcast.ps1
│   ├── test-webhook.ps1
│   └── verify-deployment.ps1
│
├── README.md
├── PROJECT_ORGANIZATION.md
└── CLEANUP_SUMMARY.md
```

---

## 🚀 CLEANUP EXECUTION COMMANDS

### Step 1: CRITICAL - Delete ZIP/RAR Files
```bash
cd contracts/src
rm -f *.zip *.rar
echo "Deleted all ZIP/RAR backups from src/"
```

### Step 2: Remove Nested Frontend Folder
```bash
cd frontend
rm -rf frontend/
echo "Deleted nested frontend folder"
```

### Step 3: Remove Empty Subgraph Files
```bash
cd subgraph
rm -f goldsky oldsky
echo "Deleted empty files"
```

### Step 4: OPTIONAL - Clean Test Artifacts
```bash
cd frontend
rm -rf test-results/ playwright-report/
rm -f test-results.json tsconfig.tsbuildinfo
echo "Cleaned test artifacts"
```

### Step 5: OPTIONAL - Remove Disabled Tests
```bash
cd contracts
rm -rf test_disabled/
echo "Deleted disabled tests"
```

### Step 6: Organize PowerShell Scripts
```bash
cd contracts
mkdir -p scripts/verification
mv verify_all.ps1 verify_chainlink_resolver.ps1 prepare-sourcify.ps1 scripts/verification/
echo "Organized verification scripts"
```

---

## 📊 CLEANUP IMPACT

### Files to Delete
- **Critical (Must Delete):** 15 files (~260KB + nested folder)
  - 12 ZIP/RAR files in contracts/src/
  - 1 nested frontend/ folder (entire directory)
  - 2 empty placeholder files in subgraph/

- **Optional (Can Delete):** ~100+ files (~2MB+)
  - Old test results and reports
  - Build cache files
  - Disabled test files

### Files to Move
- 3 PowerShell verification scripts to organized location

### Total Space Saved
- **Minimum:** ~500KB - 1MB (critical only)
- **Maximum:** ~3-5MB (with optional cleanup)

---

## ✅ VERIFICATION CHECKLIST

After cleanup, verify:
- [ ] No .zip or .rar files in `contracts/src/`
- [ ] No nested `frontend/frontend/` folder
- [ ] No empty placeholder files in `subgraph/`
- [ ] All PowerShell scripts organized in `contracts/scripts/verification/`
- [ ] `forge build` still works
- [ ] `forge test` still passes
- [ ] Frontend still builds

---

## 🎯 PRIORITY ORDER

1. **🔴 HIGH PRIORITY - Do First**
   - Delete ZIP/RAR files from contracts/src/
   - Remove nested frontend/frontend/ folder
   - Remove empty subgraph files

2. **🟡 MEDIUM PRIORITY - Do Soon**
   - Clean test artifacts (can regenerate)
   - Organize PowerShell scripts

3. **🟢 LOW PRIORITY - Optional**
   - Delete test_disabled/ (only if not planning to fix)
   - Further documentation organization

---

## 🚨 IMPORTANT NOTES

**DO NOT DELETE:**
- `.env` (contains private keys!)
- `broadcast/` (deployment records)
- `out/`, `cache/` (can regenerate but good to keep)
- `lib/` (dependencies)
- Active test files in `test/`
- Source `.sol` files

**SAFE TO DELETE:**
- All ZIP/RAR files
- Nested duplicate folders
- Empty placeholder files
- Test result artifacts
- Build cache files (`.tsbuildinfo`)
