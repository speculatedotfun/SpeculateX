'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Activity } from 'lucide-react';
import { PriceDisplay } from '@/components/market/PriceDisplay';
import { Sparkline } from '@/components/market/Sparkline';
import { useState, useEffect } from 'react';

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

// --- Helper Component: Countdown ---
function MarketCountdown({ expiryTimestamp, isResolved }: { expiryTimestamp: bigint, isResolved: boolean }) {
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    useEffect(() => {
        if (expiryTimestamp === 0n) { setTimeRemaining('N/A'); return; }

        const updateCountdown = () => {
            if (isResolved) { setTimeRemaining('Ended'); return; }

            const now = Math.floor(Date.now() / 1000);
            const expiry = Number(expiryTimestamp);
            const secondsRemaining = expiry - now;

            if (secondsRemaining <= 0) { setTimeRemaining('Expired'); return; }

            const days = Math.floor(secondsRemaining / 86400);
            const hours = Math.floor((secondsRemaining % 86400) / 3600);
            const minutes = Math.floor((secondsRemaining % 3600) / 60);

            if (days > 0) setTimeRemaining(`${days}d ${hours}h`);
            else if (hours > 0) setTimeRemaining(`${hours}h ${minutes}m`);
            else setTimeRemaining(`${minutes}m`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000);
        return () => clearInterval(interval);
    }, [expiryTimestamp, isResolved]);

    let colorClass = "text-gray-500 dark:text-gray-400";
    let bgClass = "bg-gray-100 dark:bg-gray-700/50";

    if (timeRemaining === 'Expired') {
        colorClass = "text-orange-600 dark:text-orange-400";
        bgClass = "bg-orange-100 dark:bg-orange-500/10";
    }
    if (isResolved || timeRemaining === 'Ended') {
        colorClass = "text-purple-600 dark:text-purple-400";
        bgClass = "bg-purple-100 dark:bg-purple-500/10";
    }

    return (
        <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${bgClass} ${colorClass}`}
            role="status"
        >
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>{timeRemaining}</span>
        </div>
    );
}

export function MarketCard({ market, prefersReducedMotion = false, getMarketLogo, formatNumber }: MarketCardProps) {
    return (
        <Link
            href={`/markets/${market.id}`}
            className="block h-full group"
            aria-label={`Market ${market.id}: ${market.question}`}
        >
            <motion.div
                className="h-full bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-1 border border-white/20 dark:border-white/5 hover:border-teal-500/30 dark:hover:border-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-500 flex flex-col relative overflow-hidden group/card"
                whileHover={prefersReducedMotion ? {} : { y: -6 }}
            >

                {/* Inner Card Content */}
                <div className="flex-1 p-3 flex flex-col relative z-10">

                    {/* Top Section: Logo & Status */}
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <div className="relative">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-[#151c32] border border-gray-100 dark:border-gray-700/50 flex items-center justify-center shrink-0 shadow-sm group-hover/card:scale-110 transition-transform duration-500 z-10 relative">
                                {market.question ? (
                                    <Image
                                        src={getMarketLogo(market.question)}
                                        alt="Logo"
                                        width={30}
                                        height={30}
                                        className="object-contain w-6 h-6 sm:w-[30px] sm:h-[30px]"
                                        unoptimized
                                    />
                                ) : <div className="text-lg sm:text-xl">📈</div>}
                            </div>
                            {/* Icon Glow */}
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                        </div>

                        <div className="flex items-center gap-2">
                            {market.status === 'SCHEDULED' && (
                                <div className="px-2 sm:px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-1.5 shadow-sm">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Scheduled</span>
                                </div>
                            )}
                            {market.status === 'LIVE TRADING' && (
                                <div className="px-2 sm:px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center gap-1.5 shadow-sm backdrop-blur-md">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Live</span>
                                </div>
                            )}
                            {(market.status === 'EXPIRED' || market.status === 'RESOLVED' || market.status === 'CANCELLED') && (
                                <div className={`px-2 sm:px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-sm ${market.status === 'RESOLVED'
                                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
                                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                                    }`}>
                                    {market.status === 'RESOLVED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">
                                        {market.status === 'RESOLVED' ? 'Resolved' : market.status === 'CANCELLED' ? 'Cancelled' : 'Expired'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Question */}
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-snug line-clamp-2 mb-2 sm:mb-3 group-hover/card:text-teal-500 transition-colors">
                        {market.question}
                    </h3>

                    {/* Sparkline (Subtle) */}
                    <div className="mb-4 h-[32px] flex items-end opacity-60 group-hover/card:opacity-100 transition-opacity">
                        {market.priceHistory && market.priceHistory.length >= 2 ? (
                            <Sparkline
                                data={market.priceHistory}
                                color={market.yesPrice > (market.priceHistory[0] || 0) ? '#14B8A6' : '#ef4444'}
                            />
                        ) : (
                            <div className="w-full h-[2px] bg-gray-100 dark:bg-gray-800 rounded-full" />
                        )}
                    </div>

                    <div className="mt-auto space-y-4">
                        {/* Price Cards */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center group-hover/card:border-emerald-500/30 transition-colors relative overflow-hidden">
                                <div className="absolute inset-0 bg-emerald-500/0 group-hover/card:bg-emerald-500/5 transition-colors" />
                                <span className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase mb-1">Yes</span>
                                <PriceDisplay
                                    price={market.yesPrice}
                                    priceClassName="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter"
                                />
                            </div>
                            <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 dark:border-rose-500/20 rounded-xl p-3 flex flex-col items-center justify-center group-hover/card:border-rose-500/30 transition-colors relative overflow-hidden">
                                <div className="absolute inset-0 bg-rose-500/0 group-hover/card:bg-rose-500/5 transition-colors" />
                                <span className="text-[9px] font-bold text-rose-600/70 dark:text-rose-400/70 uppercase mb-1">No</span>
                                <PriceDisplay
                                    price={market.noPrice}
                                    priceClassName="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono tracking-tighter"
                                />
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-2 py-1 rounded-lg">
                                <Activity className="w-3 h-3" aria-hidden="true" />
                                <span>${formatNumber(market.volume)} Vol</span>
                            </div>
                            <MarketCountdown expiryTimestamp={market.expiryTimestamp} isResolved={market.isResolved} />
                        </div>
                    </div>

                </div>
            </motion.div>
        </Link>
    );
}
