'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Trading components
import { OutcomeSelector } from './trading/OutcomeSelector';
import { TradeAmountInput } from './trading/TradeAmountInput';
import { TradePreview } from './trading/TradePreview';
import { TradeActionButtons } from './trading/TradeActionButtons';

// Hooks
import { useMarketContractData } from './trading/useMarketContractData';
import { useMarketLogic } from './trading/useMarketLogic';
import { useTrading } from './trading/useTrading';
import { useTradePreview } from './trading/useTradePreview';
import { toBigIntSafe, formatBalanceDisplay } from '@/lib/tradingUtils';

interface QuickBuyModalProps {
    isOpen: boolean;
    onClose: () => void;
    marketId: number;
    initialSide: 'yes' | 'no';
    question: string;
    logoUrl: string;
    yesPrice: number;
    noPrice: number;
}

// LMSR helper
function spotPriceYesE18(qYes: bigint, qNo: bigint, bE18: bigint): bigint {
    if (bE18 === 0n) return 5n * 10n ** 17n;
    const qYesNum = Number(qYes) / 1e18;
    const qNoNum = Number(qNo) / 1e18;
    const bNum = Number(bE18) / 1e18;
    const expYes = Math.exp(qYesNum / bNum);
    const expNo = Math.exp(qNoNum / bNum);
    return BigInt(Math.floor((expYes / (expYes + expNo)) * 1e18));
}

export function QuickBuyModal({
    isOpen,
    onClose,
    marketId,
    initialSide,
    question,
    logoUrl,
    yesPrice,
    noPrice,
}: QuickBuyModalProps) {
    const { isConnected } = useAccount();
    const [side, setSide] = useState<'yes' | 'no'>(initialSide);
    const [amount, setAmount] = useState('');
    const marketIdBI = useMemo(() => BigInt(marketId), [marketId]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSide(initialSide);
            setAmount('');
        }
    }, [isOpen, initialSide]);

    // Data Hook
    const {
        contractData,
        marketStateData,
        resolutionData,
        usdcBalanceData,
        usdcAllowanceData,
        yesBalanceData,
        noBalanceData,
        refetchAll,
        isLoading,
    } = useMarketContractData(marketId, marketIdBI);

    // Logic Hook
    const {
        qYes,
        qNo,
        bE18,
        feeTreasuryBps,
        feeLpBps,
        feeVaultBps,
        totalFeeBps,
        isTradeable,
        tradeDisabledReason,
        maxJumpE6,
    } = useMarketLogic({ contractData, marketStateData, resolutionData });

    // Derived State
    const usdcBalanceRaw = toBigIntSafe(usdcBalanceData);
    const yesBalanceRaw = toBigIntSafe(yesBalanceData);
    const noBalanceRaw = toBigIntSafe(noBalanceData);
    const usdcAllowanceValue = toBigIntSafe(usdcAllowanceData);

    const usdcBalance = formatBalanceDisplay(usdcBalanceRaw, 6);
    const yesBalance = formatBalanceDisplay(yesBalanceRaw, 18);
    const noBalance = formatBalanceDisplay(noBalanceRaw, 18);

    const amountRegex = useMemo(() => /^\d*(?:\.\d{0,6})?$/, []);
    const amountBigInt = useMemo(() => {
        try {
            return amount ? BigInt(Math.floor(parseFloat(amount) * 1e6)) : 0n;
        } catch {
            return 0n;
        }
    }, [amount]);

    const canBuy = usdcBalanceRaw >= amountBigInt;

    // Trading Hook
    const {
        pendingTrade,
        busyLabel,
        handleTrade,
    } = useTrading({
        marketId,
        marketIdBI,
        tradeMode: 'buy',
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
        onTradeSuccess: () => {
            onClose();
        },
    });

    // Preview Hook
    const {
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
    } = useTradePreview({
        amount,
        tradeMode: 'buy',
        side,
        qYes,
        qNo,
        bE18,
        feeTreasuryBps,
        feeVaultBps,
        feeLpBps,
        totalFeeBps,
        getActualBasePrice: () => {
            const priceE18 = spotPriceYesE18(qYes, qNo, bE18);
            return parseFloat(formatUnits(priceE18, 18));
        }
    });

    const isBusy = pendingTrade;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Modal Container with Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={(e) => e.target === e.currentTarget && onClose()}
                    >
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden w-full max-w-md max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                            <Image
                                                src={logoUrl}
                                                alt=""
                                                width={24}
                                                height={24}
                                                className="object-contain"
                                                unoptimized
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                                                {question}
                                            </h2>
                                            <Link
                                                href={`/markets/${marketId}`}
                                                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-1"
                                            >
                                                View full market <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            {isLoading ? (
                                <div className="p-6 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="p-4 space-y-4">
                                    {/* YES / NO Selector */}
                                    <OutcomeSelector
                                        side={side}
                                        setSide={setSide}
                                        priceYes={parseFloat(formatUnits(spotPriceYesE18(qYes, qNo, bE18), 18))}
                                        priceNo={1 - parseFloat(formatUnits(spotPriceYesE18(qYes, qNo, bE18), 18))}
                                        yesBalance={yesBalance}
                                        noBalance={noBalance}
                                        isBusy={isBusy}
                                        isTradeable={isTradeable}
                                    />

                                    {/* Amount Input */}
                                    <TradeAmountInput
                                        amount={amount}
                                        setAmount={setAmount}
                                        tradeMode="buy"
                                        side={side}
                                        usdcBalance={usdcBalance}
                                        yesBalance={yesBalance}
                                        noBalance={noBalance}
                                        usdcBalanceRaw={usdcBalanceRaw}
                                        yesBalanceRaw={yesBalanceRaw}
                                        noBalanceRaw={noBalanceRaw}
                                        canBuy={canBuy}
                                        canSell={false}
                                        isTradeable={isTradeable}
                                        amountRegex={amountRegex}
                                    />

                                    {/* Preview */}
                                    {amount && parseFloat(amount) > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">You'll receive</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">
                                                        ~{shares.toFixed(2)} {side.toUpperCase()} shares
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Avg price</span>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                        {(avgPrice * 100).toFixed(1)}¢
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Max payout</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        ${maxPayout.toFixed(2)} (+{maxProfitPct.toFixed(0)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Action Button */}
                                    <TradeActionButtons
                                        isConnected={isConnected}
                                        isBusy={isBusy}
                                        isTradeable={isTradeable}
                                        tradeMode="buy"
                                        side={side}
                                        amount={amount}
                                        canBuy={canBuy}
                                        canSell={false}
                                        usdcAllowanceValue={usdcAllowanceValue}
                                        amountBigInt={amountBigInt}
                                        busyLabel={busyLabel}
                                        handleTrade={handleTrade}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
