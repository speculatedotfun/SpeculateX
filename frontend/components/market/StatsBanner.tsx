'use client';

import { motion } from 'framer-motion';
import { DollarSign, Users, BarChart3 } from 'lucide-react';

interface StatsBannerProps {
    liquidity: string;
    traders: string;
    liveMarkets: number;
    resolvedMarkets: number;
    expiredMarkets: number;
    loading?: boolean;
    prefersReducedMotion?: boolean;
    hideDecorations?: boolean;
    variant?: 'default' | 'glass';
}

export function StatsBanner({
    liquidity,
    traders,
    liveMarkets,
    resolvedMarkets,
    expiredMarkets,
    loading = false,
    prefersReducedMotion = false,
    hideDecorations = false,
    variant = 'default'
}: StatsBannerProps) {
    const backgroundClass = variant === 'glass'
        ? "bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl border-white/20 dark:border-white/5 shadow-xl"
        : "bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-700/60 shadow-lg shadow-gray-200/50 dark:shadow-black/30";

    return (
        <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.1 }}
            className="relative w-full z-20 mt-6 mb-8 flex justify-center"
            role="region"
            aria-label="Platform statistics"
        >
            {/* Container Card - Clean, no 3D graphics */}
            <div className={`${backgroundClass} border rounded-2xl overflow-hidden relative min-h-[90px] flex items-center max-w-4xl w-full mx-auto transition-colors duration-300`}>

                {/* Stats Content (Centered) */}
                <div className="relative z-10 w-full flex flex-row justify-around items-center gap-4 sm:gap-8 py-5 px-4 sm:px-12">

                    {/* Stat 1: Liquidity */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.2, duration: prefersReducedMotion ? 0 : 0.4 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Liquidity</span>
                        </div>
                        {loading ? (
                            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        ) : (
                            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                {liquidity}
                            </span>
                        )}
                    </motion.div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent" aria-hidden="true" />

                    {/* Stat 2: Traders */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.3, duration: prefersReducedMotion ? 0 : 0.4 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Users className="w-4 h-4 text-purple-500" />
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Traders</span>
                        </div>
                        {loading ? (
                            <div className="h-8 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        ) : (
                            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                {traders}
                            </span>
                        )}
                    </motion.div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent" aria-hidden="true" />

                    {/* Stat 3: Markets */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.4, duration: prefersReducedMotion ? 0 : 0.4 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Markets</span>
                        </div>
                        {loading ? (
                            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        ) : (
                            <div className="flex flex-col items-center">
                                <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {liveMarkets}
                                </span>
                                {resolvedMarkets > 0 && (
                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                                        {resolvedMarkets} resolved
                                    </span>
                                )}
                            </div>
                        )}
                    </motion.div>

                </div>
            </div>
        </motion.div>
    );
}
