# ============================================
# How to Use .env.mainnet and .env.testnet
# ============================================

# Option 1: Manual Copy (Simplest)
# Copy the appropriate file to .env.local:
#   For Mainnet:  cp .env.mainnet .env.local
#   For Testnet:  cp .env.testnet .env.local

# Option 2: Use env-cmd (Recommended for automation)
# Install: npm install --save-dev env-cmd
# Then update package.json scripts:
#   "dev:mainnet": "env-cmd -f .env.mainnet next dev -p 3003"
#   "dev:testnet": "env-cmd -f .env.testnet next dev -p 3003"

# Option 3: PowerShell Script (Windows)
# Create a script to switch between networks

# ============================================
# Verification
# ============================================
# To verify env vars are loaded, check:
# 1. The code reads: process.env.NEXT_PUBLIC_MAINNET_CORE
# 2. The code reads: process.env.NEXT_PUBLIC_GOLDSKY_HTTP_URL
# 3. Next.js exposes NEXT_PUBLIC_* vars to the browser
