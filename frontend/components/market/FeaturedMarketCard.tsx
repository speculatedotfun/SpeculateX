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
        <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-purple-500/20 to-blue-500/20 rounded-[40px] blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

            <Link href={`/markets/${market.id}`} className="block relative">
                <motion.div
                    whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative overflow-hidden rounded-[32px] bg-white/90 dark:bg-[#131722]/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl"
                >
                    <div className="grid lg:grid-cols-12 gap-0">
                        {/* Left Content Section */}
                        <div className="lg:col-span-7 p-4 sm:p-8 flex flex-col justify-between relative z-10">

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
                                        <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Trending Now</span>
                                    </div>
                                    {market.status === 'LIVE TRADING' && (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                                            </span>
                                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Live</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-[#1c2339] shadow-lg border border-gray-100 dark:border-gray-700 p-2 sm:p-3 flex items-center justify-center">
                                            {market.question ? (
                                                <Image
                                                    src={getMarketLogo(market.question)}
                                                    alt="Logo"
                                                    width={48}
                                                    height={48}
                                                    className="object-contain w-8 h-8 sm:w-12 sm:h-12"
                                                    unoptimized
                                                />
                                            ) : <div className="text-2xl sm:text-3xl">🔥</div>}
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-teal-400 group-hover:to-blue-500 transition-all duration-300 line-clamp-2">
                                            {market.question}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                <span>${formatNumber(market.volume)} Volume</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                <span>Ends {new Date(Number(market.expiryTimestamp) * 1000).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 sm:mt-8 sm:pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center justify-between">
                                <div className="flex items-center gap-4 sm:gap-8">
                                    <div>
                                        <p className="text-[10px] sm:text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase mb-1">Yes Price</p>
                                        <PriceDisplay price={market.yesPrice} priceClassName="text-2xl sm:text-4xl font-black text-emerald-500 dark:text-emerald-400 tracking-tighter" />
                                    </div>
                                    <div className="w-px h-8 sm:h-10 bg-gray-200 dark:bg-gray-700"></div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs font-bold text-rose-600/70 dark:text-rose-400/70 uppercase mb-1">No Price</p>
                                        <PriceDisplay price={market.noPrice} priceClassName="text-2xl sm:text-4xl font-black text-rose-500 dark:text-rose-400 tracking-tighter" />
                                    </div>
                                </div>

                                <div className="hidden sm:flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold group-hover:translate-x-1 transition-transform">
                                    Trade this market <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>

                        </div>

                        {/* Right Graphic Section */}
                        <div className="lg:col-span-5 relative min-h-[200px] lg:min-h-0 bg-gray-50 dark:bg-[#0f1219] flex items-center justify-center p-8 overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent"></div>

                            {/* Large Chart Visualization */}
                            <div className="w-full h-full max-h-[200px] relative z-10">
                                <Sparkline
                                    data={market.priceHistory || []}
                                    color={isPositive ? '#14B8A6' : '#ef4444'}
                                    width={400} // Approximate
                                    height={150}
                                    strokeWidth={3}
                                />
                            </div>

                            {/* Decorative Elements */}
                            <div className="absolute top-4 right-4 text-[10px] font-mono text-gray-400 dark:text-gray-600 bg-white dark:bg-black/50 px-2 py-1 rounded">
                                LIVE CHART
                            </div>
                        </div>
                    </div>
                </motion.div>
            </Link>
        </div>
    );
}
