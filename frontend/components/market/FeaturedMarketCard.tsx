'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Activity, ArrowRight } from 'lucide-react';
import { PriceDisplay } from '@/components/market/PriceDisplay';
import { Sparkline } from '@/components/market/Sparkline';
import { MarketCardData } from './MarketCard';

interface FeaturedMarketCardProps {
    market: MarketCardData;
    prefersReducedMotion?: boolean;
    getMarketLogo: (question?: string | null) => string;
    formatNumber: (value: number) => string;
}

export function FeaturedMarketCard({ market, prefersReducedMotion = false, getMarketLogo, formatNumber }: FeaturedMarketCardProps) {
    const isPositive = market.yesPrice >= 0.5;

    return (
        <Link href={`/markets/${market.id}`} className="block group">
            <motion.div
                whileHover={prefersReducedMotion ? {} : { y: -2 }}
                className="relative overflow-hidden rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-100 dark:border-gray-800 hover:border-teal-500/30 hover:shadow-lg transition-all duration-200"
            >
                <div className="flex flex-col lg:flex-row">
                    {/* Left Content */}
                    <div className="flex-1 p-4 lg:p-5">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10">
                                <TrendingUp className="w-3 h-3" />
                                TRENDING NOW
                            </span>
                            {market.status === 'LIVE TRADING' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                    LIVE
                                </span>
                            )}
                        </div>

                        {/* Title Row */}
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0">
                                {market.question ? (
                                    <Image
                                        src={getMarketLogo(market.question)}
                                        alt="Logo"
                                        width={28}
                                        height={28}
                                        className="object-contain"
                                        unoptimized
                                    />
                                ) : <div className="text-lg">🔥</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-teal-600 transition-colors mb-1">
                                    {market.question}
                                </h2>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        ${formatNumber(market.volume)} Volume
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Ends {new Date(Number(market.expiryTimestamp) * 1000).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Prices + CTA */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div>
                                    <span className="text-[9px] font-bold text-emerald-600/60 uppercase block mb-0.5">Yes Price</span>
                                    <PriceDisplay price={market.yesPrice} priceClassName="text-xl font-bold text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-rose-600/60 uppercase block mb-0.5">No Price</span>
                                    <PriceDisplay price={market.noPrice} priceClassName="text-xl font-bold text-rose-600 dark:text-rose-400" />
                                </div>
                            </div>
                            <span className="hidden sm:flex items-center gap-1 text-sm font-medium text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform">
                                Trade this market <ArrowRight className="w-4 h-4" />
                            </span>
                        </div>
                    </div>

                    {/* Right Chart */}
                    <div className="lg:w-[280px] h-[100px] lg:h-auto bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center p-4 relative">
                        <div className="w-full h-full max-h-[80px]">
                            <Sparkline
                                data={market.priceHistory || []}
                                color={isPositive ? '#14B8A6' : '#ef4444'}
                                height={80}
                                strokeWidth={2}
                            />
                        </div>
                        <span className="absolute top-2 right-2 text-[8px] font-mono text-gray-400 bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded">
                            LIVE CHART
                        </span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
