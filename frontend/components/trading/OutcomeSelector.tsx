'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';
import { formatPrice } from '@/lib/tradingUtils';

interface OutcomeSelectorProps {
    side: 'yes' | 'no';
    setSide: (side: 'yes' | 'no') => void;
    priceYes: number;
    priceNo: number;
    yesBalance: string;
    noBalance: string;
    isBusy: boolean;
    isTradeable: boolean;
}

export function OutcomeSelector({
    side,
    setSide,
    priceYes,
    priceNo,
    yesBalance,
    noBalance,
    isBusy,
    isTradeable,
}: OutcomeSelectorProps) {
    return (
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Outcome selection">
            {(['yes', 'no'] as const).map(s => {
                const price = s === 'yes' ? priceYes : priceNo;
                const isSelected = side === s;
                const balance = s === 'yes' ? yesBalance : noBalance;

                return (
                    <motion.button
                        key={s}
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: !isBusy && isTradeable ? 1.01 : 1 }}
                        onClick={() => {
                            if (!isBusy && isTradeable) {
                                hapticFeedback('light');
                                setSide(s);
                            }
                        }}
                        className={`
              relative p-3 rounded-xl text-left transition-all duration-200 border-2 overflow-hidden
              ${s === 'yes'
                                ? (isSelected
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 shadow-sm'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-green-300')
                                : (isSelected
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500 shadow-sm'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-300')
                            }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
                        disabled={!isTradeable}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${s.toUpperCase()} outcome at ${formatPrice(price)}, balance: ${balance}`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-bold uppercase tracking-wider ${s === 'yes' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {s}
                            </span>
                            <AnimatePresence mode="wait">
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className={`w-5 h-5 rounded-full flex items-center justify-center ${s === 'yes' ? 'bg-green-500' : 'bg-red-500'} text-white`}
                                    >
                                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-0.5">
                            <div className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                                {formatPrice(price)}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                                <Wallet className="w-2.5 h-2.5" aria-hidden="true" />
                                <span>Bal: {balance}</span>
                            </div>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}
