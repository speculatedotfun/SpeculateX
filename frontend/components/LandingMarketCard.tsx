'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Zap, Globe } from 'lucide-react';
import { PriceDisplay } from '@/components/market/PriceDisplay';

interface LandingMarketCardProps {
    market: {
        id: number;
        question: string;
        priceYes: number;
        priceNo: number;
        logo: string;
        isActive: boolean;
        isDemo?: boolean;
    };
    loading?: boolean;
}

export function LandingMarketCard({ market, loading }: LandingMarketCardProps) {
    if (loading) {
        return (
            <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl rounded-[32px] p-8 space-y-4 animate-pulse h-full border border-white/20 dark:border-white/5">
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!market) {
        return (
            <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl rounded-[32px] p-8 flex items-center justify-center border border-white/20 dark:border-white/5 h-[300px]">
                <div className="text-gray-400 italic font-medium">No active markets found</div>
            </div>
        );
    }

    return (
        <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl rounded-[32px] p-6 relative group overflow-hidden transition-all duration-500 shadow-2xl border border-white/20 dark:border-white/5 hover:border-teal-500/30 w-full">
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity blur-2xl duration-700" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.5)]"></span>
                    {market.isDemo ? "Demo Market" : "Trending Now"}
                </span>
                <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center gap-1.5 backdrop-blur-md">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Live</span>
                </div>
            </div>

            <Link href={market.isDemo ? "/markets" : `/markets/${market.id}`} className="block relative z-10">
                <h3 className="font-black text-2xl lg:text-3xl text-gray-900 dark:text-white leading-[1.1] mb-8 line-clamp-3 group-hover:text-teal-500 transition-colors duration-300">
                    {market.question}
                </h3>

                <div className="relative pt-6 border-t border-gray-100 dark:border-white/5">
                    <div className="absolute -top-3 left-0 right-0 flex justify-center">
                        <span className="bg-white dark:bg-[#0f1219] px-3 py-0.5 rounded-full text-[10px] font-bold text-gray-400 border border-gray-100 dark:border-gray-800 uppercase tracking-widest shadow-sm">Current Odds</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-4 text-center group/yes hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors relative overflow-hidden">
                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/yes:opacity-100 transition-opacity" />
                            <span className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase block mb-1 group-hover/yes:scale-110 transition-transform">Yes</span>
                            <PriceDisplay price={market.priceYes} priceClassName="text-4xl font-black text-emerald-600 dark:text-emerald-400 text-shadow-sm tracking-tighter" />
                        </div>
                        <div className="bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-4 text-center group/no hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors relative overflow-hidden">
                            <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover/no:opacity-100 transition-opacity" />
                            <span className="text-[10px] font-bold text-rose-600/60 dark:text-rose-400/60 uppercase block mb-1 group-hover/no:scale-110 transition-transform">No</span>
                            <PriceDisplay price={market.priceNo} priceClassName="text-4xl font-black text-rose-600 dark:text-rose-400 text-shadow-sm tracking-tighter" />
                        </div>
                    </div>
                </div>
            </Link>

            {/* Quick Features Row */}
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                    <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3" />
                        <span>BNB Chain</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        <span>Instant Settlement</span>
                    </div>
                </div>

                <Link href="/markets" className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    Trade Now <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
