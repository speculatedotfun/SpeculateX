import { Info, Sparkles, Wallet, Percent, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TradePreviewProps {
  amount: string;
  tradeMode: 'buy' | 'sell';
  side?: 'yes' | 'no';
  currentPrice: number;
  newPrice: number;
  shares: number;
  avgPrice: number;
  costUsd: number;
  feeUsd: number;
  feePercent: number;
  maxProfit: number;
  maxProfitPct: number;
  maxPayout: number;
  gasEstimate: bigint | null;
  feeTreasuryBps: number;
  feeVaultBps: number;
  feeLpBps: number;
  tradeMultiple: number;
}

export function TradePreview({
  amount,
  tradeMode,
  side = 'yes',
  currentPrice,
  newPrice,
  shares,
  avgPrice,
  costUsd,
  feeUsd,
  feePercent,
  maxProfit,
  maxProfitPct,
  maxPayout,
  feeTreasuryBps,
  feeVaultBps,
  feeLpBps,
}: TradePreviewProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!amount || parseFloat(amount) <= 0) return null;

  const isBuy = tradeMode === 'buy';
  const isYes = side === 'yes';
  const amountNum = parseFloat(amount);
  const priceImpact = currentPrice > 0 ? ((newPrice - currentPrice) / currentPrice) * 100 : 0;

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
      role="region"
      aria-label="Order Summary"
    >
      {/* SECTION 1: MAIN INFO (Primary) */}
      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {isBuy ? 'You Receive' : 'You are Selling'}
          </span>
          {priceImpact > 1 && (
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {priceImpact.toFixed(1)}% impact
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black tabular-nums ${isYes ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
            {shares.toFixed(2)}
          </span>
          <span className={`text-xs font-bold uppercase tracking-wider ${isYes ? 'text-emerald-500' : 'text-rose-500'}`}>
            {side} Shares
          </span>
        </div>

        {/* Action button to show more details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors uppercase tracking-widest"
        >
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Details
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-1.5 border-t border-gray-100 dark:border-gray-800 mt-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400">Avg. Price</span>
                  <span className="font-bold text-gray-600 dark:text-gray-300">{(avgPrice * 100).toFixed(1)}¢</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400">Trading Fee</span>
                  <span className="font-bold text-gray-600 dark:text-gray-300">{feeUsd.toFixed(2)} USDC ({feePercent.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400">You Pay</span>
                  <span className="font-bold text-gray-600 dark:text-gray-300">{amountNum.toFixed(2)} USDC</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 2: OUTCOME (Secondary but important) */}
      {isBuy ? (
        <div className={`p-4 border-t border-gray-100 dark:border-gray-800 ${isYes ? 'bg-emerald-500/[0.02]' : 'bg-rose-500/[0.02]'}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                If {side.toUpperCase()} Wins
              </div>
              <div className={`text-xl font-black tabular-nums ${isYes ? 'text-emerald-500' : 'text-rose-500'}`}>
                +${maxProfit.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">ROI</div>
              <div className={`text-sm font-black ${isYes ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                {maxProfitPct.toFixed(0)}%
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10px] font-bold text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Max Payout: ${maxPayout.toFixed(2)} USDC
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-blue-500/[0.02]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Total Receive
            </span>
            <span className="text-xl font-black text-blue-500 tabular-nums">
              ${costUsd.toFixed(2)} USDC
            </span>
          </div>
        </div>
      )}
    </div>
  );
}