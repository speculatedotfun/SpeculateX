// Network configuration
export type Network = 'mainnet' | 'testnet';

// Contract addresses for each network
const MAINNET_ADDRESSES = {
  // BSC Mainnet - Deployed December 31, 2025 (All audit fixes + Scheduled Markets)
  // ✅ LP fee cooldown protection (H-01)
  // ✅ Expiry liquidity lock (H-02)
  // ✅ Chainlink phase boundary handling (M-01)
  // ✅ Always-enforced price jump limits (M-03)
  // ✅ Fee validation (L-01)
  // ✅ Minimum market duration (L-06)
  // ✅ Scheduled markets support
  // ⏳ Facets pending 24-hour timelock activation
  // These can be overridden at build-time via NEXT_PUBLIC_* env vars to avoid code edits on redeploy.
  core: (process.env.NEXT_PUBLIC_MAINNET_CORE ??
    '0x1FcCf26f103823cb905Ea5D14628059cc5221918') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_MAINNET_USDC ??
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d') as `0x${string}`, // Real USDC on BSC
  chainlinkResolver: (process.env.NEXT_PUBLIC_MAINNET_RESOLVER ??
    '0x83ea7A65EcBd64f7bBABb728C9966A842d3E502e') as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_MAINNET_TREASURY ??
    '0xE8fe348d2A9e585c577497c8e5ab2F8F54267BDd') as `0x${string}`,
  admin: (process.env.NEXT_PUBLIC_MAINNET_ADMIN ??
    '0x29D67d1Ad683A76b2750f74B40b6e79d715C933c') as `0x${string}`,
  startBlock: BigInt(String(process.env.NEXT_PUBLIC_MAINNET_START_BLOCK || '73210700')),
  // Mainnet uses Diamond architecture (Router + Facets)
  facets: {
    market: (process.env.NEXT_PUBLIC_MAINNET_FACET_MARKET ??
      '0x4d5BA295825e1D093A160F583489347C375D96e2') as `0x${string}`,
    trading: (process.env.NEXT_PUBLIC_MAINNET_FACET_TRADING ??
      '0xb1fef506a722E5Dfebb4bb30e9076c302ac57412') as `0x${string}`,
    liquidity: (process.env.NEXT_PUBLIC_MAINNET_FACET_LIQUIDITY ??
      '0xFBDAF15D9536ffF9869332874116c5c943470B0D') as `0x${string}`,
    settlement: (process.env.NEXT_PUBLIC_MAINNET_FACET_SETTLEMENT ??
      '0x5E447549E5669B8D5Dd0DC5ED36CA47b5e479d07') as `0x${string}`,
  },
};

const TESTNET_ADDRESSES = {
  // Testnet uses Diamond architecture (Router + Facets)
  // Deployed: December 31, 2025 (All audit fixes + Correct USDC - H-01, H-02, M-01, M-03, L-01, L-06)
  // ✅ LP fee cooldown protection (H-01)
  // ✅ Expiry liquidity lock (H-02)
  // ✅ Chainlink phase boundary handling (M-01)
  // ✅ Always-enforced price jump limits (M-03)
  // ✅ Fee validation (L-01)
  // ✅ Minimum market duration (L-06)
  // ✅ Correct MockUSDC address (fixed from mainnet USDT)
  // These can be overridden at build-time via NEXT_PUBLIC_* env vars
  core: (process.env.NEXT_PUBLIC_TESTNET_CORE ??
    '0x233e50371C739d31f5131b3C6e26D8d16389154A') as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_TESTNET_USDC ??
    '0xf89608F7586D5a7D63F008f759b0Be4B1815BDb2') as `0x${string}`, // MockUSDC with faucet
  chainlinkResolver: (process.env.NEXT_PUBLIC_TESTNET_RESOLVER ??
    '0x898df0EA320BbAF912c1FeaD43CB12225aBf7423') as `0x${string}`,
  treasury: (process.env.NEXT_PUBLIC_TESTNET_TREASURY ??
    '0x4146809dAa8cFD28c3C90e0415cD8Ff430DA26B9') as `0x${string}`,
  admin: (process.env.NEXT_PUBLIC_TESTNET_ADMIN ??
    '0x29D67d1Ad683A76b2750f74B40b6e79d715C933c') as `0x${string}`,
  startBlock: BigInt(String(process.env.NEXT_PUBLIC_TESTNET_START_BLOCK || '82085859')),
  // Diamond facets
  facets: {
    market: (process.env.NEXT_PUBLIC_TESTNET_FACET_MARKET ??
      '0x5fB4E87Dd91d60fb55405d4593Ec3B58225c2651') as `0x${string}`,
    trading: (process.env.NEXT_PUBLIC_TESTNET_FACET_TRADING ??
      '0x5fE1972Cb9D1b5040ccEF327E78cC0F47A71cb62') as `0x${string}`,
    liquidity: (process.env.NEXT_PUBLIC_TESTNET_FACET_LIQUIDITY ??
      '0xfBd5dD6bC095eA9C3187AEC24E4D1F04F25f8365') as `0x${string}`,
    settlement: (process.env.NEXT_PUBLIC_TESTNET_FACET_SETTLEMENT ??
      '0xA1CA75ce55865155E38e3aFA29AbCBB9f188B2f5') as `0x${string}`,
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
