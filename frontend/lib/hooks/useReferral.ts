'use client';

import { useEffect, useState } from 'react';
import { isAddress } from 'viem';

const STORAGE_KEY = 'speculate_referrer';

export function useReferral() {
    const [isLookingUp, setIsLookingUp] = useState(false);

    useEffect(() => {
        const handleRefParam = async () => {
            if (typeof window === 'undefined') return;

            let refParam: string | null = null;
            try {
                refParam = new URLSearchParams(window.location.search).get('ref');
            } catch {
                // ignore
            }
            if (!refParam) return;

            // If it's already a valid address, save directly
            if (isAddress(refParam)) {
                const currentRef = localStorage.getItem(STORAGE_KEY);
                if (currentRef !== refParam) {
                    localStorage.setItem(STORAGE_KEY, refParam);
                    console.log('[Referral] Captured referrer address:', refParam);
                }
                return;
            }

            // Otherwise, it might be a username - look it up
            setIsLookingUp(true);
            try {
                const res = await fetch(`/api/usernames?username=${encodeURIComponent(refParam)}`);
                const data = await res.json();

                if (data.found && data.address) {
                    const currentRef = localStorage.getItem(STORAGE_KEY);
                    if (currentRef !== data.address) {
                        localStorage.setItem(STORAGE_KEY, data.address);
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
    }, []);

    // Helper to get the current referrer (safe for hydration)
    const getReferrer = () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(STORAGE_KEY);
    };

    // Bulk fetch referral data for multiple addresses
    const fetchReferralsBulk = async (addresses: string[]) => {
        if (!addresses.length) return {};
        try {
            const res = await fetch(`/api/referrals?referrers=${addresses.join(',')}`);
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
