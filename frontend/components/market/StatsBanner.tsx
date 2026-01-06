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
}

export function StatsBanner({
    liquidity,
    traders,
    liveMarkets,
    resolvedMarkets,
    expiredMarkets,
    loading = false,
    prefersReducedMotion = false
}: StatsBannerProps) {
    return (
        <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.2 }}
            className="relative w-full z-20 mt-8 mb-10 flex justify-center"
            role="region"
            aria-label="Platform statistics"
        >
            {/* Container Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-[#14B8A6]/10 border border-gray-100 dark:border-gray-700 overflow-hidden relative min-h-[130px] flex items-center max-w-7xl w-full mx-auto">

                {/* Left Decoration Image - Restored */}
                <div className="absolute left-0 bottom-0 top-0 w-28 sm:w-40 md:w-52 lg:w-64 pointer-events-none">
                    <Image
                        src="/leftside.png"
                        alt=""
                        fill
                        className="object-contain object-left-bottom"
                        priority
                    />
                </div>

                {/* Right Decoration Image - Restored */}
                <div className="absolute right-0 top-0 bottom-0 w-28 sm:w-40 md:w-52 lg:w-64 pointer-events-none">
                    <Image
                        src="/rightside.png"
                        alt=""
                        fill
                        className="object-contain object-right-top"
                        priority
                    />
                </div>

                {/* Stats Content (Centered) */}
                <div className="relative z-10 w-full flex flex-col md:flex-row justify-around items-center gap-8 py-4 px-10 md:px-20 lg:px-24">

                    {/* Stat 1: Volume */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.3, duration: prefersReducedMotion ? 0 : 0.5 }}
                        className="flex flex-col items-center text-center group"
                    >
                        <span className="text-sm md:text-base font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5 group-hover:text-teal-500 transition-colors">Total Liquidity</span>
                        {loading ? (
                            <div className="h-12 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        ) : (
                            <motion.span
                                initial={prefersReducedMotion ? false : { scale: 0.5 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: prefersReducedMotion ? 0 : 0.4, type: "spring", stiffness: 200 }}
                                className="text-3xl md:text-4xl font-black text-[#0f0a2e] dark:text-white tracking-tighter"
                            >
                                {liquidity}
                            </motion.span>
                        )}
                    </motion.div>

                    {/* Divider (Hidden on Mobile) */}
                    <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent" aria-hidden="true"></div>

                    {/* Stat 2: Active Traders */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.4, duration: prefersReducedMotion ? 0 : 0.5 }}
                        className="flex flex-col items-center text-center group"
                    >
                        <span className="text-sm md:text-base font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5 group-hover:text-purple-500 transition-colors">Active Traders</span>
                        {loading ? (
                            <div className="h-12 w-18 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        ) : (
                            <motion.span
                                initial={prefersReducedMotion ? false : { scale: 0.5 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: prefersReducedMotion ? 0 : 0.5, type: "spring", stiffness: 200 }}
                                className="text-3xl md:text-4xl font-black text-[#0f0a2e] dark:text-white tracking-tighter"
                            >
                                {traders}
                            </motion.span>
                        )}
                    </motion.div>

                    {/* Divider (Hidden on Mobile) */}
                    <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent" aria-hidden="true"></div>

                    {/* Stat 3: Live Markets */}
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.5, duration: prefersReducedMotion ? 0 : 0.5 }}
                        className="flex flex-col items-center text-center group"
                    >
                        <span className="text-sm md:text-base font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5 group-hover:text-blue-500 transition-colors">Live Markets</span>
                        {loading ? (
                            <div className="h-12 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                        ) : (
                            <motion.span
                                initial={prefersReducedMotion ? false : { scale: 0.5 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: prefersReducedMotion ? 0 : 0.6, type: "spring", stiffness: 200 }}
                                className="text-3xl md:text-4xl font-black text-[#0f0a2e] dark:text-white tracking-tighter"
                            >
                                {liveMarkets}
                            </motion.span>
                        )}
                        {!loading && resolvedMarkets > 0 && (
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1">
                                {resolvedMarkets} resolved
                            </span>
                        )}
                    </motion.div>

                </div>
            </div>
        </motion.div>
    );
}
