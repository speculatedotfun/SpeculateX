'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkline } from '@/components/market/Sparkline';
import { MarketCardData } from './MarketCard';
import { useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useAddresses } from '@/lib/contracts';

interface FeaturedMarketCardProps {
    market: MarketCardData;
    prefersReducedMotion?: boolean;
    getMarketLogo: (question?: string | null) => string;
    formatNumber: (value: number) => string;
}

function getTimeRemaining(timestamp: bigint): string {
    if (timestamp === 0n) return '';
    const now = Math.floor(Date.now() / 1000);
    const expiry = Number(timestamp);
    const seconds = expiry - now;
    if (seconds <= 0) return 'Expired';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
}

export function FeaturedMarketCard({ market, prefersReducedMotion = false, getMarketLogo, formatNumber }: FeaturedMarketCardProps) {
    const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
    const addresses = useAddresses();
    const usdcDecimals = addresses.usdcDecimals ?? 6;

    const isAuto = market.oracleType === 1;
    const isLive = market.status === 'LIVE TRADING';
    const timeLeft = useMemo(() => getTimeRemaining(market.expiryTimestamp), [market.expiryTimestamp]);
    const volumeDisplay = `$${formatNumber(market.volume)}`;
    const liquidityValue = typeof market.totalPairsUSDC === 'bigint' ? market.totalPairsUSDC : BigInt(market.totalPairsUSDC || 0);
    const liquidityDisplay = `$${formatNumber(Number(formatUnits(liquidityValue, usdcDecimals)))}`;

    const yesLeading = market.yesPrice >= 0.5;
    const leadingPercent = Math.round((yesLeading ? market.yesPrice : market.noPrice) * 100);

    const yesCents = (market.yesPrice * 100).toFixed(1);
    const noCents = (market.noPrice * 100).toFixed(1);

    const priceHistory = market.priceHistory || [];
    const stats24h = useMemo(() => {
        if (priceHistory.length === 0) return { high: market.yesPrice, low: market.yesPrice, change: 0, changePct: 0 };
        const high = Math.max(...priceHistory);
        const low = Math.min(...priceHistory);
        const firstPrice = priceHistory[0] || market.yesPrice;
        const change = market.yesPrice - firstPrice;
        const changePct = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
        return { high, low, change, changePct };
    }, [priceHistory, market.yesPrice]);

    const isPositiveChange = stats24h.changePct >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full"
        >
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                    {/* LEFT - White background content */}
                    <div className="flex-1 px-6 pt-6 pb-0">
                        {/* Logo + Question */}
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 -mt-0.5">
                                {market.question ? (
                                    <Image
                                        src={getMarketLogo(market.question)}
                                        alt=""
                                        width={18}
                                        height={18}
                                        className="object-contain"
                                        unoptimized
                                    />
                                ) : <span className="text-xs">📈</span>}
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                                {market.question}
                            </h2>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-4">
                            {isLive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-gray-200/60 dark:border-gray-700/60">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] leading-none font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Live</span>
                                </span>
                            )}
                            {isAuto && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] leading-none font-semibold text-gray-500 dark:text-gray-400 uppercase">Auto</span>
                                </span>
                            )}
                        </div>

                        {/* 70% Chance */}
                        <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-[40px] font-bold text-emerald-500 tabular-nums leading-none">
                                {leadingPercent}%
                            </span>
                            <span className="text-lg text-gray-400 font-medium">Chance</span>
                        </div>

                        {/* YES / NO Segmented Selector */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                <button
                                    onClick={() => setSelectedSide('yes')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedSide === 'yes'
                                            ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                        }`}
                                >
                                    YES {yesCents}¢
                                </button>
                                <button
                                    onClick={() => setSelectedSide('no')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedSide === 'no'
                                            ? 'bg-white dark:bg-gray-700 text-rose-500 dark:text-rose-400 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                        }`}
                                >
                                    NO {noCents}¢
                                </button>
                            </div>
                            <span className="text-gray-400 text-sm">Pays $1 if correct</span>
                        </div>

                        {/* Bottom Stats + Trade Button */}
                        <div className="flex items-center justify-between pt-4 pb-3 px-6 -mx-6 mt-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-5 text-xs text-gray-400">
                                <span>Vol: <span className="font-medium text-gray-600 dark:text-gray-300">{volumeDisplay}</span></span>
                                <span>Liq: <span className="font-medium text-gray-600 dark:text-gray-300">{liquidityDisplay}</span></span>
                                <span>Ends in: <span className="font-medium text-gray-600 dark:text-gray-300">{timeLeft}</span></span>
                            </div>
                            <Link
                                href={`/markets/${market.id}?side=${selectedSide}`}
                                className={`px-5 py-1.5 rounded-full font-semibold text-xs shadow-sm transition-all ${selectedSide === 'yes'
                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                        : 'bg-rose-500 hover:bg-rose-600 text-white'
                                    }`}
                            >
                                Trade {selectedSide.toUpperCase()}
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT - Gray chart panel */}
                    <div className="lg:w-[220px] bg-gray-50 dark:bg-gray-800/50 lg:border-l border-t lg:border-t-0 border-gray-100 dark:border-gray-800 p-5">
                        <div className="flex items-start justify-between mb-3">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Last 24 Hours</span>
                            <span className={`text-base font-bold ${isPositiveChange ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isPositiveChange ? '+' : ''}{stats24h.changePct.toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-[80px] mb-4">
                            <Sparkline
                                data={priceHistory}
                                color={isPositiveChange ? '#10B981' : '#F43F5E'}
                                height={80}
                                strokeWidth={2}
                            />
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">High</span>
                                <span className="font-medium text-gray-700 dark:text-gray-200">{(stats24h.high * 100).toFixed(1)}¢</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Low</span>
                                <span className="font-medium text-emerald-500">{isPositiveChange ? '+' : ''}{(stats24h.low * 100).toFixed(1)}¢</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Change</span>
                                <span className={`font-medium ${isPositiveChange ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isPositiveChange ? '+' : ''}{stats24h.changePct.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
