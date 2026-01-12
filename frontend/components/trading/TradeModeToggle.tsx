'use client';

import { motion } from 'framer-motion';
import { hapticFeedback } from '@/lib/haptics';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

interface TradeModeToggleProps {
    tradeMode: 'buy' | 'sell';
    setTradeMode: (mode: 'buy' | 'sell') => void;
    isBusy: boolean;
    isTradeable: boolean;
}

export function TradeModeToggle({
    tradeMode,
    setTradeMode,
    isBusy,
    isTradeable,
}: TradeModeToggleProps) {
    return (
        <div
            className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-xl relative border border-gray-200/50 dark:border-gray-700/50"
            role="group"
            aria-label="Trade mode selection"
        >
            <motion.div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-100 dark:border-gray-600"
                animate={{
                    x: tradeMode === 'sell' ? 'calc(100% + 6px)' : 0
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            />

            <button
                onClick={() => {
                    if (!isBusy && isTradeable) {
                        hapticFeedback('light');
                        setTradeMode('buy');
                    }
                }}
                className={`relative flex-1 py-3.5 font-black text-xs uppercase tracking-[0.1em] transition-all duration-300 z-10 flex items-center justify-center gap-2 ${tradeMode === 'buy'
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                disabled={!isTradeable}
                role="radio"
                aria-checked={tradeMode === 'buy'}
            >
                <ArrowDownToLine className={`w-3.5 h-3.5 transition-transform duration-300 ${tradeMode === 'buy' ? 'scale-110' : 'scale-100'}`} />
                Buy
            </button>

            <button
                onClick={() => {
                    if (!isBusy && isTradeable) {
                        hapticFeedback('light');
                        setTradeMode('sell');
                    }
                }}
                className={`relative flex-1 py-3.5 font-black text-xs uppercase tracking-[0.1em] transition-all duration-300 z-10 flex items-center justify-center gap-2 ${tradeMode === 'sell'
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                disabled={!isTradeable}
                role="radio"
                aria-checked={tradeMode === 'sell'}
            >
                <ArrowUpFromLine className={`w-3.5 h-3.5 transition-transform duration-300 ${tradeMode === 'sell' ? 'scale-110' : 'scale-100'}`} />
                Sell
            </button>
        </div>
    );
}
