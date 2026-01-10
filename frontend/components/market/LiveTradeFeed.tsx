'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { useNicknames, getDisplayName } from '@/lib/hooks/useNicknames';

interface Trade {
    id: string;
    type: 'Buy' | 'Sell' | 'Add' | 'Remove' | 'Merge' | 'Redeem';
    side: 'Yes' | 'No' | 'Lp';
    amount: string;
    price: string;
    timestamp: number;
    user: string;
}

interface LiveTradeFeedProps {
    transactions: any[];
}

export function LiveTradeFeed({ transactions }: LiveTradeFeedProps) {
    const { nicknames, fetchUsernamesBulk } = useNicknames();

    // Fetch usernames for all traders
    useEffect(() => {
        const addresses = transactions
            .map((tx: any) => tx.user)
            .filter((addr: string) => addr && !nicknames[addr?.toLowerCase()]);

        // Fetch unique addresses
        const uniqueAddresses = Array.from(new Set(addresses)) as string[];
        if (uniqueAddresses.length > 0) {
            fetchUsernamesBulk(uniqueAddresses.slice(0, 20));
        }
    }, [transactions, nicknames, fetchUsernamesBulk]);

    const processedTrades = transactions.slice(0, 30).map((tx: any) => {
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
            isWhale: amount >= 100, // Trades over $100 are "whale" trades
        };
    });

    const getTimeAgo = (timestamp: number) => {
        const seconds = Math.floor(Date.now() / 1000) - Number(timestamp);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h`;
    };

    return (
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden flex flex-col h-full shadow-lg">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200/60 dark:border-gray-800/60 flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Trades
                </h3>
                <span className="text-[10px] text-gray-400 font-medium">
                    {processedTrades.length} trades
                </span>
            </div>

            {/* Trades List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1.5 scrollbar-hide">
                <AnimatePresence initial={false}>
                    {processedTrades.length > 0 ? (
                        processedTrades.map((trade, index) => {
                            const isYes = trade.side === 'Yes';
                            const colorScheme = isYes
                                ? {
                                    bg: 'bg-emerald-500/5 hover:bg-emerald-500/10',
                                    border: 'border-emerald-500/20',
                                    text: 'text-emerald-600 dark:text-emerald-400',
                                    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                }
                                : {
                                    bg: 'bg-rose-500/5 hover:bg-rose-500/10',
                                    border: 'border-rose-500/20',
                                    text: 'text-rose-600 dark:text-rose-400',
                                    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                                };

                            return (
                                <motion.div
                                    key={trade.id}
                                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                    transition={{ duration: 0.2, delay: index * 0.02 }}
                                    className={`
                                        relative rounded-xl p-3 border transition-all duration-200 cursor-pointer group
                                        ${colorScheme.bg} ${colorScheme.border}
                                        ${trade.isWhale ? 'ring-1 ring-amber-400/30' : ''}
                                    `}
                                >
                                    {/* Whale Indicator */}
                                    {trade.isWhale && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                            <Sparkles className="w-3 h-3 text-white" />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between gap-3">
                                        {/* Left: Action Badge + User */}
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {/* Action Badge */}
                                            <div className={`
                                                flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide
                                                ${colorScheme.badge}
                                            `}>
                                                {trade.isBuy ? (
                                                    <TrendingUp className="w-3 h-3" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3" />
                                                )}
                                                {trade.isBuy ? 'Buy' : 'Sell'} {trade.side}
                                            </div>

                                            {/* User */}
                                            <span className={`text-xs font-medium truncate max-w-[80px] ${nicknames[trade.user?.toLowerCase()]
                                                ? 'text-gray-800 dark:text-gray-200'
                                                : 'text-gray-500 dark:text-gray-400 font-mono'
                                                }`}>
                                                {trade.user ? getDisplayName(trade.user, nicknames) : '-'}
                                            </span>
                                        </div>

                                        {/* Right: Price + Amount + Time */}
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {/* Price as Percentage */}
                                            <span className={`text-sm font-bold ${colorScheme.text}`}>
                                                {Math.round(trade.price * 100)}%
                                            </span>

                                            {/* Amount */}
                                            <span className="text-xs text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                ${trade.amount}
                                            </span>

                                            {/* Time */}
                                            <span className="text-[10px] text-gray-400 font-medium w-6 text-right">
                                                {getTimeAgo(trade.timestamp)}
                                            </span>

                                            {/* Tx Link */}
                                            <a
                                                href={`https://testnet.bscscan.com/tx/${trade.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                                <TrendingUp className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No trades yet</p>
                            <p className="text-xs text-gray-400 mt-1">Be the first to trade!</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
