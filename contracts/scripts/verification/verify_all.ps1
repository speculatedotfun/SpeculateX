# Verify all contracts on BSC Testnet
# Usage: .\verify_all.ps1
# Note: For contracts compiled with via-ir, we use --flatten flag

$FORGE = "C:\Users\Almog\.foundry\bin\forge.exe"
$CAST = "C:\Users\Almog\.foundry\bin\cast.exe"
$CHAIN = "bsc-testnet"
$COMPILER = "0.8.24"
$RUNS = "200"

# Load API key from .env file and set as environment variable
# Foundry will read it from foundry.toml which references ${BSCSCAN_API_KEY}
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($key -eq "BSCSCAN_API_KEY") {
                $env:BSCSCAN_API_KEY = $value
            }
        }
    }
}

# Check if API key is set
if (-not $env:BSCSCAN_API_KEY) {
    Write-Host "Error: BSCSCAN_API_KEY not found in .env file or environment" -ForegroundColor Red
    Write-Host "Please add BSCSCAN_API_KEY=your-key to contracts/.env" -ForegroundColor Yellow
    exit 1
}

Write-Host "Loaded BSCSCAN_API_KEY from .env file" -ForegroundColor Green
Write-Host "Note: Using foundry.toml configuration for API key" -ForegroundColor Cyan

Write-Host "=== Verifying Contracts on BSC Testnet ===" -ForegroundColor Green
Write-Host ""

# Treasury: new Treasury(admin, 50_000e6)
# admin = 0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F
Write-Host "Verifying Treasury..." -ForegroundColor Yellow
& $FORGE verify-contract `
    --chain $CHAIN `
    --compiler-version $COMPILER `
    --num-of-optimizations $RUNS `
    --watch `
    --flatten `
    --force `
    --constructor-args $(& $CAST abi-encode "constructor(address,uint256)" "0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F" "50000000000") `
    "0x5583238e692A5c57314a8D392749A3B102329846" `
    "src/Treasury.sol:Treasury"

# MockUSDC: new MockUSDC(admin)
Write-Host "Verifying MockUSDC..." -ForegroundColor Yellow
& $FORGE verify-contract `
    --chain $CHAIN `
    --compiler-version $COMPILER `
    --num-of-optimizations $RUNS `
    --watch `
    --flatten `
    --force `
    --constructor-args $(& $CAST abi-encode "constructor(address)" "0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F") `
    "0xADEa1B9F54A9Be395DDCAf51e072667E1edA09cf" `
    "src/MockUSDC.sol:MockUSDC"

# SpeculateCoreRouter: new SpeculateCoreRouter(admin, usdc, treasury, timelockDelay)
# timelockDelay = 0 for testnet
Write-Host "Verifying SpeculateCoreRouter..." -ForegroundColor Yellow
& $FORGE verify-contract `
    --chain $CHAIN `
    --compiler-version $COMPILER `
    --num-of-optimizations $RUNS `
    --watch `
    --flatten `
    --force `
    --constructor-args $(& $CAST abi-encode "constructor(address,address,address,uint256)" "0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F" "0xADEa1B9F54A9Be395DDCAf51e072667E1edA09cf" "0x5583238e692A5c57314a8D392749A3B102329846" "0") `
    "0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd" `
    "src/SpeculateCoreRouter.sol:SpeculateCoreRouter"

# ChainlinkResolver: new ChainlinkResolver(admin, core)
Write-Host "Verifying ChainlinkResolver..." -ForegroundColor Yellow
& $FORGE verify-contract `
    --chain $CHAIN `
    --compiler-version $COMPILER `
    --num-of-optimizations $RUNS `
    --watch `
    --flatten `
    --force `
    --constructor-args $(& $CAST abi-encode "constructor(address,address)" "0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F" "0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd") `
    "0x6217730cab1Fc4548747bc37777Bf622B1741e36" `
    "src/ChainlinkResolver.sol:ChainlinkResolver"

# Facets (no constructor arguments)
Write-Host "Verifying MarketFacet..." -ForegroundColor Yellow
& $FORGE verify-contract `
    --chain $CHAIN `
    --compiler-version $COMPILER `
    --num-of-optimizations $RUNS `
    --flatten `
    --force `
    --watch `
    "0x97A832fa4fbF84D3Fec97fe4e3eF65FEc73aB35D" `
    "src/facets/MarketFacet.sol:MarketFacet"

Write-Host "Verifying TradingFacet..." -ForegroundColor Yellow
& $FORGE verify-contract `
    --chain $CHAIN `
    --compiler-version $COMPILER `
    --num-of-optimizations $RUNS `
    --flatten `
    --force `
    --watch `
    "0xbfEe7bf201171CA527C83334C6D9b08d2F85790A" `
    "src/facets/TradingFacet.sol:TradingFacet"

Write-Host "Verifying LiquidityFacet..." -ForegroundColor Yellow
& $FORGE verify-contract `
    --chain $CHAIN `
    --compiler-version $COMPILER `
    --num-of-optimizations $RUNS `
    --flatten `
    --force `
    --watch `
    "0x1D0d6Fd85A7Ae08Ac8A9B58Cb736d7c2CbB43a39" `
    "src/facets/LiquidityFacet.sol:LiquidityFacet"

Write-Host "Verifying SettlementFacet..." -ForegroundColor Yellow
& $FORGE verify-contract `
    --chain $CHAIN `
    --compiler-version $COMPILER `
    --num-of-optimizations $RUNS `
    --flatten `
    --force `
    --watch `
    "0x5f9D480e972fBd90EcA50E01Fd277AbF6a8f7386" `
    "src/facets/SettlementFacet.sol:SettlementFacet"

Write-Host ""
Write-Host "=== Verification Complete ===" -ForegroundColor Green

