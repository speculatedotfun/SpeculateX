// Network configuration
export type Network = 'mainnet' | 'testnet';

// Contract addresses for each network
const MAINNET_ADDRESSES = {
  // Mainnet uses old monolithic SpeculateCore
  core: '0xDCdAf5219c7Cb8aB83475A4562e2c6Eb7B2a3725' as `0x${string}`,
  usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as `0x${string}`,
  chainlinkResolver: '0x93793866F3AB07a34cb89C6751167f0EBaCf0ce3' as `0x${string}`,
  treasury: '0x5ca1b0EFE9Eb303606ddec5EA6e931Fe57A08778' as `0x${string}`,
  admin: '0x4dc74a8532550ffca11fb958549ca0b72e3f1f1c' as `0x${string}`,
  // Mainnet doesn't have facets (monolithic)
  facets: undefined,
};

const TESTNET_ADDRESSES = {
  // Testnet uses Diamond architecture (Router + Facets)
  // Deployed: December 2024 (with question string on-chain storage + getMarketQuestion getter)
  core: '0x601c5DA28dacc049481eD853E5b59b9F20Dd44a8' as `0x${string}`,
  usdc: '0x845740D345ECba415534df44C580ebb3A2432719' as `0x${string}`,
  chainlinkResolver: '0xe51729af202D801B7F7f87A6d04B447CcBaDe576' as `0x${string}`,
  treasury: '0x155FB12aD27259212f000443531fAe8a629F2A19' as `0x${string}`,
  admin: '0x9D767E1a7D6650EEf1cEaa82841Eb553eDD6b76F' as `0x${string}`, // Update with actual deployer address
  // Diamond facets
  facets: {
    market: '0x12886B7d5C5Ebb15B29F70e3De1c90A359a74B93' as `0x${string}`,
    trading: '0xe9521eA09C960780fe58bf625CA2b94D60E37a70' as `0x${string}`,
    liquidity: '0xe975a09183a61Cdb1f7279265B75da6EEB24e6A4' as `0x${string}`,
    settlement: '0x88A7F6DdeA0BCD7998d78331313E6fb8504039c1' as `0x${string}`,
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
