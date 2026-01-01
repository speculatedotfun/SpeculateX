'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, User, ShoppingCart } from 'lucide-react';

interface Trade {
    id: string; // txHash
    type: 'Buy' | 'Sell' | 'Add' | 'Remove' | 'Merge' | 'Redeem';
    side: 'Yes' | 'No' | 'Lp';
    amount: string; // USDC Amount
    price: string;
    timestamp: number;
    user: string;
}

interface LiveTradeFeedProps {
    transactions: any[];
}

export function LiveTradeFeed({ transactions }: LiveTradeFeedProps) {
    // Process transactions to match our interface
    const processedTrades = transactions.slice(0, 50).map((tx: any) => {
        // Fallback for different transaction data structures
        const typeStr = tx.type || ''; // e.g., 'BuyYes', 'SellNo', or tx.action
        const isBuy = typeStr.includes('Buy') || tx.action === 'Buy';
        const isYes = typeStr.includes('Yes') || tx.side === 'Yes' || tx.outcome === 1;

        return {
            id: tx.txHash || tx.id,
            type: isBuy ? 'Buy' : 'Sell',
            realAction: isBuy ? 'Buy' : 'Sell',
            side: isYes ? 'Yes' : 'No',
            amount: parseFloat(tx.amount || tx.value || '0').toFixed(2),
            price: parseFloat(tx.price || '0').toFixed(2),
            timestamp: tx.timestamp || tx.time,
            user: tx.user
        };
    });

    return (
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden flex flex-col h-full min-h-[300px]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Live Trades
                </h3>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-4 px-4 py-2 text-gray-400 opacity-60 text-[10px] font-bold uppercase bg-gray-50/30 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                <div>Price</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Time</div>
                <div className="text-right">Tx</div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 scrollbar-hide">
                <AnimatePresence initial={false}>
                    {processedTrades.length > 0 ? (
                        processedTrades.map((trade) => (
                            <motion.div
                                key={trade.id}
                                initial={{ opacity: 0, x: -20, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                exit={{ opacity: 0, x: 20, height: 0 }}
                                className="grid grid-cols-4 px-4 py-2.5 text-xs font-mono border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors items-center"
                            >
                                <div className={`font-bold ${trade.side === 'Yes'
                                    ? trade.realAction.includes('Buy') ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                                    : trade.realAction.includes('Buy') ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                                    }`}>
                                    <span className="opacity-70 mr-1 text-[10px] uppercase font-sans text-gray-400">
                                        {trade.realAction === 'Buy' ? 'Buy' : trade.realAction === 'Sell' ? 'Sell' : 'Liq'}
                                    </span>
                                    {trade.price}
                                </div>
                                <div className="text-right text-gray-700 dark:text-gray-300">
                                    ${trade.amount}
                                </div>
                                <div className="text-right text-gray-400">
                                    {getTimeAgo(trade.timestamp)}
                                </div>
                                <div className="flex justify-end">
                                    <a
                                        href={`https://testnet.bscscan.com/tx/${trade.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-xs">
                            No recent trades found
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function getTimeAgo(timestamp: number) {
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
}
