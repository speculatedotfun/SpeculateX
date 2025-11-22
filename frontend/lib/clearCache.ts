/**
 * Utility to clear all caches when contract addresses change
 * Call this when deploying new contracts
 */

export function clearAllCaches() {
  try {
    // Clear localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Remove all speculate-related cache
        if (
          key.includes('newlyCreatedMarkets') ||
          key.includes('userRedemptions') ||
          key.includes('transactions') ||
          key.includes('priceHistory') ||
          key.includes('comments') ||
          key.startsWith('speculate-')
        ) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[clearCache] Cleared ${keysToRemove.length} localStorage items`);

    // Clear IndexedDB
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      const deleteDB = indexedDB.deleteDatabase('SpeculateCache');
      deleteDB.onsuccess = () => {
        console.log('[clearCache] Cleared IndexedDB cache');
      };
      deleteDB.onerror = () => {
        console.warn('[clearCache] Failed to clear IndexedDB:', deleteDB.error);
      };
    }

    // Clear React Query cache (if using)
    if (typeof window !== 'undefined' && (window as any).__REACT_QUERY_CLIENT__) {
      (window as any).__REACT_QUERY_CLIENT__.clear();
      console.log('[clearCache] Cleared React Query cache');
    }

    return true;
  } catch (error) {
    console.error('[clearCache] Error clearing caches:', error);
    return false;
  }
}

/**
 * Check if cache needs to be cleared based on stored Core address
 */
export function checkAndClearCacheIfNeeded(currentCoreAddress: string) {
  const storedCoreAddress = localStorage.getItem('lastCoreAddress');
  if (storedCoreAddress && storedCoreAddress !== currentCoreAddress) {
    console.log('[clearCache] Core address changed, clearing caches...');
    clearAllCaches();
    localStorage.setItem('lastCoreAddress', currentCoreAddress);
    return true;
  } else if (!storedCoreAddress) {
    // First time, just store the address
    localStorage.setItem('lastCoreAddress', currentCoreAddress);
  }
  return false;
}

