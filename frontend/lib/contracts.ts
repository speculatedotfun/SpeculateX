// Network configuration
export type Network = 'mainnet' | 'testnet';

// Contract addresses for each network
const MAINNET_ADDRESSES = {
  // BSC Mainnet - Deployed December 28, 2025
  // ✅ All contracts verified on BscScan
  // ⏳ 48-hour timelock before activation
  // These can be overridden at build-time via NEXT_PUBLIC_* env vars to avoid code edits on redeploy.
  core: (process.env.NEXT_PUBLIC_MAINNET_CORE ??
    '0x101450a49E730d2e9502467242d0B6f157BABe60') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_MAINNET_USDC ??
    '0x55d398326f99059fF775485246999027B3197955') as `0x${string}`, // USDT on BSC
  chainlinkResolver: (process.env.NEXT_PUBLIC_MAINNET_RESOLVER ??
    '0xaa0A8ef8eDeD0133e6435292ef3Eff33c7038f8b') as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_MAINNET_TREASURY ??
    '0xd0eD64B884bc51Bf91CdFCbA648910b481dBbe70') as `0x${string}`,
  admin: (process.env.NEXT_PUBLIC_MAINNET_ADMIN ??
    '0x4DC74A8532550fFCA11Fb958549Ca0b72E3f1f1c') as `0x${string}`,
  // Mainnet uses Diamond architecture (Router + Facets)
  facets: {
    market: (process.env.NEXT_PUBLIC_MAINNET_FACET_MARKET ??
      '0x8edbAa8A0E00859a1b5D613c23C642880ad63f31') as `0x${string}`,
    trading: (process.env.NEXT_PUBLIC_MAINNET_FACET_TRADING ??
      '0x60F75d38399C44b295FD33FFDbb1cD35c9fF5257') as `0x${string}`,
    liquidity: (process.env.NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY ??
      '0x1Fda96fb1A1c6136856Eb355d08f2aa94c7f3516') as `0x${string}`,
    settlement: (process.env.NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT ??
      '0x9EfBED36e561db021014962d6aA08C308203fb1B') as `0x${string}`,
  },
};

const TESTNET_ADDRESSES = {
  // Testnet uses Diamond architecture (Router + Facets)
  // Deployed: January 2025 (Final security audit fixes - all hardening complete)
  // Latest deployment: deadline-enabled buy/sell + all admin + cancellation UX
  // These can be overridden at build-time via NEXT_PUBLIC_* env vars
  core: (process.env.NEXT_PUBLIC_TESTNET_CORE ??
    '0x2CF5F6E3234FAe485fae98Ea78B07cFB97Eb1ddd') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_TESTNET_USDC ??
    '0xADEa1B9F54A9Be395DDCAf51e072667E1edA09cf') as `0x${string}`,
  chainlinkResolver: (process.env.NEXT_PUBLIC_TESTNET_RESOLVER ??
    '0x6217730cab1Fc4548747bc37777Bf622B1741e36') as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_TESTNET_TREASURY ??
    '0x5583238e692A5c57314a8D392749A3B102329846') as `0x${string}`,
  admin: (process.env.NEXT_PUBLIC_TESTNET_ADMIN ??
    '0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F') as `0x${string}`,
  // Diamond facets
  facets: {
    market: (process.env.NEXT_PUBLIC_TESTNET_FACET_MARKET ??
      '0x97A832fa4fbF84D3Fec97fe4e3eF65FEc73aB35D') as `0x${string}`,
    trading: (process.env.NEXT_PUBLIC_TESTNET_FACET_TRADING ??
      '0xbfEe7bf201171CA527C83334C6D9b08d2F85790A') as `0x${string}`,
    liquidity: (process.env.NEXT_PUBLIC_TESTNET_FACET_LIQUIDITY ??
      '0x1D0d6Fd85A7Ae08Ac8A9B58Cb736d7c2CbB43a39') as `0x${string}`,
    settlement: (process.env.NEXT_PUBLIC_TESTNET_FACET_SETTLEMENT ??
      '0x5f9D480e972fBd90EcA50E01Fd277AbF6a8f7386') as `0x${string}`,
  },
};

// Get current network from localStorage or default to testnet
export function getCurrentNetwork(): Network {
  if (typeof window === 'undefined') return 'testnet';
  const stored = localStorage.getItem('selectedNetwork') as Network | null;
  return stored === 'mainnet' || stored === 'testnet' ? stored : 'testnet';
}

// Get addresses for current network
export function getAddresses() {
  const network = getCurrentNetwork();
  return network === 'mainnet' ? MAINNET_ADDRESSES : TESTNET_ADDRESSES;
}

// Whether the selected network uses the Diamond router + facet ABI.
export function isDiamondNetwork(network: Network): boolean {
  if (network === 'testnet') return true;
  // Mainnet is considered "Diamond" when facet addresses are provided (via env overrides).
  return !!MAINNET_ADDRESSES.facets;
}

// Export addresses as getter (for backward compatibility)
// This will be reactive - components should use getAddresses() in hooks
export const addresses = getAddresses();

// Re-export addresses getter for components that need reactive updates
export function useAddresses() {
  if (typeof window === 'undefined') return addresses;
  // This will be called on every render, so it will get the latest network
  return getAddresses();
}

// Chain IDs
export const MAINNET_CHAIN_ID = 56;
export const TESTNET_CHAIN_ID = 97;

export function getChainId(): number {
  const network = getCurrentNetwork();
  return network === 'mainnet' ? MAINNET_CHAIN_ID : TESTNET_CHAIN_ID;
}

export const chainId = getChainId();

// Export network getter/setter
export function getNetwork(): Network {
  return getCurrentNetwork();
}

export function setNetwork(network: Network) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('selectedNetwork', network);
  // Clear cache when switching networks
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('newlyCreatedMarkets') ||
      key.includes('userRedemptions') ||
      key.includes('transactions') ||
      key.includes('priceHistory') ||
      key.includes('comments') ||
      key.includes('market') ||
      key.includes('trade') ||
      key.includes('redemption') ||
      key.includes('claim') ||
      key.includes('history') ||
      key.startsWith('speculate-') ||
      key.startsWith('react-query') ||
      key.includes('portfolio') ||
      key === 'lastCoreAddress'
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear IndexedDB
  if ('indexedDB' in window) {
    indexedDB.deleteDatabase('SpeculateCache');
  }
  
  // Reload page to apply changes
  window.location.reload();
}

// Clear cache if Core address changed (runs once on module load in browser)
if (typeof window !== 'undefined') {
  const storedCoreAddress = localStorage.getItem('lastCoreAddress');
  const currentCoreAddress = addresses.core.toLowerCase();
  
  if (storedCoreAddress && storedCoreAddress !== currentCoreAddress) {
    console.log('[contracts] Core address changed, clearing all caches...');
    console.log('[contracts] Old Core:', storedCoreAddress, 'New Core:', currentCoreAddress);
    
    // Clear ALL localStorage items (more aggressive clearing)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('newlyCreatedMarkets') ||
        key.includes('userRedemptions') ||
        key.includes('transactions') ||
        key.includes('priceHistory') ||
        key.includes('comments') ||
        key.includes('market') ||
        key.includes('trade') ||
        key.includes('redemption') ||
        key.includes('claim') ||
        key.includes('history') ||
        key.startsWith('speculate-') ||
        key.startsWith('react-query') ||
        key.includes('portfolio')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('[contracts] Removed localStorage key:', key);
    });
    console.log(`[contracts] Cleared ${keysToRemove.length} localStorage items`);
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      const deleteReq = indexedDB.deleteDatabase('SpeculateCache');
      deleteReq.onsuccess = () => {
        console.log('[contracts] Cleared IndexedDB cache');
      };
      deleteReq.onerror = () => {
        console.warn('[contracts] Failed to clear IndexedDB:', deleteReq.error);
      };
    }
    
    // Clear React Query cache if available
    try {
      // Store a flag to clear React Query cache on next render
      sessionStorage.setItem('clearReactQueryCache', 'true');
      console.log('[contracts] Flagged React Query cache for clearing');
    } catch (e) {
      // Ignore if sessionStorage not available
    }
    
    // Update stored address
    localStorage.setItem('lastCoreAddress', currentCoreAddress);
    console.log('[contracts] ✅ Cache cleared successfully. Page will reload in 1 second...');
    
    // Reload page after clearing cache to ensure fresh data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } else if (!storedCoreAddress) {
    // First time, just store the address
    localStorage.setItem('lastCoreAddress', currentCoreAddress);
    console.log('[contracts] Stored Core address:', currentCoreAddress);
  }
}
