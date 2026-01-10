'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

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
        ? "bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl border-white/20 dark:border-white/5 shadow-2xl rounded-[32px]"
        : "bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700 shadow-2xl shadow-[#14B8A6]/10 rounded-2xl";

    return (
        <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.2 }}
            className="relative w-full z-20 mt-6 mb-8 flex justify-center"
            role="region"
            aria-label="Platform statistics"
        >
            {/* Container Card */}
            <div className={`${backgroundClass} border overflow-hidden relative min-h-[80px] sm:min-h-[120px] flex items-center max-w-7xl w-full mx-auto transition-colors duration-300`}>

                {/* Left Decoration Image - Hidden on Mobile */}
                {!hideDecorations && (
                    <div className="hidden sm:block absolute left-0 bottom-0 top-0 w-28 sm:w-40 md:w-52 lg:w-64 pointer-events-none">
                        <Image
                            src="/leftside.png"
                            alt=""
                            fill
                            className="object-contain object-left-bottom"
                            priority
                        />
                    </div>
                )}

                {/* Right Decoration Image - Hidden on Mobile */}
                {!hideDecorations && (
                    <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-28 sm:w-40 md:w-52 lg:w-64 pointer-events-none">
                        <Image
                            src="/rightside.png"
                            alt=""
                            fill
                            className="object-contain object-right-top"
                            priority
                        />
                    </div>
                )}

                {/* Stats Content (Centered) */}
                <div className="relative z-10 w-full flex flex-row justify-around items-center gap-2 sm:gap-8 py-4 px-2 sm:px-10 md:px-20 lg:px-24">

                    {/* Stat 1: Volume */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.3, duration: prefersReducedMotion ? 0 : 0.5 }}
                        className="flex flex-col items-center text-center group"
                    >
                        <span className="text-[10px] sm:text-sm md:text-base font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 sm:mb-2 group-hover:text-teal-500 transition-colors">Liquidity</span>
                        {loading ? (
                            <div className="h-8 sm:h-10 w-16 sm:w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        ) : (
                            <motion.span
                                initial={prefersReducedMotion ? false : { scale: 0.5 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: prefersReducedMotion ? 0 : 0.4, type: "spring", stiffness: 200 }}
                                className="text-xl sm:text-3xl md:text-4xl font-black text-[#0f0a2e] dark:text-white tracking-tighter"
                            >
                                {liquidity}
                            </motion.span>
                        )}
                    </motion.div>

                    {/* Divider (Hidden on Mobile) */}
                    <div className="hidden md:block w-px h-14 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent" aria-hidden="true"></div>

                    {/* Stat 2: Active Traders */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.4, duration: prefersReducedMotion ? 0 : 0.5 }}
                        className="flex flex-col items-center text-center group"
                    >
                        <span className="text-[10px] sm:text-sm md:text-base font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 sm:mb-2 group-hover:text-purple-500 transition-colors">Traders</span>
                        {loading ? (
                            <div className="h-8 sm:h-10 w-12 sm:w-18 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        ) : (
                            <motion.span
                                initial={prefersReducedMotion ? false : { scale: 0.5 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: prefersReducedMotion ? 0 : 0.5, type: "spring", stiffness: 200 }}
                                className="text-xl sm:text-3xl md:text-4xl font-black text-[#0f0a2e] dark:text-white tracking-tighter"
                            >
                                {traders}
                            </motion.span>
                        )}
                    </motion.div>

                    {/* Divider (Hidden on Mobile) */}
                    <div className="hidden md:block w-px h-14 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent" aria-hidden="true"></div>

                    {/* Stat 3: Live Markets */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.5, duration: prefersReducedMotion ? 0 : 0.5 }}
                        className="flex flex-col items-center text-center group"
                    >
                        <span className="text-[10px] sm:text-sm md:text-base font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 sm:mb-2 group-hover:text-blue-500 transition-colors">Markets</span>
                        {loading ? (
                            <div className="h-8 sm:h-10 w-10 sm:w-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        ) : (
                            <motion.span
                                initial={prefersReducedMotion ? false : { scale: 0.5 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: prefersReducedMotion ? 0 : 0.6, type: "spring", stiffness: 200 }}
                                className="text-xl sm:text-3xl md:text-4xl font-black text-[#0f0a2e] dark:text-white tracking-tighter"
                            >
                                {liveMarkets}
                            </motion.span>
                        )}
                        {!loading && resolvedMarkets > 0 && (
                            <span className="hidden sm:inline text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">
                                {resolvedMarkets} resolved
                            </span>
                        )}
                    </motion.div>

                </div>
            </div>
        </motion.div>
    );
}
