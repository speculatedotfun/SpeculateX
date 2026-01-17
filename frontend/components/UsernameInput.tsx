'use client';

import { useState, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { User, Check, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface UsernameInputProps {
    onUsernameSet?: (username: string) => void;
    currentUsername?: string | null;
}

export function UsernameInput({ onUsernameSet, currentUsername }: UsernameInputProps) {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { pushToast } = useToast();
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!address || !username.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/usernames', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    address,
                    chainId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to register username');
                return;
            }

            pushToast({
                title: 'Username Set!',
                description: `Your referral code is now: ${data.username}`,
                type: 'success',
            });

            setUsername('');
            onUsernameSet?.(data.username);

        } catch (e) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [address, username, pushToast, onUsernameSet]);

    if (!isConnected) return null;

    if (currentUsername) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-gray-600 dark:text-gray-300">Your referral code:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentUsername}</span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                            setError(null);
                            setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20));
                        }}
                        placeholder="Choose your referral code"
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent outline-none transition-all"
                        disabled={isLoading}
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || username.length < 3}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        'Save'
                    )}
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-xs text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </div>
            )}

            <p className="text-xs text-gray-400">
                3-20 characters, letters, numbers, and underscores only.
            </p>
        </div>
    );
}
