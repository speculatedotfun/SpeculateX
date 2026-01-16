import { networkStore, useSelectedNetwork } from './networkStore';

// Network configuration
export type Network = 'mainnet' | 'testnet';

// Contract addresses for each network
const MAINNET_ADDRESSES = {
  // BSC Mainnet - Redeployed January 2026 (Dynamic USDC decimals + AdminFacet + Protocol controls)
  // ✅ Dynamic USDC decimals support (6 or 18)
  // ✅ AdminFacet for protocol parameter management
  // ✅ Configurable limits, fees, price bands, jump limits, LP cooldown
  // ✅ Treasury with decimals-aware limits
  // ⏳ Facets pending 24-hour timelock activation
  // These can be overridden at build-time via NEXT_PUBLIC_* env vars to avoid code edits on redeploy.
  core: (process.env.NEXT_PUBLIC_MAINNET_CORE ??
    '0xAbD5bfbdc4f5B3faa8F07C48152d1cf61a88416E') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_MAINNET_USDC ??
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d') as `0x${string}`, // Real USDC on BSC (18 decimals)
  usdcDecimals: Number(process.env.NEXT_PUBLIC_MAINNET_USDC_DECIMALS ?? '18'),
  chainlinkResolver: (process.env.NEXT_PUBLIC_MAINNET_RESOLVER ??
    '0xbff5aC1fd8EdB1aEf0a32e3Dedd01ff351DBa446') as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_MAINNET_TREASURY ??
    '0x50c377AedEB8E87f9C3715Af4D84f4fA23154553') as `0x${string}`,
  admin: (process.env.NEXT_PUBLIC_MAINNET_ADMIN ??
    '0x29D67d1Ad683A76b2750f74B40b6e79d715C933c') as `0x${string}`,
  startBlock: BigInt(String(process.env.NEXT_PUBLIC_MAINNET_START_BLOCK || '0')), // Update after deployment
  // Mainnet uses Diamond architecture (Router + Facets)
  facets: {
    // Keep these in sync with the Core's facetOf mappings on mainnet.
    market: (process.env.NEXT_PUBLIC_MAINNET_FACET_MARKET ??
      '0x1df83247E0Bb2A6da9B9Cea76cC6467c7b41eD58') as `0x${string}`,
    trading: (process.env.NEXT_PUBLIC_MAINNET_FACET_TRADING ??
      '0x1e88647a37DDb2191F4B72Aa134cFcb98782e694') as `0x${string}`,
    liquidity: (process.env.NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY ??
      '0x0d44a169f822FC256EF6EB55b72D806Ac62E02b2') as `0x${string}`,
    settlement: (process.env.NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT ??
      '0x3F7831134683d6fC0F5658E5503b2cF7774A0697') as `0x${string}`,
  },
};

const TESTNET_ADDRESSES = {
  // Testnet uses Diamond architecture (Router + Facets)
  // Redeployed: January 2026 (Dynamic USDC decimals + AdminFacet + Protocol controls)
  // ✅ Dynamic USDC decimals support (6 for MockUSDC)
  // ✅ AdminFacet for protocol parameter management
  // ✅ Configurable limits, fees, price bands, jump limits, LP cooldown
  // ✅ Treasury with decimals-aware limits
  // ✅ All operations executed immediately (no timelock on testnet)
  // These can be overridden at build-time via NEXT_PUBLIC_* env vars
  core: (process.env.NEXT_PUBLIC_TESTNET_CORE ??
    '0x9315fc0082d85ABa5Dd680C30b53D73b0F032C2D') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_TESTNET_USDC ??
    '0x34F7d01f7529F176fF682aACD468Ba99A89E5aAF') as `0x${string}`, // MockUSDC with faucet
  usdcDecimals: Number(process.env.NEXT_PUBLIC_TESTNET_USDC_DECIMALS ?? '6'),
    chainlinkResolver: (process.env.NEXT_PUBLIC_TESTNET_RESOLVER ??
      '0x997a2393976e2629bb1DF909Ee4e42A800d2D0BD') as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_TESTNET_TREASURY ??
    '0x8566B7c306099c7CdB1c2fcACA099C86cf74C977') as `0x${string}`,
  admin: (process.env.NEXT_PUBLIC_TESTNET_ADMIN ??
    '0x29D67d1Ad683A76b2750f74B40b6e79d715C933c') as `0x${string}`,
  startBlock: BigInt(String(process.env.NEXT_PUBLIC_TESTNET_START_BLOCK || '84802491')),
  // Diamond facets
  facets: {
    market: (process.env.NEXT_PUBLIC_TESTNET_FACET_MARKET ??
      '0xdba345d7535E7f4c1745667B181e13c9EF74F056') as `0x${string}`,
    trading: (process.env.NEXT_PUBLIC_TESTNET_FACET_TRADING ??
      '0xbdC0b854289F29B95C919A9A05474d815C806960') as `0x${string}`,
    liquidity: (process.env.NEXT_PUBLIC_TESTNET_FACET_LIQUIDITY ??
      '0xc1C8C0eC33e055Ef092E207B12594ca5E9120528') as `0x${string}`,
    settlement: (process.env.NEXT_PUBLIC_TESTNET_FACET_SETTLEMENT ??
      '0x6312F6730891924c78735E762eC7042634B4D1fA') as `0x${string}`,
  },
};

// Chain IDs
export const MAINNET_CHAIN_ID = 56;
export const TESTNET_CHAIN_ID = 97;

// Helpers
export function networkFromChainId(chainId: number | undefined | null): Network | null {
  if (!chainId) return null;
  if (chainId === MAINNET_CHAIN_ID) return 'mainnet';
  if (chainId === TESTNET_CHAIN_ID) return 'testnet';
  return null;
}

export function chainIdForNetwork(network: Network): number {
  return network === 'mainnet' ? MAINNET_CHAIN_ID : TESTNET_CHAIN_ID;
}

// Get current network from storage or default to testnet
export function getCurrentNetwork(): Network {
  return networkStore.get();
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
// NOTE: this is a module-level snapshot (non-reactive). Prefer `getAddresses()` or `useAddresses()`.
export const addresses = getAddresses();

// Hook for reactive address updates (no page reload needed)
export function useAddresses() {
  const network = useSelectedNetwork();
  return network === 'mainnet' ? MAINNET_ADDRESSES : TESTNET_ADDRESSES;
}

export function getUsdcDecimals(): number {
  return getAddresses().usdcDecimals ?? 6;
}

export function useUsdcDecimals(): number {
  return useAddresses().usdcDecimals ?? 6;
}

export function getChainId(): number {
  const network = getCurrentNetwork();
  return chainIdForNetwork(network);
}

export const chainId = getChainId();

// Get ChainlinkResolver address for current network
export function getChainlinkResolver(): `0x${string}` {
  const addresses = getAddresses();
  return addresses.chainlinkResolver;
}

// Export network getter/setter
export function getNetwork(): Network {
  return getCurrentNetwork();
}

function clearClientCachesForNetworkChange() {
  if (typeof window === 'undefined') return;

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

  if ('indexedDB' in window) {
    indexedDB.deleteDatabase('SpeculateCache');
  }

  try {
    sessionStorage.setItem('clearReactQueryCache', 'true');
  } catch {
    // ignore
  }
}

export function setNetwork(network: Network) {
  if (typeof window === 'undefined') return;
  const prev = getCurrentNetwork();
  networkStore.set(network);
  if (prev !== network) clearClientCachesForNetworkChange();
}

// Clear cache if Core address changed (runs once on module load in browser)
if (typeof window !== 'undefined') {
  const storedCoreAddress = localStorage.getItem('lastCoreAddress');
  const currentCoreAddress = getAddresses().core.toLowerCase();

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
    console.log('[contracts] ✅ Cache cleared successfully.');
  } else if (!storedCoreAddress) {
    // First time, just store the address
    localStorage.setItem('lastCoreAddress', currentCoreAddress);
    console.log('[contracts] Stored Core address:', currentCoreAddress);
  }
}
