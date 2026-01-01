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
        <div className="grid grid-cols-2 gap-4" role="group" aria-label="Outcome selection">
            {(['yes', 'no'] as const).map(s => {
                const price = s === 'yes' ? priceYes : priceNo;
                const isSelected = side === s;
                const balance = s === 'yes' ? yesBalance : noBalance;

                return (
                    <motion.button
                        key={s}
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: !isBusy && isTradeable ? 1.02 : 1 }}
                        onClick={() => {
                            if (!isBusy && isTradeable) {
                                hapticFeedback('light');
                                setSide(s);
                            }
                        }}
                        className={`
              relative p-5 rounded-[24px] text-left transition-all duration-300 border-[3px] overflow-hidden group
              ${s === 'yes'
                                ? (isSelected
                                    ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/10 border-green-500 dark:border-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15),0_8px_30px_rgba(34,197,94,0.12)] dark:shadow-[0_0_0_4px_rgba(34,197,94,0.2),0_8px_30px_rgba(34,197,94,0.2)]'
                                    : 'bg-gradient-to-br from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-800/50 border-gray-200/60 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-lg shadow-sm')
                                : (isSelected
                                    ? 'bg-gradient-to-br from-red-50 to-rose-50/50 dark:from-red-900/20 dark:to-rose-900/10 border-red-500 dark:border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15),0_8px_30px_rgba(239,68,68,0.12)] dark:shadow-[0_0_0_4px_rgba(239,68,68,0.2),0_8px_30px_rgba(239,68,68,0.2)]'
                                    : 'bg-gradient-to-br from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-800/50 border-gray-200/60 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 hover:shadow-lg shadow-sm')
                            }
              disabled:opacity-50 disabled:cursor-not-allowed ring-1 ring-gray-900/5 dark:ring-white/5
            `}
                        disabled={!isTradeable}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${s.toUpperCase()} outcome at ${formatPrice(price)}, balance: ${balance}`}
                    >
                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <span className={`text-sm font-black uppercase tracking-widest ${s === 'yes' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                {s}
                            </span>
                            <AnimatePresence mode="wait">
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, rotate: 180 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center ${s === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} shadow-md`}
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-1 relative z-10">
                            <div className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white">
                                {formatPrice(price)}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                <Wallet className="w-3 h-3" aria-hidden="true" />
                                <span className="truncate">Bal: {balance}</span>
                            </div>
                        </div>

                        {isSelected && (
                            <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-3xl opacity-40 ${s === 'yes' ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-red-400 to-rose-500'} animate-pulse`} style={{ animationDuration: '3s' }} aria-hidden="true" />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
