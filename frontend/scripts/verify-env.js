// Verify environment variables are loaded correctly
// Run: npm run env:verify
// Or with specific env file: npx env-cmd -f .env.mainnet node scripts/verify-env.js

const requiredVars = {
  mainnet: [
    'NEXT_PUBLIC_MAINNET_CORE',
    'NEXT_PUBLIC_GOLDSKY_HTTP_URL',
    'NEXT_PUBLIC_CHAIN_ID',
    'NEXT_PUBLIC_NETWORK',
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'
  ],
  testnet: [
    'NEXT_PUBLIC_TESTNET_CORE',
    'NEXT_PUBLIC_GOLDSKY_HTTP_URL',
    'NEXT_PUBLIC_CHAIN_ID',
    'NEXT_PUBLIC_NETWORK',
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'
  ]
};

console.log('🔍 Verifying Environment Variables...\n');

const network = process.env.NEXT_PUBLIC_NETWORK || 'unknown';
const vars = network === 'mainnet' ? requiredVars.mainnet : requiredVars.testnet;

let allPresent = true;

vars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Truncate long values for display
    const displayValue = value.length > 60 ? value.substring(0, 60) + '...' : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allPresent = false;
  }
});

console.log('\n' + '='.repeat(60));
if (allPresent) {
  console.log('✅ All required environment variables are set!');
  console.log(`📡 Network: ${network}`);
  console.log(`🔗 Goldsky URL: ${process.env.NEXT_PUBLIC_GOLDSKY_HTTP_URL}`);
} else {
  console.log('❌ Some environment variables are missing!');
  console.log(`💡 Tip: Use 'npm run dev:${network}' to load .env.${network}`);
  process.exit(1);
}
