'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Check } from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';

interface OutcomeSelectorProps {
    side: 'yes' | 'no';
    setSide: (side: 'yes' | 'no') => void;
    priceYes: number;
    priceNo: number;
    yesBalance: string;
    noBalance: string;
    isBusy: boolean;
    isTradeable: boolean;
    showReturnHint?: boolean;
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
    showReturnHint = true,
}: OutcomeSelectorProps) {
    const yesCents = (priceYes * 100).toFixed(1);
    const noCents = (priceNo * 100).toFixed(1);

    // Calculate potential return per $1 invested (if outcome wins, you get $1 per share)
    const yesReturn = priceYes > 0 ? ((1 / priceYes) - 1) * 100 : 0;
    const noReturn = priceNo > 0 ? ((1 / priceNo) - 1) * 100 : 0;

    return (
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Choose outcome">
            {/* YES Card */}
            <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                    if (!isBusy && isTradeable) {
                        hapticFeedback('light');
                        setSide('yes');
                    }
                }}
                className={`
                    relative p-4 rounded-xl text-left transition-all duration-200 border-2 overflow-hidden
                    ${side === 'yes'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
                disabled={!isTradeable}
                role="radio"
                aria-checked={side === 'yes'}
            >
                {/* Selected checkmark */}
                {side === 'yes' && (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </motion.div>
                )}

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${side === 'yes' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className={`text-sm font-black uppercase tracking-wider ${side === 'yes' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        Yes
                    </span>
                </div>

                {/* Price */}
                <div className="mb-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Price</div>
                    <div className="flex items-baseline gap-0.5">
                        <span className={`text-3xl font-black tabular-nums ${side === 'yes' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                            {yesCents}
                        </span>
                        <span className={`text-base font-bold ${side === 'yes' ? 'text-emerald-500/60' : 'text-gray-400'}`}>¢</span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="relative">
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${priceYes * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <span className="absolute right-0 -top-5 text-[10px] font-bold text-gray-400">
                        {(priceYes * 100).toFixed(0)}%
                    </span>
                </div>

                {/* Potential return hint */}
                {showReturnHint && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            +{yesReturn.toFixed(0)}% if YES wins
                        </span>
                    </div>
                )}
            </motion.button>

            {/* NO Card */}
            <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                    if (!isBusy && isTradeable) {
                        hapticFeedback('light');
                        setSide('no');
                    }
                }}
                className={`
                    relative p-4 rounded-xl text-left transition-all duration-200 border-2 overflow-hidden
                    ${side === 'no'
                        ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-500 shadow-lg shadow-rose-500/20 ring-2 ring-rose-500/30'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
                disabled={!isTradeable}
                role="radio"
                aria-checked={side === 'no'}
            >
                {/* Selected checkmark */}
                {side === 'no' && (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-3 right-3 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </motion.div>
                )}

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${side === 'no' ? 'bg-rose-500 text-white' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                        <TrendingDown className="w-4 h-4" />
                    </div>
                    <span className={`text-sm font-black uppercase tracking-wider ${side === 'no' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}`}>
                        No
                    </span>
                </div>

                {/* Price */}
                <div className="mb-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Price</div>
                    <div className="flex items-baseline gap-0.5">
                        <span className={`text-3xl font-black tabular-nums ${side === 'no' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                            {noCents}
                        </span>
                        <span className={`text-base font-bold ${side === 'no' ? 'text-rose-500/60' : 'text-gray-400'}`}>¢</span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="relative">
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${priceNo * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <span className="absolute right-0 -top-5 text-[10px] font-bold text-gray-400">
                        {(priceNo * 100).toFixed(0)}%
                    </span>
                </div>

                {/* Potential return hint */}
                {showReturnHint && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            +{noReturn.toFixed(0)}% if NO wins
                        </span>
                    </div>
                )}
            </motion.button>
        </div>
    );
}
