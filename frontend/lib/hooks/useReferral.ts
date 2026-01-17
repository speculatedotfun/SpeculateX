'use client';

import { useEffect, useState } from 'react';
import { useChainId } from 'wagmi';
import { isAddress } from 'viem';

const storageKey = (chainId: number | null | undefined) =>
    `speculate_referrer_${chainId ?? 'unknown'}`;

export function useReferral() {
    const [isLookingUp, setIsLookingUp] = useState(false);
    const chainId = useChainId();

    useEffect(() => {
        const handleRefParam = async () => {
            if (typeof window === 'undefined') return;

            let refParam: string | null = null;
            let chainParam: string | null = null;
            try {
                const params = new URLSearchParams(window.location.search);
                refParam = params.get('ref');
                chainParam = params.get('chainId');
            } catch {
                // ignore
            }
            if (!refParam) return;

            const effectiveChainId = chainParam && /^\d+$/.test(chainParam)
                ? Number(chainParam)
                : chainId;
            const key = storageKey(effectiveChainId);

            // If it's already a valid address, save directly
            if (isAddress(refParam)) {
                const currentRef = localStorage.getItem(key);
                if (currentRef !== refParam) {
                    localStorage.setItem(key, refParam);
                    console.log('[Referral] Captured referrer address:', refParam);
                }
                return;
            }

            // Otherwise, it might be a username - look it up
            setIsLookingUp(true);
            try {
                const res = await fetch(
                    `/api/usernames?username=${encodeURIComponent(refParam)}&chainId=${effectiveChainId ?? ''}`
                );
                const data = await res.json();

                if (data.found && data.address) {
                    const currentRef = localStorage.getItem(key);
                    if (currentRef !== data.address) {
                        localStorage.setItem(key, data.address);
                        console.log('[Referral] Captured referrer via username:', refParam, '->', data.address);
                    }
                } else {
                    console.warn('[Referral] Username not found:', refParam);
                }
            } catch (e) {
                console.error('[Referral] Failed to lookup username:', e);
            } finally {
                setIsLookingUp(false);
            }
        };

        handleRefParam();
    }, [chainId]);

    // Helper to get the current referrer (safe for hydration)
    const getReferrer = (overrideChainId?: number | null) => {
        if (typeof window === 'undefined') return null;
        const key = storageKey(overrideChainId ?? chainId);
        return localStorage.getItem(key);
    };

    // Bulk fetch referral data for multiple addresses
    const fetchReferralsBulk = async (addresses: string[]) => {
        if (!addresses.length) return {};
        try {
            const res = await fetch(`/api/referrals?referrers=${addresses.join(',')}&chainId=${chainId ?? ''}`);
            const data = await res.json();
            if (data.success) {
                return data.data; // Map of address -> ReferralRecord[]
            }
        } catch (e) {
            console.error('[Referral] Bulk fetch failed:', e);
        }
        return {};
    };

    return { getReferrer, isLookingUp, fetchReferralsBulk };
}
