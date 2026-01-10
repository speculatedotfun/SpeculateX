'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi, usdcAbi } from '@/lib/abis';
import { useToast } from '@/components/ui/toast';
import { useConfetti } from '@/lib/ConfettiContext';
import { waitForReceipt, sleep, ensureAllowance } from '@/lib/tradingUtils';
import { simulateBuyChunk, costFunction } from '@/lib/lmsrMath';

const SLIPPAGE_BPS = 50n;
const TRADE_DEADLINE_SECONDS = 5n * 60n;
const USDC_TO_E18 = 10n ** 12n;

interface UseTradingProps {
    marketId: number;
    marketIdBI: bigint;
    tradeMode: 'buy' | 'sell';
    side: 'yes' | 'no';
    amount: string;
    amountBigInt: bigint;
    isTradeable: boolean;
    tradeDisabledReason: string;
    maxJumpE6: bigint;
    qYes: bigint;
    qNo: bigint;
    bE18: bigint;
    feeTreasuryBps: number;
    feeVaultBps: number;
    feeLpBps: number;
    usdcAllowanceValue?: bigint;
    refetchAll: () => Promise<void>;
    setAmount: (amount: string) => void;
    onTradeSuccess?: (trade: any) => void; // NEW
}

export function useTrading({
    marketId,
    marketIdBI,
    tradeMode,
    side,
    amount,
    amountBigInt,
    isTradeable,
    tradeDisabledReason,
    maxJumpE6,
    qYes,
    qNo,
    bE18,
    feeTreasuryBps,
    feeVaultBps,
    feeLpBps,
    usdcAllowanceValue,
    refetchAll,
    setAmount,
    onTradeSuccess, // NEW
}: UseTradingProps) {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const { pushToast } = useToast();
    const { trigger: triggerConfetti } = useConfetti();

    const [pendingTrade, setPendingTrade] = useState(false);
    const [busyLabel, setBusyLabel] = useState('');
    const [showSplitConfirm, setShowSplitConfirm] = useState(false);
    const [pendingSplitAmount, setPendingSplitAmount] = useState<bigint>(0n);

    const addresses = getAddresses();
    const network = getCurrentNetwork();
    const isTestnetNetwork = network === 'testnet';
    const coreAbiForNetwork = getCoreAbi(network);

    const showToastMsg = useCallback((title: string, desc?: string, type: 'success' | 'error' | 'warning' = 'error') => {
        pushToast({ title, description: desc, type });
    }, [pushToast]);

    const showErrorToast = useCallback((err: unknown, fallback: string) => {
        const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
        showToastMsg(raw.split('\n')[0] || fallback, raw, 'error');
    }, [showToastMsg]);

    const executeSplitBuy = useCallback(async (totalE6: bigint) => {
        if (totalE6 === 0n) return;
        if (!isTradeable) throw new Error('Market is not active for trading.');

        let remaining = totalE6;
        let currentQYes = qYes;
        let currentQNo = qNo;

        while (remaining > 0n) {
            let chunk = remaining > maxJumpE6 ? maxJumpE6 : remaining;
            const simulation = simulateBuyChunk(chunk, currentQYes, currentQNo, bE18, feeTreasuryBps, feeVaultBps, feeLpBps, side === 'yes');

            if (!simulation || simulation.tokensOut === 0n) throw new Error('Cannot simulate chunk');

            const minOut = simulation.minOut > 0n ? simulation.minOut : 1n;
            const deadline = BigInt(Math.floor(Date.now() / 1000)) + TRADE_DEADLINE_SECONDS;

            const txHash = await writeContractAsync({
                address: addresses.core,
                abi: coreAbiForNetwork,
                functionName: 'buy',
                args: isTestnetNetwork
                    ? [marketIdBI, side === 'yes', chunk, minOut, deadline]
                    : [marketIdBI, side === 'yes', chunk, minOut],
            });

            await waitForReceipt(publicClient, txHash);
            remaining -= chunk;
            currentQYes = simulation.newQYes;
            currentQNo = simulation.newQNo;
            await sleep(150);
        }
        await refetchAll();
    }, [marketIdBI, isTradeable, side, writeContractAsync, publicClient, refetchAll, qYes, qNo, maxJumpE6, bE18, feeTreasuryBps, feeVaultBps, feeLpBps, addresses.core, coreAbiForNetwork, isTestnetNetwork]);

    const handleConfirmSplit = useCallback(async () => {
        if (pendingSplitAmount === 0n) {
            setShowSplitConfirm(false);
            return;
        }
        try {
            setPendingTrade(true);
            setBusyLabel('Executing split order…');
            await executeSplitBuy(pendingSplitAmount);
            triggerConfetti();
            showToastMsg('Success', 'Split order executed successfully', 'success');
            setAmount('');
            setPendingSplitAmount(0n);
        } catch (error) {
            console.error(error);
            showErrorToast(error, 'Split order failed');
        } finally {
            setPendingTrade(false);
            setBusyLabel('');
            setShowSplitConfirm(false);
        }
    }, [pendingSplitAmount, executeSplitBuy, showToastMsg, showErrorToast, triggerConfetti, setAmount]);

    const handleTrade = useCallback(async () => {
        if (!amount || parseFloat(amount) <= 0) return;
        if (!isTradeable) {
            showToastMsg('Trading disabled', tradeDisabledReason, 'warning');
            return;
        }

        const overJumpCap = tradeMode === 'buy' && maxJumpE6 > 0n && amountBigInt > maxJumpE6;

        try {
            setPendingTrade(true);
            setBusyLabel(tradeMode === 'buy' ? 'Preparing buy…' : 'Preparing sell…');

            let txHash: `0x${string}` | undefined;
            let simulation: any;
            let estimatedPrice = '0.00';

            if (tradeMode === 'buy') {
                if (address) {
                    await ensureAllowance({
                        publicClient,
                        owner: address as `0x${string}`,
                        tokenAddress: addresses.usdc,
                        spender: addresses.core,
                        required: amountBigInt,
                        currentAllowance: usdcAllowanceValue,
                        writeContractAsync,
                        setBusyLabel,
                        approvalLabel: 'Approving USDC…',
                        abi: usdcAbi
                    });
                }

                if (overJumpCap) {
                    setPendingSplitAmount(amountBigInt);
                    setShowSplitConfirm(true);
                    setBusyLabel('');
                    return;
                }

                simulation = simulateBuyChunk(amountBigInt, qYes, qNo, bE18, feeTreasuryBps, feeVaultBps, feeLpBps, side === 'yes');
                if (!simulation) throw new Error('Simulation failed');
                const minOut = simulation.minOut > 0n ? simulation.minOut : 1n;
                const deadline = BigInt(Math.floor(Date.now() / 1000)) + TRADE_DEADLINE_SECONDS;

                // Calculate Price: USDC / Shares
                const usdcVal = Number(formatUnits(amountBigInt, 6));
                const sharesVal = Number(formatUnits(minOut, 18));
                if (sharesVal > 0) estimatedPrice = (usdcVal / sharesVal).toFixed(2);

                setBusyLabel('Submitting buy…');
                txHash = await writeContractAsync({
                    address: addresses.core,
                    abi: coreAbiForNetwork,
                    functionName: 'buy',
                    args: isTestnetNetwork
                        ? [marketIdBI, side === 'yes', amountBigInt, minOut, deadline]
                        : [marketIdBI, side === 'yes', amountBigInt, minOut],
                });
                await waitForReceipt(publicClient, txHash);
            } else {
                const tokensIn = amountBigInt;
                const oldCost = costFunction(qYes, qNo, bE18);
                const newQYes = side === 'yes' ? qYes - tokensIn : qYes;
                const newQNo = side === 'yes' ? qNo : qNo - tokensIn;
                const newCost = costFunction(newQYes, newQNo, bE18);
                const refundE18 = oldCost - newCost;
                const expectedUsdcOut = refundE18 > 0n ? refundE18 / USDC_TO_E18 : 0n;
                const slippageGuard = (expectedUsdcOut * SLIPPAGE_BPS) / 10_000n;
                const minUsdcOut = expectedUsdcOut > slippageGuard ? expectedUsdcOut - slippageGuard : expectedUsdcOut;
                const deadline = BigInt(Math.floor(Date.now() / 1000)) + TRADE_DEADLINE_SECONDS;

                // Calculate Price: USDC / Shares
                const usdcVal = Number(formatUnits(expectedUsdcOut, 6));
                const sharesVal = Number(formatUnits(tokensIn, 18));
                if (sharesVal > 0) estimatedPrice = (usdcVal / sharesVal).toFixed(2);

                setBusyLabel('Submitting sell…');
                txHash = await writeContractAsync({
                    address: addresses.core,
                    abi: coreAbiForNetwork,
                    functionName: 'sell',
                    args: isTestnetNetwork
                        ? [marketIdBI, side === 'yes', tokensIn, minUsdcOut, deadline]
                        : [marketIdBI, side === 'yes', tokensIn, minUsdcOut],
                });
                await waitForReceipt(publicClient, txHash);
            }

            setBusyLabel('Finalizing…');
            await refetchAll();
            triggerConfetti();
            showToastMsg('Success', 'Trade executed successfully', 'success');
            setAmount('');

            // Optimistic Update
            if (onTradeSuccess && txHash) {
                // Check for referrer
                const referrer = localStorage.getItem('speculate_referrer');
                if (referrer) {
                    console.log(`[Referral] 🔗 Found attributes: ${referrer}`);

                    // Dispatch to backend (fire and forget)
                    fetch('/api/referrals', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            referrer,
                            user: address,
                            txHash,
                            marketId,
                            amount: amount,
                            type: tradeMode === 'buy' ? (side === 'yes' ? 'BuyYes' : 'BuyNo') : (side === 'yes' ? 'SellYes' : 'SellNo')
                        })
                    }).catch(err => console.error('[Referral] Failed to log:', err));
                }

                onTradeSuccess({
                    id: txHash + '-' + (tradeMode === 'buy' ? (side === 'yes' ? 'BuyYes' : 'BuyNo') : (side === 'yes' ? 'SellYes' : 'SellNo')),
                    type: tradeMode === 'buy' ? (side === 'yes' ? 'BuyYes' : 'BuyNo') : (side === 'yes' ? 'SellYes' : 'SellNo'),
                    user: address?.toLowerCase() || '',
                    amount: amount,
                    output: '0',
                    price: estimatedPrice,
                    timestamp: Math.floor(Date.now() / 1000),
                    txHash: txHash,
                    referrer
                });
            }
        } catch (error) {
            console.error(error);
            showErrorToast(error, 'Trade failed');
        } finally {
            setPendingTrade(false);
            setBusyLabel('');
        }
    }, [amount, amountBigInt, isTradeable, tradeMode, address, publicClient, writeContractAsync, usdcAllowanceValue, maxJumpE6, refetchAll, showToastMsg, showErrorToast, bE18, feeLpBps, feeTreasuryBps, feeVaultBps, marketIdBI, qNo, qYes, side, tradeDisabledReason, addresses.core, addresses.usdc, coreAbiForNetwork, isTestnetNetwork, triggerConfetti, setAmount]);

    return {
        pendingTrade,
        busyLabel,
        showSplitConfirm,
        setShowSplitConfirm,
        pendingSplitAmount,
        handleTrade,
        handleConfirmSplit,
    };
}
