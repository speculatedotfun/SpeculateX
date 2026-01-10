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

    return (
        <span className="text-[10px] font-medium text-gray-400">
            {timeRemaining}
        </span>
    );
}

export function MarketCard({ market, prefersReducedMotion = false, getMarketLogo, formatNumber }: MarketCardProps) {
    return (
        <Link
            href={`/markets/${market.id}`}
            className="block group"
            aria-label={`Market ${market.id}: ${market.question}`}
        >
            <motion.div
                className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:border-teal-500/30 hover:shadow-lg transition-all duration-200"
                whileHover={prefersReducedMotion ? {} : { y: -2 }}
            >
                {/* Header: Logo + Status */}
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0">
                        {market.question ? (
                            <Image
                                src={getMarketLogo(market.question)}
                                alt="Logo"
                                width={24}
                                height={24}
                                className="object-contain"
                                unoptimized
                            />
                        ) : <div className="text-lg">📈</div>}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {market.status === 'LIVE TRADING' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10">
                                    <span className="w-1 h-1 rounded-full bg-teal-500 animate-pulse" />
                                    LIVE
                                </span>
                            )}
                            {market.status === 'RESOLVED' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    RESOLVED
                                </span>
                            )}
                            {(market.status === 'EXPIRED' || market.status === 'CANCELLED') && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800">
                                    {market.status === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED'}
                                </span>
                            )}
                        </div>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-teal-600 transition-colors">
                            {market.question}
                        </h3>
                    </div>
                </div>

                {/* Sparkline */}
                <div className="h-[28px] mb-3 opacity-50 group-hover:opacity-100 transition-opacity">
                    {market.priceHistory && market.priceHistory.length >= 2 ? (
                        <Sparkline
                            data={market.priceHistory}
                            color={market.yesPrice > (market.priceHistory[0] || 0) ? '#14B8A6' : '#ef4444'}
                        />
                    ) : (
                        <div className="w-full h-[2px] bg-gray-100 dark:bg-gray-800 rounded-full mt-3" />
                    )}
                </div>

                {/* Prices Row */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg py-2 px-3 text-center">
                        <span className="text-[9px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase block mb-0.5">Yes</span>
                        <PriceDisplay
                            price={market.yesPrice}
                            priceClassName="text-base font-bold text-emerald-600 dark:text-emerald-400"
                        />
                    </div>
                    <div className="flex-1 bg-rose-500/5 border border-rose-500/10 rounded-lg py-2 px-3 text-center">
                        <span className="text-[9px] font-bold text-rose-600/60 dark:text-rose-400/60 uppercase block mb-0.5">No</span>
                        <PriceDisplay
                            price={market.noPrice}
                            priceClassName="text-base font-bold text-rose-600 dark:text-rose-400"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>${formatNumber(market.volume)} Vol</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <MarketCountdown expiryTimestamp={market.expiryTimestamp} isResolved={market.isResolved} />
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
