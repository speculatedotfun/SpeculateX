'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi, usdcAbi } from '@/lib/abis';
import { useToast } from '@/components/ui/toast';
import { waitForReceipt, ensureAllowance } from '@/lib/tradingUtils';

interface UseLiquidityProps {
    marketIdBI: bigint;
    lpSharesValue: bigint;
    usdcAllowanceValue?: bigint;
    refetchAll: () => Promise<void>;
}

export function useLiquidity({
    marketIdBI,
    lpSharesValue,
    usdcAllowanceValue,
    refetchAll,
}: UseLiquidityProps) {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const { pushToast } = useToast();

    const [addLiquidityAmount, setAddLiquidityAmount] = useState('');
    const [removeLiquidityAmount, setRemoveLiquidityAmount] = useState('');
    const [isLpProcessing, setIsLpProcessing] = useState(false);
    const [pendingLpAction, setPendingLpAction] = useState('');

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

    const handleAddLiquidity = useCallback(async () => {
        if (!addLiquidityAmount || parseFloat(addLiquidityAmount) <= 0) return;
        try {
            setIsLpProcessing(true);
            const amountBI = parseUnits(addLiquidityAmount, 6);

            if (address) {
                await ensureAllowance({
                    publicClient,
                    owner: address as `0x${string}`,
                    tokenAddress: addresses.usdc,
                    spender: addresses.core,
                    required: amountBI,
                    currentAllowance: usdcAllowanceValue,
                    writeContractAsync,
                    setBusyLabel: setPendingLpAction,
                    approvalLabel: 'Approving USDC for LP…',
                    abi: usdcAbi
                });
            }

            setPendingLpAction('Adding liquidity…');
            const tx = await writeContractAsync({
                address: addresses.core,
                abi: coreAbiForNetwork,
                functionName: 'addLiquidity',
                args: [marketIdBI, amountBI]
            });
            await waitForReceipt(publicClient, tx);
            await refetchAll();
            showToast('Success', 'Liquidity added successfully', 'success');
            setAddLiquidityAmount('');
        } catch (e) {
            showErrorToast(e, 'Failed to add liquidity');
        } finally {
            setIsLpProcessing(false);
            setPendingLpAction('');
        }
    }, [addLiquidityAmount, address, publicClient, writeContractAsync, usdcAllowanceValue, marketIdBI, refetchAll, showToast, showErrorToast, addresses.core, addresses.usdc, coreAbiForNetwork]);

    const handleRemoveLiquidity = useCallback(async () => {
        if (!removeLiquidityAmount || parseFloat(removeLiquidityAmount) <= 0) return;
        try {
            setIsLpProcessing(true);
            setPendingLpAction('Removing liquidity…');
            const amountBI = parseUnits(removeLiquidityAmount, 6);
            const tx = await writeContractAsync({
                address: addresses.core,
                abi: coreAbiForNetwork,
                functionName: 'removeLiquidity',
                args: [marketIdBI, amountBI]
            });
            await waitForReceipt(publicClient, tx);
            await refetchAll();
            showToast('Success', 'Liquidity removed successfully', 'success');
            setRemoveLiquidityAmount('');
        } catch (e) {
            showErrorToast(e, 'Failed to remove liquidity');
        } finally {
            setIsLpProcessing(false);
            setPendingLpAction('');
        }
    }, [removeLiquidityAmount, marketIdBI, writeContractAsync, publicClient, refetchAll, showToast, showErrorToast, addresses.core, coreAbiForNetwork]);

    const handleClaimAllLp = useCallback(async (hasFees: boolean, hasResidual: boolean) => {
        if (!hasFees && !hasResidual) return;
        try {
            setIsLpProcessing(true);
            if (hasFees) {
                setPendingLpAction('Claiming fees…');
                const tx1 = await writeContractAsync({
                    address: addresses.core,
                    abi: coreAbiForNetwork,
                    functionName: 'claimLpFees',
                    args: [marketIdBI]
                });
                await waitForReceipt(publicClient, tx1);
            }
            if (hasResidual) {
                setPendingLpAction('Claiming residual…');
                const tx2 = await writeContractAsync({
                    address: addresses.core,
                    abi: coreAbiForNetwork,
                    functionName: 'claimLpResidual',
                    args: [marketIdBI]
                });
                await waitForReceipt(publicClient, tx2);
            }
            await refetchAll();
            showToast('Success', 'Rewards claimed successfully', 'success');
        } catch (e) {
            showErrorToast(e, 'Failed to claim rewards');
        } finally {
            setIsLpProcessing(false);
            setPendingLpAction('');
        }
    }, [marketIdBI, writeContractAsync, publicClient, refetchAll, showToast, showErrorToast, addresses.core, coreAbiForNetwork]);

    return {
        addLiquidityAmount,
        setAddLiquidityAmount,
        removeLiquidityAmount,
        setRemoveLiquidityAmount,
        isLpProcessing,
        pendingLpAction,
        handleAddLiquidity,
        handleRemoveLiquidity,
        handleClaimAllLp,
    };
}
