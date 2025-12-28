# ============================================
# How to Switch Between Mainnet and Testnet
# ============================================

## Quick Summary:
- Mainnet = Real blockchain, real money (Chain ID: 56)
- Testnet = Test blockchain, fake money (Chain ID: 97)
- They use DIFFERENT contract addresses and subgraph URLs

## Method 1: Copy Files (Simple)

### Switch to MAINNET:
`ash
cp .env.mainnet .env.local
npm run dev
`

### Switch to TESTNET:
`ash
cp .env.testnet .env.local
npm run dev
`

## Method 2: Use npm scripts (Recommended - No file copying needed)

### Run with MAINNET config:
`ash
npm run dev:mainnet
`

### Run with TESTNET config:
`ash
npm run dev:testnet
`

## Key Differences:

### MAINNET (.env.mainnet):
- Chain ID: 56
- Network: mainnet
- Core: 0x101450a49E730d2e9502467242d0B6f157BABe60
- Goldsky: speculate-core-mainnet/production/gn
- Real USDT on BSC

### TESTNET (.env.testnet):
- Chain ID: 97
- Network: testnet
- Core: 0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd
- Goldsky: speculate-core-v2/production/gn
- MockUSDC (fake tokens)

## Current Status:
Your .env.local is currently set to: MAINNET
