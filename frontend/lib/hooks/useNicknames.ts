'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useChainId } from 'wagmi';

interface NicknameMap {
  [address: string]: string;
}

/**
 * Hook to manage usernames (single source of truth)
 */
export function useNicknames() {
  const chainId = useChainId();
  const usernameCacheKey = useMemo(
    () => `speculatex_usernames_cache_${chainId ?? 'unknown'}`,
    [chainId],
  );
  const [usernames, setUsernames] = useState<NicknameMap>({});
  // Track addresses we've already attempted to fetch to avoid infinite loops
  const fetchedAddresses = useRef<Set<string>>(new Set());
  // Track pending requests to prevent duplicate concurrent requests
  const pendingRequests = useRef<Map<string, Promise<string | null>>>(new Map());

  // Fetch username from API for a specific address
  const fetchUsernameForAddress = useCallback(async (address: string) => {
    const normalized = address.toLowerCase();
    
    // Check if already fetched
    if (fetchedAddresses.current.has(normalized)) return null;
    
    // Check if request is already in flight
    const pendingRequest = pendingRequests.current.get(normalized);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Mark as fetched to prevent duplicate calls
    fetchedAddresses.current.add(normalized);

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const res = await fetch(`/api/usernames?address=${normalized}&chainId=${chainId ?? ''}`);
        const data = await res.json();
        if (data.found && data.username) {
          setUsernames(prev => {
            const updated = { ...prev, [normalized]: data.username };
            try {
              localStorage.setItem(usernameCacheKey, JSON.stringify(updated));
            } catch (e) { }
            return updated;
          });
          return data.username;
        }
        return null;
      } catch (e) {
        console.error('Failed to fetch username for', address, e);
        // Remove from fetched set on error so it can be retried
        fetchedAddresses.current.delete(normalized);
        return null;
      } finally {
        // Remove from pending requests
        pendingRequests.current.delete(normalized);
      }
    })();

    // Store the pending request
    pendingRequests.current.set(normalized, requestPromise);
    return requestPromise;
  }, [chainId, usernameCacheKey]);

  // Fetch usernames for multiple addresses in bulk
  const fetchUsernamesBulk = useCallback(async (addresses: string[]) => {
    const normalized = addresses.map(a => a.toLowerCase());
    const toFetch = normalized.filter(a => 
      !fetchedAddresses.current.has(a) && !pendingRequests.current.has(a)
    );

    if (toFetch.length === 0) return;

    // Mark as fetched immediately to prevent concurrent duplicate calls
    toFetch.forEach(a => fetchedAddresses.current.add(a));

    // Create a unique key for this bulk request
    const bulkKey = `bulk_${toFetch.sort().join(',')}`;
    
    // Check if this exact bulk request is already pending
    const existingBulkRequest = pendingRequests.current.get(bulkKey);
    if (existingBulkRequest) {
      return existingBulkRequest;
    }

    const requestPromise = (async () => {
      try {
        const res = await fetch(`/api/usernames?addresses=${toFetch.join(',')}&chainId=${chainId ?? ''}`);
        const data = await res.json();
        if (data.found && data.usernames) {
          setUsernames(prev => {
            const updated = { ...prev, ...data.usernames };
            try {
              localStorage.setItem(usernameCacheKey, JSON.stringify(updated));
            } catch (e) { }
            return updated;
          });
        }
      } catch (e) {
        console.error('Failed to fetch bulk usernames', e);
        // Remove from fetched set on error so it can be retried
        toFetch.forEach(a => fetchedAddresses.current.delete(a));
      } finally {
        // Remove from pending requests
        pendingRequests.current.delete(bulkKey);
      }
    })();

    // Store the pending bulk request
    pendingRequests.current.set(bulkKey, requestPromise);
    return requestPromise;
  }, [chainId, usernameCacheKey]);

  // Sync state on mount
  useEffect(() => {
    const loadUsernameCache = () => {
      try {
        const cached = localStorage.getItem(usernameCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          setUsernames(parsed);
          // Add initially cached addresses to the "fetched" set
          Object.keys(parsed).forEach(addr => fetchedAddresses.current.add(addr.toLowerCase()));
        } else {
          setUsernames({});
        }
      } catch (e) { }
    };

    fetchedAddresses.current = new Set();
    pendingRequests.current.clear();
    loadUsernameCache();

    const handleUpdate = () => loadUsernameCache();
    window.addEventListener('username-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('username-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [usernameCacheKey]);

  // Manually register a username in local state (after API call)
  const registerUsername = useCallback((address: string, username: string) => {
    if (!address || !username) return;
    const normalized = address.toLowerCase();

    // Update local state directly
    setUsernames(prev => {
      const updated = { ...prev, [normalized]: username };
      try {
        localStorage.setItem(usernameCacheKey, JSON.stringify(updated));
      } catch (e) { }
      return updated;
    });

    // Notify other hook instances
    window.dispatchEvent(new Event('username-update'));
  }, [usernameCacheKey]);

  return {
    nicknames: usernames,
    fetchUsernameForAddress,
    fetchUsernamesBulk,
    registerUsername,
  };
}

/**
 * Utility function to get display name (username or shortened address)
 */
export function getDisplayName(address: string, nicknames: NicknameMap): string {
  if (!address) return '';
  const normalizedAddress = address.toLowerCase();
  const username = nicknames[normalizedAddress];
  if (username) {
    return username;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Helper to shorten address
 */
export function shortenAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
