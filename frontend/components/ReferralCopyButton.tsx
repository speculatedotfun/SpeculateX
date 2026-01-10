'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Link2, Check, Loader2, X, User, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNicknames } from '@/lib/hooks/useNicknames';

export function ReferralCopyButton() {
    const { address, isConnected } = useAccount();
    const { pushToast } = useToast();
    const { registerUsername } = useNicknames();
    const [copied, setCopied] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [inputUsername, setInputUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch username on mount
    useEffect(() => {
        if (!address) return;

        const fetchUsername = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/usernames?address=${address}`);
                const data = await res.json();
                if (data.found && data.username) {
                    setUsername(data.username);
                }
            } catch (e) {
                console.error('Failed to fetch username', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsername();
    }, [address]);

    const handleClick = useCallback(() => {
        if (!address) return;

        // If no username, show modal to set one
        if (!username) {
            setShowModal(true);
            return;
        }

        // Copy the link with username
        const baseUrl = window.location.origin;
        const referralLink = `${baseUrl}?ref=${username}`;

        navigator.clipboard.writeText(referralLink).then(() => {
            setCopied(true);
            pushToast({
                title: 'Referral Link Copied!',
                description: `Share: ${baseUrl}?ref=${username}`,
                type: 'success',
            });
            setTimeout(() => setCopied(false), 2000);
        });
    }, [address, username, pushToast]);

    const handleEditClick = useCallback(() => {
        setInputUsername(username || '');
        setShowModal(true);
    }, [username]);

    const handleSubmitUsername = useCallback(async () => {
        if (!address || !inputUsername.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // Use PUT if already have a username, POST if new
            const method = username ? 'PUT' : 'POST';
            const bodyData = username
                ? { newUsername: inputUsername.trim(), address }
                : { username: inputUsername.trim(), address };

            const response = await fetch('/api/usernames', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to register username');
                return;
            }

            setUsername(data.username);
            registerUsername(address, data.username);
            setShowModal(false);
            setInputUsername('');

            // Now copy the link
            const baseUrl = window.location.origin;
            const referralLink = `${baseUrl}?ref=${data.username}`;

            navigator.clipboard.writeText(referralLink).then(() => {
                setCopied(true);
                pushToast({
                    title: 'Username Set & Link Copied!',
                    description: `Share: ${baseUrl}?ref=${data.username}`,
                    type: 'success',
                });
                setTimeout(() => setCopied(false), 2000);
            });

        } catch (e) {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [address, inputUsername, username, pushToast, registerUsername]);

    if (!isConnected || !address) return null;

    return (
        <>
            <div className="flex items-center gap-1">
                <button
                    onClick={handleClick}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-[#14B8A6] dark:hover:text-[#14B8A6] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-[#14B8A6] transition-all shadow-sm group disabled:opacity-50"
                    title="Copy Referral Link"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : copied ? (
                        <>
                            <Check className="w-4 h-4 text-[#14B8A6]" />
                            <span className="text-[#14B8A6] hidden sm:inline">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Link2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">
                                {username ? `?ref=${username}` : 'Invite'}
                            </span>
                        </>
                    )}
                </button>

                {/* Edit Button - only show if username exists */}
                {username && (
                    <button
                        onClick={handleEditClick}
                        className="p-2 text-gray-400 hover:text-[#14B8A6] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title="Change username"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Username Setup Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">Set Your Referral Code</h3>
                                        <p className="text-xs text-gray-500">Choose a memorable username for your link</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>

                            {/* Input */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={inputUsername}
                                        onChange={(e) => {
                                            setError(null);
                                            setInputUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20));
                                        }}
                                        placeholder="e.g. almog, cryptoking, trader123"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent outline-none transition-all"
                                        disabled={isSubmitting}
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && inputUsername.length >= 3) {
                                                handleSubmitUsername();
                                            }
                                        }}
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <p className="text-xs text-gray-400">
                                    3-20 characters. Letters, numbers, and underscores only.
                                </p>

                                {/* Preview */}
                                {inputUsername.length >= 3 && (
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs">
                                        <span className="text-gray-500">Your link will be: </span>
                                        <span className="font-mono text-[#14B8A6] font-bold">
                                            {window.location.origin}?ref={inputUsername.toLowerCase()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitUsername}
                                    disabled={isSubmitting || inputUsername.length < 3}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#14B8A6] to-[#0D9488] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Save & Copy Link
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )
                }
            </AnimatePresence >
        </>
    );
}
