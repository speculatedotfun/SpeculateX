'use client';

import { Wallet } from 'lucide-react';
import { formatUnits } from 'viem';

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

    return (
        <div className={`
      bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-[24px] border-2 transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-800/80 relative ring-1 ring-gray-900/5 dark:ring-white/5
      ${amount && parseFloat(amount) > 0
                ? (tradeMode === 'buy' ? canBuy : canSell)
                    ? 'border-green-500 dark:border-green-600 shadow-[0_0_0_3px_rgba(34,197,94,0.15),0_8px_30px_rgba(34,197,94,0.08)] dark:shadow-[0_0_0_3px_rgba(34,197,94,0.2),0_8px_30px_rgba(34,197,94,0.15)]'
                    : 'border-red-500 dark:border-red-600 shadow-[0_0_0_3px_rgba(239,68,68,0.15),0_8px_30px_rgba(239,68,68,0.08)] dark:shadow-[0_0_0_3px_rgba(239,68,68,0.2),0_8px_30px_rgba(239,68,68,0.15)]'
                : 'border-gray-200/60 dark:border-gray-700 shadow-sm'
            }
      p-5 focus-within:ring-4 focus-within:ring-[#14B8A6]/20 focus-within:border-[#14B8A6] focus-within:shadow-[0_8px_30px_rgba(20,184,166,0.15)]
    `}>
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount to {tradeMode}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Avail: {tradeMode === 'buy' ? usdcBalance : (side === 'yes' ? yesBalance : noBalance)}
                    </span>
                    <button
                        onClick={() => {
                            const maxValue = tradeMode === 'buy'
                                ? parseFloat(formatUnits(usdcBalanceRaw, 6))
                                : side === 'yes'
                                    ? parseFloat(formatUnits(yesBalanceRaw, 18))
                                    : parseFloat(formatUnits(noBalanceRaw, 18));
                            // Round to 3 decimal places to avoid "Insufficient shares" errors
                            const roundedValue = Math.floor(maxValue * 1000) / 1000;
                            setAmount(roundedValue.toString());
                        }}
                        className="text-[10px] font-bold text-[#14B8A6] bg-[#14B8A6]/10 hover:bg-[#14B8A6]/20 px-2.5 py-1 rounded-lg uppercase tracking-wide transition-colors active:scale-95"
                        disabled={!isTradeable}
                        aria-label="Set maximum amount"
                    >
                        Max
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 relative">
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
                    className="bg-transparent border-none text-4xl sm:text-5xl font-black text-gray-900 dark:text-white w-full focus:ring-0 p-0 placeholder:text-gray-300 dark:placeholder:text-gray-600 tabular-nums"
                    disabled={!isTradeable}
                    aria-label="Asset amount"
                />
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-inner">
                    <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                        {tradeMode === 'buy' ? 'USDC' : side === 'yes' ? 'YES' : 'NO'}
                    </span>
                </div>
            </div>
        </div>
    );
}
