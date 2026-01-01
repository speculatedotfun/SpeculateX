'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi } from '@/lib/abis';
import { useToast } from '@/components/ui/toast';
import { useConfetti } from '@/lib/ConfettiContext';
import { waitForReceipt } from '@/lib/tradingUtils';

interface UseRedeemProps {
    marketIdBI: bigint;
    refetchAll: () => Promise<void>;
}

export function useRedeem({
    marketIdBI,
    refetchAll,
}: UseRedeemProps) {
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const { pushToast } = useToast();
    const { trigger: triggerConfetti } = useConfetti();

    const [isRedeeming, setIsRedeeming] = useState(false);

    const addresses = getAddresses();
    const network = getCurrentNetwork();
    const coreAbiForNetwork = getCoreAbi(network);

    const showToast = useCallback((title: string, desc?: string, type: 'success' | 'error' | 'warning' = 'error') => {
        pushToast({ title, description: desc, type });
    }, [pushToast]);

    const showErrorToast = useCallback((err: unknown, fallback: string) => {
        const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
        showToast(raw.split('\n')[0] || fallback, raw, 'error');
    }, [showToast]);

    const handleRedeem = useCallback(async (isYes: boolean) => {
        try {
            setIsRedeeming(true);
            const tx = await writeContractAsync({
                address: addresses.core,
                abi: coreAbiForNetwork,
                functionName: 'redeem',
                args: [marketIdBI, isYes]
            });
            await waitForReceipt(publicClient, tx);
            await refetchAll();
            triggerConfetti();
            showToast('Success', 'Redeemed successfully', 'success');
        } catch (e) {
            showErrorToast(e, 'Redeem failed');
        } finally {
            setIsRedeeming(false);
        }
    }, [marketIdBI, writeContractAsync, publicClient, refetchAll, showToast, showErrorToast, addresses.core, coreAbiForNetwork, triggerConfetti]);

    return {
        isRedeeming,
        handleRedeem,
    };
}
