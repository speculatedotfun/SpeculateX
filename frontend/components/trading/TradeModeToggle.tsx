'use client';

import { motion } from 'framer-motion';
import { hapticFeedback } from '@/lib/haptics';

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
            className="flex bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-2xl relative"
            role="group"
            aria-label="Trade mode selection"
        >
            <motion.div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-gray-700 rounded-xl shadow-sm"
                animate={{
                    x: tradeMode === 'sell' ? 'calc(100% + 6px)' : 0
                }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            />
            {(['buy', 'sell'] as const).map(m => (
                <button
                    key={m}
                    onClick={() => {
                        if (!isBusy && isTradeable) {
                            hapticFeedback('light');
                            setTradeMode(m);
                        }
                    }}
                    className={`relative flex-1 py-3 font-black text-sm uppercase tracking-widest transition-colors z-10 flex items-center justify-center gap-2 ${tradeMode === m ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    disabled={!isTradeable}
                    role="radio"
                    aria-checked={tradeMode === m}
                    aria-label={`${m === 'buy' ? 'Buy' : 'Sell'} mode`}
                    tabIndex={tradeMode === m ? 0 : -1}
                >
                    {m === 'buy' ? 'Buy' : 'Sell'}
                </button>
            ))}
        </div>
    );
}
