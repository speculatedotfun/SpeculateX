'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Sparkline } from '@/components/market/Sparkline';
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';

// --- Types ---
export interface MarketCardData {
    id: number;
    question: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
    yesPercent: number;
    noPercent: number;
    status: 'LIVE TRADING' | 'SCHEDULED' | 'EXPIRED' | 'RESOLVED' | 'CANCELLED';
    totalPairsUSDC: bigint;
    expiryTimestamp: bigint;
    startTime: bigint;
    oracleType: number;
    isResolved: boolean;
    yesWins?: boolean;
    priceHistory?: number[];
    isCancelled?: boolean;
}

interface MarketCardProps {
    market: MarketCardData;
    prefersReducedMotion?: boolean;
    getMarketLogo: (question?: string | null) => string;
    formatNumber: (value: number) => string;
}

// --- Helper: Format Time Remaining ---
function formatTimeRemaining(timestamp: bigint): string {
    if (timestamp === 0n) return '';
    const now = Math.floor(Date.now() / 1000);
    const expiry = Number(timestamp);
    const seconds = expiry - now;
    if (seconds <= 0) return 'Expired';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// --- Helper Hook: Countdown ---
function useCountdown(expiryTimestamp: bigint, isResolved: boolean): string {
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        if (expiryTimestamp === 0n) { setTimeRemaining('N/A'); return; }

        const updateCountdown = () => {
            if (isResolved) { setTimeRemaining('Ended'); return; }
            setTimeRemaining(formatTimeRemaining(expiryTimestamp));
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000);
        return () => clearInterval(interval);
    }, [expiryTimestamp, isResolved]);

    return timeRemaining;
}

export function MarketCard({ market, prefersReducedMotion = false, getMarketLogo, formatNumber }: MarketCardProps) {
    const router = useRouter();
    const isLive = market.status === 'LIVE TRADING';
    const isResolved = market.status === 'RESOLVED';
    const isAuto = market.oracleType === 1;

    const countdown = useCountdown(market.expiryTimestamp, market.isResolved);
    const volumeDisplay = `$${formatNumber(market.volume)}`;
    const liquidityValue = typeof market.totalPairsUSDC === 'bigint' ? market.totalPairsUSDC : BigInt(market.totalPairsUSDC || 0);
    const liquidityDisplay = `$${formatNumber(Number(formatUnits(liquidityValue, 6)))}`;

    // Format prices as cents
    const yesCents = (market.yesPrice * 100).toFixed(1);
    const noCents = (market.noPrice * 100).toFixed(1);

    // Determine trend for sparkline color
    const isUp = market.priceHistory && market.priceHistory.length >= 2
        ? market.yesPrice > (market.priceHistory[0] || 0.5)
        : market.yesPrice > 0.5;

    return (
        <Link
            href={`/markets/${market.id}`}
            className="block group"
            aria-label={`Market ${market.id}: ${market.question}`}
        >
            <motion.div
                className="relative rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
                whileHover={prefersReducedMotion ? {} : { y: -1 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.995 }}
            >
                {/* Main Content Area */}
                <div className="p-4">
                    {/* Row 1: Logo + Badges */}
                    <div className="flex items-center gap-2 mb-2">
                        {/* Logo */}
                        <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                            {market.question ? (
                                <Image
                                    src={getMarketLogo(market.question)}
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="object-contain"
                                    unoptimized
                                />
                            ) : <span className="text-[10px]">📈</span>}
                        </div>

                        {/* Badges */}
                        {isLive && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Live</span>
                            </span>
                        )}
                        {isAuto && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Auto</span>
                            </span>
                        )}
                        {isResolved && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30">
                                <CheckCircle2 className="w-2.5 h-2.5 text-purple-500" />
                                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase">Resolved</span>
                            </span>
                        )}
                    </div>

                    {/* Question Title */}
                    <h3 className="text-[13px] font-medium text-gray-800 dark:text-white leading-snug line-clamp-2 mb-3 min-h-[36px]">
                        {market.question}
                    </h3>

                    {/* YES / NO Pill Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/markets/${market.id}?side=yes`);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                        >
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">YES</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{yesCents}¢</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/markets/${market.id}?side=no`);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                        >
                            <span className="text-xs font-semibold text-rose-500 dark:text-rose-400">NO</span>
                            <span className="text-sm font-bold text-rose-500 dark:text-rose-400 tabular-nums">{noCents}¢</span>
                        </button>
                    </div>
                </div>

                {/* Bottom Stats Bar */}
                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>Vol: <span className="text-gray-600 dark:text-gray-300">{volumeDisplay}</span></span>
                        <span>Liq: <span className="text-gray-600 dark:text-gray-300">{liquidityDisplay}</span></span>
                        {countdown && (
                            <span className="flex items-center gap-1">
                                <span>•</span>
                                <span className="text-gray-600 dark:text-gray-300">{countdown}</span>
                            </span>
                        )}
                    </div>

                    {/* Trade Button */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/markets/${market.id}`);
                        }}
                        className="px-4 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold transition-all"
                    >
                        Trade
                    </button>
                </div>
            </motion.div>
        </Link>
    );
}

// --- Loading Skeleton ---
export function MarketCardSkeleton() {
    return (
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-700/50 animate-pulse overflow-hidden">
            <div className="p-5">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* Title */}
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 mb-1.5" />
                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700 mb-4" />

                {/* Prices */}
                <div className="flex gap-6 mb-5">
                    <div className="h-8 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="h-8 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 flex justify-between">
                <div className="flex gap-3">
                    <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
        </div>
    );
}
