'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, TrendingUp, TrendingDown, Copy, Check } from 'lucide-react';
import { useNicknames, getDisplayName } from '@/lib/hooks/useNicknames';

interface LiveTradeFeedProps {
    transactions: any[];
}

type FilterType = 'all' | 'yes' | 'no' | 'whale';

export function LiveTradeFeed({ transactions }: LiveTradeFeedProps) {
    const { nicknames, fetchUsernamesBulk } = useNicknames();
    const [filter, setFilter] = useState<FilterType>('all');
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    // Fetch usernames for all traders
    useEffect(() => {
        const addresses = transactions
            .map((tx: any) => tx.user)
            .filter((addr: string) => addr && !nicknames[addr?.toLowerCase()]);

        const uniqueAddresses = Array.from(new Set(addresses)) as string[];
        if (uniqueAddresses.length > 0) {
            fetchUsernamesBulk(uniqueAddresses.slice(0, 20));
        }
    }, [transactions, nicknames, fetchUsernamesBulk]);

    const copyAddress = useCallback((address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    }, []);

    const processedTrades = transactions.slice(0, 50).map((tx: any) => {
        const typeStr = tx.type || '';
        const isBuy = typeStr.includes('Buy') || tx.action === 'Buy';
        const isYes = typeStr.includes('Yes') || tx.side === 'Yes' || tx.outcome === 1;
        const amount = parseFloat(tx.amount || tx.value || '0');

        return {
            id: tx.id || tx.txHash,
            isBuy,
            side: isYes ? 'Yes' : 'No',
            amount: amount.toFixed(2),
            amountNum: amount,
            price: parseFloat(tx.price || '0'),
            timestamp: tx.timestamp || tx.time,
            user: tx.user,
            isWhale: amount >= 100,
        };
    });

    // Filter trades
    const filteredTrades = processedTrades.filter(trade => {
        if (filter === 'all') return true;
        if (filter === 'yes') return trade.side === 'Yes';
        if (filter === 'no') return trade.side === 'No';
        if (filter === 'whale') return trade.isWhale;
        return true;
    });

    const getTimeAgo = (timestamp: number) => {
        const seconds = Math.floor(Date.now() / 1000) - Number(timestamp);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    const shortenAddress = (address: string) => {
        if (!address) return '-';
        return `${address.slice(0, 4)}…${address.slice(-4)}`;
    };

    const filterButtons: { key: FilterType; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'yes', label: 'Yes' },
        { key: 'no', label: 'No' },
        { key: 'whale', label: '>$100' },
    ];

    return (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Live Trades
                    </span>
                </div>
            </div>

            {/* Filter Chips - Look clickable */}
            <div className="px-2 py-2 flex gap-1.5 border-b border-gray-100 dark:border-gray-800">
                {filterButtons.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`
                            px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border
                            ${filter === key
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }
                        `}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Trades List */}
            <div className="overflow-y-auto flex-1 scrollbar-hide">
                <AnimatePresence initial={false}>
                    {filteredTrades.length > 0 ? (
                        filteredTrades.map((trade, index) => {
                            const isYes = trade.side === 'Yes';

                            return (
                                <motion.div
                                    key={trade.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="group px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                                >
                                    {/* Main Row */}
                                    <div className="flex items-center gap-2">
                                        {/* Side Pill */}
                                        <div className={`
                                            px-1.5 py-0.5 rounded text-[10px] font-black uppercase
                                            ${isYes
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                            }
                                        `}>
                                            {trade.side}
                                        </div>

                                        {/* Amount */}
                                        <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                                            ${trade.amount}
                                        </span>

                                        {/* Price */}
                                        <span className={`text-xs font-bold tabular-nums ${isYes ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {Math.round(trade.price * 100)}¢
                                        </span>

                                        {/* Spacer */}
                                        <div className="flex-1" />

                                        {/* Time */}
                                        <span className="text-[10px] text-gray-400 tabular-nums">
                                            {getTimeAgo(trade.timestamp)}
                                        </span>
                                    </div>

                                    {/* Secondary Row */}
                                    <div className="mt-1 flex items-center justify-between">
                                        <button
                                            onClick={() => copyAddress(trade.user)}
                                            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-mono transition-colors"
                                        >
                                            {shortenAddress(trade.user)}
                                            {copiedAddress === trade.user ? (
                                                <Check className="w-2.5 h-2.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </button>

                                        <a
                                            href={`https://testnet.bscscan.com/tx/${trade.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
                            <p className="text-xs font-medium text-gray-400">
                                {filter !== 'all' ? 'No matching trades' : 'No trades yet'}
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
