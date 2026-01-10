'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useNicknames } from '@/lib/hooks/useNicknames';

export function UsernameGuard({ children }: { children: React.ReactNode }) {
    const { address, isConnected } = useAccount();
    const { pushToast } = useToast();
    const { registerUsername } = useNicknames();
    const [hasUsername, setHasUsername] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [inputUsername, setInputUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check if user has a username
    const checkUsername = useCallback(async (userAddress: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/usernames?address=${userAddress.toLowerCase()}`);
            const data = await res.json();
            setHasUsername(data.found === true);
        } catch (e) {
            console.error('Failed to check username', e);
            setHasUsername(false); // Fallback to allow them to set one
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isConnected && address) {
            checkUsername(address);
        } else {
            setHasUsername(null);
            setIsLoading(false);
        }
    }, [isConnected, address, checkUsername]);

    const handleSubmit = useCallback(async () => {
        if (!address || !inputUsername.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/usernames', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: inputUsername.trim(),
                    address,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to register username');
                return;
            }

            setHasUsername(true);
            registerUsername(address, data.username);

            pushToast({
                title: 'Welcome aboard!',
                description: `Your username is now set to @${data.username}`,
                type: 'success',
            });
        } catch (e) {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [address, inputUsername, pushToast, registerUsername]);

    // If not connected or still checking, just show the app (or a loader)
    if (!isConnected || isLoading) {
        return <>{children}</>;
    }

    // If connected but no username, show the splash screen
    if (hasUsername === false) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FAF9FF] dark:bg-[#0B1121]">
                {/* Background Decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#14B8A6]/10 rounded-full blur-[120px]" />
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative z-10 w-full max-w-md p-8 bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl border border-gray-200 dark:border-gray-800"
                >
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center shadow-lg shadow-[#14B8A6]/30 mb-6">
                            <Sparkles className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                            Pick Your Username
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[280px]">
                            To start trading, you need a unique username for your referral link and profile.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={inputUsername}
                                onChange={(e) => {
                                    setError(null);
                                    setInputUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20));
                                }}
                                placeholder="Choose a username..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-lg font-bold focus:ring-4 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] outline-none transition-all placeholder:text-gray-400"
                                disabled={isSubmitting}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && inputUsername.length >= 3) {
                                        handleSubmit();
                                    }
                                }}
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <div className="flex flex-col gap-1 px-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Requirements
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                • 3-20 characters long<br />
                                • Letters, numbers, and underscores only
                            </p>
                        </div>

                        {inputUsername.length >= 3 && (
                            <div className="p-3 bg-teal-50 dark:bg-teal-900/10 rounded-xl border border-teal-100 dark:border-teal-900/30">
                                <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-widest mb-1">Preview</p>
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    speculatex.com/?ref=<span className="text-[#14B8A6]">{inputUsername.toLowerCase()}</span>
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || inputUsername.length < 3}
                            className="w-full py-4 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-black text-lg rounded-2xl shadow-xl shadow-[#14B8A6]/25 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <span>Get Started</span>
                                    <Check className="w-6 h-6" />
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return <>{children}</>;
}
