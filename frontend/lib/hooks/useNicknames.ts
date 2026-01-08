'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'speculatex_nicknames';

interface NicknameMap {
  [address: string]: string;
}

/**
 * Hook to manage user nicknames
 * Stores nicknames in localStorage with address -> nickname mapping
 */
export function useNicknames() {
  const [nicknames, setNicknames] = useState<NicknameMap>({});

  // Save nicknames to localStorage and dispatch event
  const saveNicknames = useCallback((newNicknames: NicknameMap) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newNicknames));
      setNicknames(newNicknames);
      // Dispatch custom event to sync other hook instances
      window.dispatchEvent(new Event('nickname-update'));
    } catch (error) {
      console.error('Failed to save nicknames:', error);
    }
  }, []);

  // Sync state on mount and when events fire
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

    loadNicknames();

    // Listen for updates from other components
    window.addEventListener('nickname-update', loadNicknames);
    // Listen for updates from other tabs
    window.addEventListener('storage', loadNicknames);

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

  // Remove nickname for an address
  const removeNickname = useCallback((address: string) => {
    if (!address) return;
    const normalizedAddress = address.toLowerCase();
    const newNicknames = { ...nicknames };
    delete newNicknames[normalizedAddress];
    saveNicknames(newNicknames);
  }, [nicknames, saveNicknames]);

  // Get nickname for an address
  const getNickname = useCallback((address: string): string | null => {
    if (!address) return null;
    const normalizedAddress = address.toLowerCase();
    return nicknames[normalizedAddress] || null;
  }, [nicknames]);

  return {
    nicknames,
    setNickname,
    removeNickname,
    getNickname,
  };
}

/**
 * Utility function to get display name (nickname or shortened address)
 */
export function getDisplayName(address: string, nicknames: NicknameMap): string {
  if (!address) return '';
  const normalizedAddress = address.toLowerCase();
  const nickname = nicknames[normalizedAddress];
  if (nickname) {
    return nickname;
  }
  // Fallback to shortened address
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Helper to shorten address
 */
export function shortenAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

