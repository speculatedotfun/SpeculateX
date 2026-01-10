'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const STORAGE_KEY = 'speculatex_nicknames';
const USERNAME_CACHE_KEY = 'speculatex_usernames_cache';

interface NicknameMap {
  [address: string]: string;
}

/**
 * Hook to manage user nicknames
 * Merges localStorage nicknames with API usernames
 */
export function useNicknames() {
  const [nicknames, setNicknames] = useState<NicknameMap>({});
  const [usernames, setUsernames] = useState<NicknameMap>({});
  // Track addresses we've already attempted to fetch to avoid infinite loops
  const fetchedAddresses = useRef<Set<string>>(new Set());

  // Save nicknames to localStorage and dispatch event
  const saveNicknames = useCallback((newNicknames: NicknameMap) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newNicknames));
      setNicknames(newNicknames);
      window.dispatchEvent(new Event('nickname-update'));
    } catch (error) {
      console.error('Failed to save nicknames:', error);
    }
  }, []);

  // Fetch username from API for a specific address
  const fetchUsernameForAddress = useCallback(async (address: string) => {
    const normalized = address.toLowerCase();
    if (fetchedAddresses.current.has(normalized)) return null;
    fetchedAddresses.current.add(normalized);

    try {
      const res = await fetch(`/api/usernames?address=${normalized}`);
      const data = await res.json();
      if (data.found && data.username) {
        setUsernames(prev => {
          const updated = { ...prev, [normalized]: data.username };
          try {
            localStorage.setItem(USERNAME_CACHE_KEY, JSON.stringify(updated));
          } catch (e) { }
          return updated;
        });
        return data.username;
      }
    } catch (e) {
      console.error('Failed to fetch username for', address, e);
    }
    return null;
  }, []);

  // Fetch usernames for multiple addresses in bulk
  const fetchUsernamesBulk = useCallback(async (addresses: string[]) => {
    const toFetch = addresses
      .map(a => a.toLowerCase())
      .filter(a => !fetchedAddresses.current.has(a));

    if (toFetch.length === 0) return;

    // Mark as fetched immediately to prevent concurrent duplicate calls
    toFetch.forEach(a => fetchedAddresses.current.add(a));

    try {
      const res = await fetch(`/api/usernames?addresses=${toFetch.join(',')}`);
      const data = await res.json();
      if (data.found && data.usernames) {
        setUsernames(prev => {
          const updated = { ...prev, ...data.usernames };
          try {
            localStorage.setItem(USERNAME_CACHE_KEY, JSON.stringify(updated));
          } catch (e) { }
          return updated;
        });
      }
    } catch (e) {
      console.error('Failed to fetch bulk usernames', e);
    }
  }, []);

  // Sync state on mount
  useEffect(() => {
    const loadNicknames = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setNicknames(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load nicknames:', error);
      }
    };

    const loadUsernameCache = () => {
      try {
        const cached = localStorage.getItem(USERNAME_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setUsernames(parsed);
          // Add initially cached addresses to the "fetched" set
          Object.keys(parsed).forEach(addr => fetchedAddresses.current.add(addr.toLowerCase()));
        }
      } catch (e) { }
    };

    loadNicknames();
    loadUsernameCache();

    window.addEventListener('nickname-update', () => {
      loadNicknames();
      loadUsernameCache();
    });
    window.addEventListener('storage', () => {
      loadNicknames();
      loadUsernameCache();
    });

    return () => {
      window.removeEventListener('nickname-update', loadNicknames);
      window.removeEventListener('storage', loadNicknames);
    };
  }, []);

  // Set nickname for an address
  const setNickname = useCallback((address: string, nickname: string) => {
    if (!address) return;
    const normalizedAddress = address.toLowerCase();
    const newNicknames = {
      ...nicknames,
      [normalizedAddress]: nickname.trim(),
    };
    saveNicknames(newNicknames);
  }, [nicknames, saveNicknames]);

  // Manually register a username in local state (after API call)
  const registerUsername = useCallback((address: string, username: string) => {
    if (!address || !username) return;
    const normalized = address.toLowerCase();

    // Update local state directly
    setUsernames(prev => {
      const updated = { ...prev, [normalized]: username };
      try {
        localStorage.setItem(USERNAME_CACHE_KEY, JSON.stringify(updated));
      } catch (e) { }
      return updated;
    });

    // Notify other hook instances
    window.dispatchEvent(new Event('nickname-update'));
  }, []);

  // Remove nickname for an address
  const removeNickname = useCallback((address: string) => {
    if (!address) return;
    const normalizedAddress = address.toLowerCase();
    const newNicknames = { ...nicknames };
    delete newNicknames[normalizedAddress];
    saveNicknames(newNicknames);
  }, [nicknames, saveNicknames]);

  // Get nickname for an address (checks username first, then local nickname)
  const getNickname = useCallback((address: string): string | null => {
    if (!address) return null;
    const normalizedAddress = address.toLowerCase();
    return usernames[normalizedAddress] || nicknames[normalizedAddress] || null;
  }, [nicknames, usernames]);

  // Combined map for display purposes - MEMOIZED to prevent infinite loops in effects
  const allNicknames = useMemo(() => ({ ...nicknames, ...usernames }), [nicknames, usernames]);

  return {
    nicknames: allNicknames,
    setNickname,
    removeNickname,
    getNickname,
    fetchUsernameForAddress,
    fetchUsernamesBulk,
    registerUsername,
  };
}

/**
 * Utility function to get display name (username/nickname or shortened address)
 */
export function getDisplayName(address: string, nicknames: NicknameMap): string {
  if (!address) return '';
  const normalizedAddress = address.toLowerCase();
  const nickname = nicknames[normalizedAddress];
  if (nickname) {
    return nickname;
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
