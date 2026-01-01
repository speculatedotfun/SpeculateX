'use client';

import { motion } from 'framer-motion';
import { Wallet, Loader2, ArrowRightLeft } from 'lucide-react';

interface TradeActionButtonsProps {
    isConnected: boolean;
    isBusy: boolean;
    isTradeable: boolean;
    tradeMode: 'buy' | 'sell';
    amount: string;
    canBuy: boolean;
    canSell: boolean;
    usdcAllowanceValue?: bigint;
    amountBigInt: bigint;
    busyLabel: string;
    handleTrade: () => void;
    openConnectModal?: () => void;
}

export function TradeActionButtons({
    isConnected,
    isBusy,
    isTradeable,
    tradeMode,
    amount,
    canBuy,
    canSell,
    usdcAllowanceValue,
    amountBigInt,
    busyLabel,
    handleTrade,
    openConnectModal,
}: TradeActionButtonsProps) {
    if (!isConnected) {
        return (
            <button
                onClick={openConnectModal}
                className="w-full py-5 rounded-[24px] bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-black text-lg shadow-xl shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
                <Wallet className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                Connect Wallet to Trade
            </button>
        );
    }

    const needsApproval = tradeMode === 'buy' && (usdcAllowanceValue === undefined || usdcAllowanceValue < amountBigInt);
    const isValid = tradeMode === 'buy' ? canBuy : canSell;
    const isDisabled = !isTradeable || isBusy || !amount || parseFloat(amount) <= 0 || !isValid;

    return (
        <button
            onClick={handleTrade}
            disabled={isDisabled}
            className={`
        w-full py-5 rounded-[24px] font-black text-xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group
        ${isDisabled
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none border border-gray-200 dark:border-gray-700'
                    : 'bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white shadow-teal-500/20 hover:shadow-teal-500/40 hover:-translate-y-0.5'
                }
      `}
        >
            {isBusy ? (
                <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="animate-pulse">{busyLabel || 'Processing...'}</span>
                </>
            ) : (
                <>
                    <ArrowRightLeft className={`w-6 h-6 transition-transform ${!isDisabled ? 'group-hover:rotate-180 duration-500' : ''}`} />
                    <span>
                        {needsApproval ? 'Approve & ' : ''}
                        {tradeMode === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
                    </span>
                </>
            )}

            {!isDisabled && (
                <motion.div
                    className="absolute inset-0 bg-white/20 translate-x-[-100%]"
                    animate={{ x: '200%' }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
            )}
        </button>
    );
}
