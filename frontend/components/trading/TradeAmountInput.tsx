'use client';

import { Wallet } from 'lucide-react';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';

interface TradeAmountInputProps {
    amount: string;
    setAmount: (amount: string) => void;
    tradeMode: 'buy' | 'sell';
    side: 'yes' | 'no';
    usdcBalance: string;
    yesBalance: string;
    noBalance: string;
    usdcBalanceRaw: bigint;
    yesBalanceRaw: bigint;
    noBalanceRaw: bigint;
    canBuy: boolean;
    canSell: boolean;
    isTradeable: boolean;
    amountRegex: RegExp;
}

export function TradeAmountInput({
    amount,
    setAmount,
    tradeMode,
    side,
    usdcBalance,
    yesBalance,
    noBalance,
    usdcBalanceRaw,
    yesBalanceRaw,
    noBalanceRaw,
    canBuy,
    canSell,
    isTradeable,
    amountRegex,
}: TradeAmountInputProps) {
    const isError = amount && parseFloat(amount) > 0 && !(tradeMode === 'buy' ? canBuy : canSell);

    // Quick amount chips for buy mode
    const quickAmounts = tradeMode === 'buy' ? [10, 25, 50, 100] : [];

    const maxValue = tradeMode === 'buy'
        ? parseFloat(formatUnits(usdcBalanceRaw, 6))
        : side === 'yes'
            ? parseFloat(formatUnits(yesBalanceRaw, 18))
            : parseFloat(formatUnits(noBalanceRaw, 18));

    const handleQuickAmount = (value: number) => {
        if (value > maxValue) {
            const roundedValue = Math.floor(maxValue * 1000) / 1000;
            setAmount(roundedValue.toString());
        } else {
            setAmount(value.toString());
        }
    };

    const handleMax = () => {
        const roundedValue = Math.floor(maxValue * 1000) / 1000;
        setAmount(roundedValue.toString());
    };

    const isBuy = tradeMode === 'buy';

    return (
        <div className="space-y-4">
            {/* Main Input Card */}
            <div className={`
                bg-white dark:bg-gray-800/40 rounded-2xl border-2 transition-all duration-300 relative
                ${isError
                    ? 'border-rose-500/50 shadow-lg shadow-rose-500/5'
                    : amount && parseFloat(amount) > 0
                        ? 'border-gray-900 dark:border-white shadow-sm'
                        : 'border-gray-100 dark:border-gray-700/50'
                }
                p-5 focus-within:ring-2 focus-within:ring-[#14B8A6]/20
            `}>
                <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</span>
                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <Wallet className="w-3 h-3 text-gray-400" />
                        <span className="text-[11px] font-bold text-gray-500 tabular-nums">
                            {tradeMode === 'buy' ? usdcBalance : (side === 'yes' ? yesBalance : noBalance)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        value={amount}
                        onChange={(e) => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (val === '' || amountRegex.test(val)) {
                                setAmount(val);
                            }
                        }}
                        placeholder="0.00"
                        className="bg-transparent border-none text-4xl font-black text-gray-900 dark:text-white w-full focus:ring-0 focus:outline-none p-0 placeholder:text-gray-200 dark:placeholder:text-gray-700 tabular-nums"
                        disabled={!isTradeable}
                        aria-label="Asset amount"
                    />
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl shrink-0 shadow-sm">
                        <span className="text-xs font-black tracking-widest">
                            {tradeMode === 'buy' ? 'USDC' : side.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-2">
                <AnimatePresence mode="popLayout">
                    {isBuy && quickAmounts.map((value) => (
                        <motion.button
                            key={`quick-${value}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={() => handleQuickAmount(value)}
                            disabled={!isTradeable}
                            className={`
                                flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all
                                ${parseFloat(amount) === value
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-100 dark:border-gray-700/50'
                                }
                                disabled:opacity-50
                            `}
                        >
                            ${value}
                        </motion.button>
                    ))}

                    <motion.button
                        key="max-button"
                        layout
                        onClick={handleMax}
                        disabled={!isTradeable}
                        className={`
                            ${isBuy ? 'px-4' : 'flex-1'} py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all
                            ${parseFloat(amount) >= maxValue - 0.01 && maxValue > 0
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                                : 'bg-[#14B8A6]/10 text-[#14B8A6] hover:bg-[#14B8A6]/20'
                            }
                            disabled:opacity-50
                        `}
                    >
                        MAX
                    </motion.button>
                </AnimatePresence>
            </div>
        </div>
    );
}
