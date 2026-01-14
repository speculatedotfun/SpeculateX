import { useSyncExternalStore } from 'react';
import type { Network } from './contracts';

const STORAGE_KEY = 'selectedNetwork';
const EVENT_NAME = 'speculate:network-changed';

function readStoredNetwork(): Network {
  if (typeof window === 'undefined') return 'testnet';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Network | null;
    return stored === 'mainnet' || stored === 'testnet' ? stored : 'testnet';
  } catch {
    return 'testnet';
  }
}

function writeStoredNetwork(network: Network) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, network);
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: network }));
  } catch {
    // ignore
  }
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  const onCustom = () => callback();

  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT_NAME, onCustom as EventListener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT_NAME, onCustom as EventListener);
  };
}

export const networkStore = {
  get: readStoredNetwork,
  set: writeStoredNetwork,
  subscribe,
  key: STORAGE_KEY,
};

export function useSelectedNetwork(): Network {
  return useSyncExternalStore(subscribe, readStoredNetwork, () => 'testnet');
}


