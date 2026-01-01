'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';

interface UseMarketLogicProps {
    contractData: any;
    marketStateData: any;
}

export function useMarketLogic({
    contractData,
    marketStateData,
}: UseMarketLogicProps) {
    const isObject = contractData && typeof contractData === 'object' && !Array.isArray(contractData);
    const status = Number(isObject ? contractData.status : contractData?.[9] ?? 0);
    const qYes = BigInt(isObject ? contractData.qYes ?? 0n : contractData?.[2] ?? 0n);
    const qNo = BigInt(isObject ? contractData.qNo ?? 0n : contractData?.[3] ?? 0n);
    const bE18 = BigInt(isObject ? contractData.bE18 ?? 0n : contractData?.[4] ?? 0n);
    const totalLpUsdc = BigInt(isObject ? contractData.totalLpUsdc ?? 0n : contractData?.[13] ?? 0n);
    const feeTreasuryBps = Number(isObject ? contractData.feeTreasuryBps ?? 0 : contractData?.[6] ?? 0);
    const feeLpBps = Number(isObject ? contractData.feeLpBps ?? 0 : contractData?.[7] ?? 0);
    const feeVaultBps = Number(isObject ? contractData.feeVaultBps ?? 0 : contractData?.[8] ?? 0);

    const resolution = isObject ? contractData.resolution : contractData?.[18];
    const startTime = BigInt(resolution?.startTime ?? 0n);
    const now = Math.floor(Date.now() / 1000);
    const isScheduled = startTime > 0n && BigInt(now) < startTime;

    // Contract enum: MarketStatus { Active=0, Resolved=1, Cancelled=2 }
    const isActive = status === 0;
    const isResolved = status === 1;
    const isCancelled = status === 2;
    const isTradeable = isActive && !isScheduled;

    // Jump limit logic
    const SAFETY_MARGIN_BPS = 9800n;
    const jumpLimitE18 = BigInt(isObject ? contractData.maxJumpE18 ?? 0n : contractData?.[17] ?? 0n);
    const maxJumpE6 = jumpLimitE18 > 0n ? (jumpLimitE18 * SAFETY_MARGIN_BPS) / (10000n * 10n ** 12n) : 0n;

    const tradeDisabledReason = useMemo(() => {
        if (isResolved) return 'Market is resolved.';
        if (isCancelled) return 'Market is cancelled.';
        if (isScheduled) return 'Market has not started yet.';
        return '';
    }, [isResolved, isCancelled, isScheduled]);

    return {
        qYes,
        qNo,
        bE18,
        totalLpUsdc,
        feeTreasuryBps,
        feeLpBps,
        feeVaultBps,
        totalFeeBps: feeTreasuryBps + feeLpBps + feeVaultBps,
        isResolved,
        isCancelled,
        isActive,
        isTradeable,
        tradeDisabledReason,
        maxJumpE6,
        jumpLimitE18,
    };
}
