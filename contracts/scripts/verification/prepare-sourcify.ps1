# Script to prepare files for Sourcify manual verification
# This script collects all required files for each contract

$outputDir = "sourcify-upload"
if (Test-Path $outputDir) {
    Remove-Item -Recurse -Force $outputDir
}
New-Item -ItemType Directory -Path $outputDir | Out-Null

Write-Host "`n📦 אוסף קבצים לאימות ב-Sourcify...`n" -ForegroundColor Cyan

# Treasury files
Write-Host "🔹 Treasury..." -ForegroundColor Yellow
$treasuryDir = "$outputDir/treasury"
New-Item -ItemType Directory -Path $treasuryDir | Out-Null
Copy-Item "src/Treasury.sol" -Destination "$treasuryDir/Treasury.sol"
Copy-Item "lib/openzeppelin-contracts/contracts/access/Ownable.sol" -Destination "$treasuryDir/Ownable.sol" -ErrorAction SilentlyContinue
Copy-Item "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol" -Destination "$treasuryDir/IERC20.sol" -ErrorAction SilentlyContinue
Copy-Item "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol" -Destination "$treasuryDir/SafeERC20.sol" -ErrorAction SilentlyContinue
Copy-Item "lib/openzeppelin-contracts/contracts/utils/Context.sol" -Destination "$treasuryDir/Context.sol" -ErrorAction SilentlyContinue

# SpeculateCore files
Write-Host "🔹 SpeculateCore..." -ForegroundColor Yellow
$coreDir = "$outputDir/speculatecore"
New-Item -ItemType Directory -Path $coreDir | Out-Null
Copy-Item "src/SpeculateCore.sol" -Destination "$coreDir/SpeculateCore.sol"
Copy-Item "src/PositionToken.sol" -Destination "$coreDir/PositionToken.sol"
Copy-Item "src/LMSRMath.sol" -Destination "$coreDir/LMSRMath.sol"
Copy-Item "src/interfaces/AggregatorV3Interface.sol" -Destination "$coreDir/AggregatorV3Interface.sol"
Copy-Item "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol" -Destination "$coreDir/IERC20.sol" -ErrorAction SilentlyContinue
Copy-Item "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol" -Destination "$coreDir/SafeERC20.sol" -ErrorAction SilentlyContinue
Copy-Item "lib/openzeppelin-contracts/contracts/access/AccessControl.sol" -Destination "$coreDir/AccessControl.sol" -ErrorAction SilentlyContinue
Copy-Item "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol" -Destination "$coreDir/ReentrancyGuard.sol" -ErrorAction SilentlyContinue
Copy-Item "lib/openzeppelin-contracts/contracts/utils/Pausable.sol" -Destination "$coreDir/Pausable.sol" -ErrorAction SilentlyContinue
Copy-Item "lib/openzeppelin-contracts/contracts/utils/Context.sol" -Destination "$coreDir/Context.sol" -ErrorAction SilentlyContinue

# ChainlinkResolver files
Write-Host "🔹 ChainlinkResolver..." -ForegroundColor Yellow
$resolverDir = "$outputDir/chainlinkresolver"
New-Item -ItemType Directory -Path $resolverDir | Out-Null
Copy-Item "src/ChainlinkResolver.sol" -Destination "$resolverDir/ChainlinkResolver.sol"
Copy-Item "src/SpeculateCore.sol" -Destination "$resolverDir/SpeculateCore.sol"
Copy-Item "src/interfaces/AggregatorV3Interface.sol" -Destination "$resolverDir/AggregatorV3Interface.sol"
Copy-Item "src/interfaces/AutomationCompatibleInterface.sol" -Destination "$resolverDir/AutomationCompatibleInterface.sol"
Copy-Item "lib/openzeppelin-contracts/contracts/utils/Pausable.sol" -Destination "$resolverDir/Pausable.sol" -ErrorAction SilentlyContinue
Copy-Item "lib/openzeppelin-contracts/contracts/utils/Context.sol" -Destination "$resolverDir/Context.sol" -ErrorAction SilentlyContinue

Write-Host "`n✅ הקבצים מוכנים בתיקייה: $outputDir`n" -ForegroundColor Green
Write-Host "📋 כתובות:" -ForegroundColor Cyan
Write-Host "  Treasury: 0x5ca1b0efe9eb303606ddec5ea6e931fe57a08778" -ForegroundColor White
Write-Host "  SpeculateCore: 0xdcdaf5219c7cb8ab83475a4562e2c6eb7b2a3725" -ForegroundColor White
Write-Host "  ChainlinkResolver: 0x93793866f3ab07a34cb89c6751167f0ebacf0ce3`n" -ForegroundColor White
Write-Host "💡 הוראות:" -ForegroundColor Yellow
Write-Host "  1. לך ל: https://repo.sourcify.dev/#/upload" -ForegroundColor White
Write-Host "  2. בחר Chain: BSC Mainnet (56)" -ForegroundColor White
Write-Host "  3. העלה את כל הקבצים מתיקיית treasury/ (או speculatecore/ או chainlinkresolver/)" -ForegroundColor White
Write-Host "  4. הזן את הכתובת המתאימה`n" -ForegroundColor White

