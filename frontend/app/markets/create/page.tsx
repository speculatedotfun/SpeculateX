'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import CreateMarketForm from '@/components/CreateMarketForm';
import { canCreateMarkets, isAdmin as checkIsAdmin } from '@/lib/hooks';
import { motion } from 'framer-motion';
import { Loader2, Shield, Plus, Target } from 'lucide-react';

export default function CreateMarketPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const verifyAccess = async () => {
            if (!isConnected || !address) {
                setIsAuthorized(false);
                setIsLoading(false);
                return;
            }

            try {
                // Check if user is Admin OR has Market Creator role
                const [isAdmin, isCreator] = await Promise.all([
                    checkIsAdmin(address),
                    canCreateMarkets(address)
                ]);

                setIsAuthorized(isAdmin || isCreator);
            } catch (error) {
                console.error('Failed to verify access:', error);
                setIsAuthorized(false);
            } finally {
                setIsLoading(false);
            }
        };

        verifyAccess();
    }, [address, isConnected]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-[#14B8A6] animate-spin" />
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-[32px] p-10 shadow-2xl border-2 border-white/60 dark:border-gray-700/60 max-w-md w-full text-center"
                    >
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Access Denied</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
                            You do not have permission to create markets. Please contact an admin to grant you the <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">MARKET_CREATOR_ROLE</span>.
                        </p>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans selection:bg-[#14B8A6]/30 relative overflow-hidden">
            {/* Enhanced Background */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[bottom_1px_center]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FAF9FF] dark:to-[#0f1219]"></div>

                {/* Animated Orbs */}
                <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-teal-400/10 blur-[120px]" />
                <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
            </div>

            <Header />

            <main className="max-w-4xl mx-auto px-4 py-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl ring-1 ring-gray-900/5 dark:ring-white/5"
                >
                    <div className="text-center mb-10">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-widest mb-4 border border-teal-500/20 shadow-sm">
                            <Target className="w-4 h-4" />
                            Creator Studio
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black text-[#0f0a2e] dark:text-white mb-4 tracking-tighter">
                            Create Market
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                            Launch a new prediction market on the protocol. All inputs are immutable once deployed.
                        </p>
                    </div>

                    <CreateMarketForm />
                </motion.div>
            </main>
        </div>
    );
}
