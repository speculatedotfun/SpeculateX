# Contract Verification Instructions - BSC Mainnet

## Standard Input JSON Files Generated

All Standard Input JSON files have been created in the `contracts/` directory:

```
✅ treasury-input.json          (42K)
✅ core-router-input.json       (51K)
✅ resolver-input.json          (31K)
✅ market-facet-input.json      (69K)
✅ trading-facet-input.json     (210K)
✅ liquidity-facet-input.json   (136K)
✅ settlement-facet-input.json  (67K)
```

---

## Step-by-Step Verification Process

### 1. Treasury (0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70)

1. Go to: https://bscscan.com/address/0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70#code
2. Click **"Verify and Publish"**
3. Select verification method: **"Via Standard JSON Input"**
4. Fill in:
   - **Compiler Type:** Solidity (Single file)
   - **Compiler Version:** v0.8.24+commit.e11b9ed9
   - **Open Source License Type:** MIT
5. Click **"Continue"**
6. **Upload:** `treasury-input.json`
7. **Constructor Arguments (ABI-encoded):**
   ```
   0000000000000000000000004dc74a8532550ffca11fb958549ca0b72e3f1f1c0000000000000000000000000000000000000000000000000000000ba43b7400
   ```
8. Click **"Verify and Publish"**

---

### 2. Core Router (0x101450a49E730d2e9502467242d0B6f157BABe60) ⭐ MAIN

1. Go to: https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#code
2. Click **"Verify and Publish"**
3. Select: **"Via Standard JSON Input"**
4. Compiler: **v0.8.24+commit.e11b9ed9**
5. License: **MIT**
6. Upload: `core-router-input.json`
7. **Constructor Arguments:**
   ```
   0000000000000000000000004dc74a8532550ffca11fb958549ca0b72e3f1f1c00000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000d0ed64b884bc51bf91cdfcba648910b481dbbe70000000000000000000000000000000000000000000000000000000000002a300
   ```
8. Verify and Publish

---

### 3. ChainlinkResolver (0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b)

1. Go to: https://bscscan.com/address/0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b#code
2. Same process as above
3. Upload: `resolver-input.json`
4. **Constructor Arguments:**
   ```
   0000000000000000000000004dc74a8532550ffca11fb958549ca0b72e3f1f1c000000000000000000000000101450a49e730d2e9502467242d0b6f157babe60
   ```

---

### 4. MarketFacet (0x8edbAa8A0E00859a1b5D613c23C642880ad63f31)

1. Go to: https://bscscan.com/address/0x8edbAa8A0E00859a1b5D613c23C642880ad63f31#code
2. Same process
3. Upload: `market-facet-input.json`
4. **Constructor Arguments:** Leave blank (no constructor)

---

### 5. TradingFacet (0x60F75d38399C44b295FD33FFDbb1cD35c9fF5257)

1. Go to: https://bscscan.com/address/0x60F75d38399C44b295FD33FFDbb1cD35c9fF5257#code
2. Same process
3. Upload: `trading-facet-input.json`
4. **Constructor Arguments:** Leave blank

---

### 6. LiquidityFacet (0x1Fda96fb1A1c6136856Eb355d08f2aa94c7f3516)

1. Go to: https://bscscan.com/address/0x1Fda96fb1A1c6136856Eb355d08f2aa94c7f3516#code
2. Same process
3. Upload: `liquidity-facet-input.json`
4. **Constructor Arguments:** Leave blank

---

### 7. SettlementFacet (0x9EfBED36e561db021014962d6aA08C308203fb1B)

1. Go to: https://bscscan.com/address/0x9EfBED36e561db021014962d6aA08C308203fb1B#code
2. Same process
3. Upload: `settlement-facet-input.json`
4. **Constructor Arguments:** Leave blank

---

## Quick Reference

### All Contract Addresses

```
Treasury:         0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70
Core Router:      0x101450a49E730d2e9502467242d0B6f157BABe60  ⭐
Resolver:         0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b
MarketFacet:      0x8edbAa8A0E00859a1b5D613c23C642880ad63f31
TradingFacet:     0x60F75d38399C44b295FD33FFDbb1cD35c9fF5257
LiquidityFacet:   0x1Fda96fb1A1c6136856Eb355d08f2aa94c7f3516
SettlementFacet:  0x9EfBED36e561db021014962d6aA08C308203fb1B
```

### Common Settings for All

- **Compiler Version:** v0.8.24+commit.e11b9ed9
- **Optimization:** Enabled with 200 runs
- **Other Settings:** Included in Standard JSON Input
- **License:** MIT
- **Via IR:** Yes (automatically included in JSON)

---

## Troubleshooting

**"Bytecode does not match"**
- Make sure you selected "Via Standard JSON Input" (not "Solidity Single File")
- Ensure the JSON file uploaded correctly
- Verify constructor arguments are exact (copy-paste from above)

**"File too large"**
- Try compressing the JSON file
- Or use Sourcify.dev instead (better for large contracts)

**"Already verified"**
- Contract may already be verified by someone else
- Check if source code is already visible

---

## Alternative: Sourcify (Recommended for Large Files)

If BscScan fails (especially for large files like `trading-facet-input.json` at 210K):

1. Go to: https://sourcify.dev/
2. Click "Verify Contract"
3. Select **Chain:** Binance Smart Chain (56)
4. **Address:** Enter contract address
5. **Files:** Upload ALL files from `contracts/src/` directory
6. Click "Verify"

Sourcify handles via-ir compilation better and accepts larger files.

---

## After Verification

Once all contracts are verified, you'll be able to:
- Read contract source on BscScan
- Interact with functions through BscScan UI
- See contract ABIs automatically
- Build trust with users (verified = transparent)

Remember: Verification is for transparency only. The contracts work fine unverified!
