'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Loader2, Zap, AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface TradeActionButtonsProps {
    isConnected: boolean;
    isBusy: boolean;
    isTradeable: boolean;
    tradeMode: 'buy' | 'sell';
    side: 'yes' | 'no';
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
    side,
    amount,
    canBuy,
    canSell,
    usdcAllowanceValue,
    amountBigInt,
    busyLabel,
    handleTrade,
    openConnectModal,
}: TradeActionButtonsProps) {
    const needsApproval = tradeMode === 'buy' && (usdcAllowanceValue === undefined || usdcAllowanceValue < amountBigInt);
    const isValid = tradeMode === 'buy' ? canBuy : canSell;
    const amountNum = parseFloat(amount || '0');
    const hasAmount = amountNum > 0;
    const isYes = side === 'yes';

    // Determine button state and messaging
    const getButtonConfig = () => {
        if (!isConnected) {
            return {
                label: 'Connect Wallet',
                subLabel: 'Start trading by connecting your wallet',
                icon: <Wallet className="w-5 h-5" />,
                disabled: false,
                variant: 'connect' as const,
                action: openConnectModal,
            };
        }

        if (!isTradeable) {
            return {
                label: 'Market Closed',
                subLabel: 'This market is no longer accepting trades',
                icon: <AlertCircle className="w-5 h-5" />,
                disabled: true,
                variant: 'disabled' as const,
            };
        }

        if (isBusy) {
            return {
                label: busyLabel || 'Processing...',
                subLabel: 'Please wait for transaction confirmation',
                icon: <Loader2 className="w-5 h-5 animate-spin" />,
                disabled: true,
                variant: 'loading' as const,
            };
        }

        if (!hasAmount) {
            return {
                label: 'Enter Amount',
                subLabel: 'Please specify how much you want to trade',
                icon: <DollarSign className="w-5 h-5" />,
                disabled: true,
                variant: 'disabled' as const,
            };
        }

        if (!isValid) {
            return {
                label: 'Insufficient Balance',
                subLabel: `You don't have enough ${tradeMode === 'buy' ? 'USDC' : side.toUpperCase()}`,
                icon: <AlertCircle className="w-5 h-5" />,
                disabled: true,
                variant: 'error' as const,
            };
        }

        // Main CTA - Buy YES or Buy NO (or Sell)
        const actionLabel = tradeMode === 'buy'
            ? `Buy ${side.toUpperCase()}`
            : `Sell ${side.toUpperCase()}`;

        return {
            label: needsApproval ? `Approve & ${actionLabel}` : actionLabel,
            subLabel: needsApproval ? 'Allow SpeculateX to use your USDC' : `Place your ${side.toUpperCase()} ${tradeMode} order`,
            icon: isYes ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
            disabled: false,
            variant: tradeMode === 'buy' ? (isYes ? 'yes' : 'no') : 'sell' as const,
            action: handleTrade,
        };
    };

    const config = getButtonConfig();

    const variantStyles = {
        connect: 'bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 active:scale-95 active:shadow-teal-500/20 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 focus:ring-offset-gray-900',
        yes: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 active:shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-gray-900',
        no: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 active:shadow-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-gray-900',
        sell: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 active:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900',
        disabled: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 active:scale-100 focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 focus:ring-offset-gray-900',
        error: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 border border-rose-100 dark:border-rose-800/50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-gray-900',
        loading: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 cursor-wait active:scale-100 focus:outline-none',
    };

    return (
        <div className="space-y-3">
            <button
                onClick={config.action}
                disabled={config.disabled}
                className={`
                    w-full py-4 rounded-2xl font-black text-lg tracking-wide transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden
                    ${variantStyles[config.variant as keyof typeof variantStyles]}
                    ${config.disabled ? 'cursor-not-allowed opacity-90 dark:opacity-100' : 'cursor-pointer'}
                `}
            >
                {config.icon}
                <span>{config.label}</span>

                {/* Shimmer effect for active button */}
                {(config.variant === 'yes' || config.variant === 'no' || config.variant === 'connect') && !config.disabled && (
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%]"
                        animate={{ x: '200%' }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                )}
            </button>

            <AnimatePresence mode="wait">
                <motion.div
                    key={config.subLabel}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="text-center"
                >
                    <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${config.variant === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-gray-500 dark:text-gray-400'}`}>
                        {config.subLabel}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
