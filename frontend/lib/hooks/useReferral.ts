'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { isAddress } from 'viem';

const STORAGE_KEY = 'speculate_referrer';

export function useReferral() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const refParam = searchParams?.get('ref');

        // If a valid referral code is present, save it
        if (refParam && isAddress(refParam)) {
            // Don't overwrite if it's the same (avoid unnecessary writes)
            const currentRef = localStorage.getItem(STORAGE_KEY);
            if (currentRef !== refParam) {
                localStorage.setItem(STORAGE_KEY, refParam);
                console.log('[Referral] Captured referrer:', refParam);
            }
        }
    }, [searchParams]);

    // Helper to get the current referrer (safe for hydration)
    const getReferrer = () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(STORAGE_KEY);
    };

    return { getReferrer };
}
