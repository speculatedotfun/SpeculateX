'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { networkFromChainId, getCurrentNetwork, setNetwork } from '@/lib/contracts';
import { clearAdminRoleCache } from '@/lib/accessControl';

/**
 * Keeps `selectedNetwork` (localStorage + app config) in sync with the wallet's active chain.
 * This prevents "admin sees 0 treasury balance" when the wallet switches networks.
 */
export function NetworkSync() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const lastSynced = useRef<number | null>(null);

  useEffect(() => {
    if (!isConnected) return;
    if (!chainId) return;
    if (lastSynced.current === chainId) return;

    const inferred = networkFromChainId(chainId);
    if (!inferred) return;

    const current = getCurrentNetwork();
    if (current !== inferred) {
      setNetwork(inferred);
      clearAdminRoleCache();
    }

    lastSynced.current = chainId;
  }, [isConnected, chainId]);

  return null;
}


