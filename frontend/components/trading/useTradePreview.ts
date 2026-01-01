'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { clamp } from '@/lib/tradingUtils';
import { findSharesOut, spotPriceYesE18, costFunction } from '@/lib/lmsrMath';

const USDC_TO_E18 = 10n ** 12n;

interface UseTradePreviewProps {
    amount: string;
    tradeMode: 'buy' | 'sell';
    side: 'yes' | 'no';
    qYes: bigint;
    qNo: bigint;
    bE18: bigint;
    feeTreasuryBps: number;
    feeVaultBps: number;
    feeLpBps: number;
    totalFeeBps: number;
    getActualBasePrice: () => number;
}

export function useTradePreview({
    amount,
    tradeMode,
    side,
    qYes,
    qNo,
    bE18,
    feeTreasuryBps,
    feeVaultBps,
    feeLpBps,
    totalFeeBps,
    getActualBasePrice,
}: UseTradePreviewProps) {
    const [currentPrice, setCurrentPrice] = useState(0);
    const [newPrice, setNewPrice] = useState(0);
    const [shares, setShares] = useState(0);
    const [avgPrice, setAvgPrice] = useState(0);
    const [costUsd, setCostUsd] = useState(0);
    const [feeUsd, setFeeUsd] = useState(0);
    const [feePercent, setFeePercent] = useState(0);
    const [maxProfit, setMaxProfit] = useState(0);
    const [maxProfitPct, setMaxProfitPct] = useState(0);
    const [maxPayout, setMaxPayout] = useState(0);

    const resetPreview = useCallback(() => {
        const base = getActualBasePrice();
        setCurrentPrice(side === 'yes' ? clamp(base, 0, 1) : clamp(1 - base, 0, 1));
        setNewPrice(side === 'yes' ? clamp(base, 0, 1) : clamp(1 - base, 0, 1));
        setShares(0);
        setAvgPrice(0);
        setCostUsd(0);
        setFeeUsd(0);
        setFeePercent(tradeMode === 'buy' ? totalFeeBps / 10000 : 0);
        setMaxProfit(0);
        setMaxProfitPct(0);
        setMaxPayout(0);
    }, [getActualBasePrice, side, tradeMode, totalFeeBps]);

    useEffect(() => {
        if (!amount || parseFloat(amount) <= 0 || bE18 === 0n) {
            resetPreview();
            return;
        }
        try {
            if (tradeMode === 'buy') {
                const usdcIn = parseUnits(amount, 6);
                if (usdcIn <= 0n) { resetPreview(); return; }

                const feeT = usdcIn * BigInt(feeTreasuryBps) / 10_000n;
                const feeV = usdcIn * BigInt(feeVaultBps) / 10_000n;
                const feeL = usdcIn * BigInt(feeLpBps) / 10_000n;
                const net = usdcIn - feeT - feeV - feeL;
                if (net <= 0n) { resetPreview(); return; }

                const netE18 = net * USDC_TO_E18;
                const baseSide = side === 'yes' ? qYes : qNo;
                const baseOther = side === 'yes' ? qNo : qYes;
                const tokensOut = findSharesOut(baseSide, baseOther, netE18, bE18);
                if (tokensOut <= 0n) { resetPreview(); return; }

                const sharesNum = parseFloat(formatUnits(tokensOut, 18));
                const grossUsd = parseFloat(formatUnits(usdcIn, 6));
                const feeUsdValue = parseFloat(formatUnits(feeT + feeV + feeL, 6));

                const newQYes = side === 'yes' ? qYes + tokensOut : qYes;
                const newQNo = side === 'yes' ? qNo : qNo + tokensOut;
                const newPriceYes = parseFloat(formatUnits(spotPriceYesE18(newQYes, newQNo, bE18), 18));

                const avgPriceGross = sharesNum > 0 ? grossUsd / sharesNum : 0;
                const maxPayoutValue = sharesNum;
                const rawMaxProfit = maxPayoutValue - grossUsd;

                const actualBase = getActualBasePrice();
                setCurrentPrice(side === 'yes' ? clamp(actualBase, 0, 1) : clamp(1 - actualBase, 0, 1));
                setNewPrice(side === 'yes' ? clamp(newPriceYes, 0, 1) : clamp(1 - newPriceYes, 0, 1));
                setShares(sharesNum);
                setAvgPrice(avgPriceGross);
                setCostUsd(grossUsd);
                setFeeUsd(feeUsdValue);
                setFeePercent(totalFeeBps / 10000);
                setMaxProfit(rawMaxProfit > 0 ? rawMaxProfit : 0);
                setMaxProfitPct(grossUsd > 0 ? (rawMaxProfit / grossUsd) * 100 : 0);
                setMaxPayout(maxPayoutValue);
            } else {
                const tokensIn = parseUnits(amount, 18);
                if (tokensIn <= 0n) { resetPreview(); return; }
                if ((side === 'yes' && tokensIn > qYes) || (side === 'no' && tokensIn > qNo)) { resetPreview(); return; }

                const oldCost = costFunction(qYes, qNo, bE18);
                const newQYes = side === 'yes' ? qYes - tokensIn : qYes;
                const newQNo = side === 'yes' ? qNo : qNo - tokensIn;
                const newCost = costFunction(newQYes, newQNo, bE18);
                const refundE18 = oldCost - newCost;
                if (refundE18 <= 0n) { resetPreview(); return; }

                const usdcOut = refundE18 / USDC_TO_E18;
                const newPriceYes = parseFloat(formatUnits(spotPriceYesE18(newQYes, newQNo, bE18), 18));
                const sharesNum = parseFloat(formatUnits(tokensIn, 18));
                const payout = parseFloat(formatUnits(usdcOut, 6));
                const avgPrice = sharesNum > 0 ? payout / sharesNum : 0;

                const actualBase = getActualBasePrice();
                setCurrentPrice(side === 'yes' ? clamp(actualBase, 0, 1) : clamp(1 - actualBase, 0, 1));
                setNewPrice(side === 'yes' ? clamp(newPriceYes, 0, 1) : clamp(1 - newPriceYes, 0, 1));
                setShares(sharesNum);
                setAvgPrice(avgPrice);
                setCostUsd(payout);
                setFeeUsd(0);
                setFeePercent(0);
                setMaxProfit(0);
                setMaxProfitPct(0);
                setMaxPayout(payout);
            }
        } catch (e) {
            console.error('Preview error', e);
            resetPreview();
        }
    }, [amount, tradeMode, side, qYes, qNo, bE18, feeTreasuryBps, feeVaultBps, feeLpBps, totalFeeBps, resetPreview, getActualBasePrice]);

    return {
        currentPrice,
        newPrice,
        shares,
        avgPrice,
        costUsd,
        feeUsd,
        feePercent,
        maxProfit,
        maxProfitPct,
        maxPayout,
    };
}
