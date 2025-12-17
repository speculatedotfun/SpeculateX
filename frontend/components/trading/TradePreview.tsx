import { formatPrice } from '@/lib/tradingUtils';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

interface TradePreviewProps {
  amount: string;
  tradeMode: 'buy' | 'sell';
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
  gasEstimate,
  feeTreasuryBps,
  feeVaultBps,
  feeLpBps,
  tradeMultiple,
}: TradePreviewProps) {
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  if (!amount || parseFloat(amount) <= 0) return null;

  const isBuy = tradeMode === 'buy';
  const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100;
  const isPriceIncrease = newPrice > currentPrice;

  return (
    <div
      className="bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 space-y-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200"
      role="region"
      aria-label="Trade preview summary"
    >

      {/* Price Impact Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 border-dashed">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            Current Price
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-gray-900 dark:text-white">{formatPrice(currentPrice)}</div>
        </div>
        <div className="sm:text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1 justify-end sm:justify-center">
            Price Impact
          </div>
          <div className={`font-mono font-bold text-base sm:text-lg flex items-center gap-1 justify-end sm:justify-center ${
            Math.abs(priceImpact) > 5 ? 'text-amber-600 dark:text-amber-400' :
            Math.abs(priceImpact) > 2 ? 'text-orange-600 dark:text-orange-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {isPriceIncrease ? <TrendingUp className="w-4 h-4" aria-hidden="true" /> : <TrendingDown className="w-4 h-4" aria-hidden="true" />}
            {priceImpact > 0 ? '+' : ''}{priceImpact.toFixed(2)}%
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1 sm:text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">New Price</div>
          <div className={`font-mono font-bold text-base sm:text-lg ${newPrice !== currentPrice ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {formatPrice(newPrice)}
          </div>
        </div>
      </div>

      {/* Details List */}
      <div className="space-y-2.5" role="list">
        <div className="flex justify-between items-center" role="listitem">
          <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {isBuy ? 'Est. Shares' : 'Shares to Sell'}
          </span>
          <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base tabular-nums">{shares.toFixed(4)}</span>
        </div>
        <div className="flex justify-between items-center" role="listitem">
          <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {isBuy ? 'Avg. Entry' : 'Receive per Share'}
          </span>
          <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base tabular-nums">
            {isBuy ? `$${avgPrice.toFixed(3)}` : shares > 0 ? `$${(costUsd / shares).toFixed(3)}` : '$0.000'}
          </span>
        </div>

        <div className="flex justify-between items-center" role="listitem">
          <button
            onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowFeeBreakdown(!showFeeBreakdown);
              }
            }}
            className="text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:ring-offset-1 rounded-sm text-xs sm:text-sm"
            aria-label={`Trading fees: ${feePercent.toFixed(2)} percent. ${showFeeBreakdown ? 'Hide' : 'Show'} fee breakdown`}
            aria-expanded={showFeeBreakdown}
          >
            Fees <Info className="w-3 h-3" aria-hidden="true" />
          </button>
          <span className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base tabular-nums">
            {feePercent.toFixed(2)}% {feeUsd > 0 && <span className="text-gray-400 text-xs">(${feeUsd.toFixed(2)})</span>}
          </span>
        </div>

        {showFeeBreakdown && isBuy && (
          <div className="pl-4 py-2 bg-gray-100/50 dark:bg-gray-700/30 rounded-lg space-y-1 text-xs" role="region" aria-label="Fee breakdown">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Treasury Fee</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{(feeTreasuryBps / 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Vault Fee</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{(feeVaultBps / 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">LP Fee</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{(feeLpBps / 100).toFixed(2)}%</span>
            </div>
          </div>
        )}

        {gasEstimate && (
          <div className="flex justify-between items-center text-xs" role="listitem">
            <span className="text-gray-500 dark:text-gray-400">Est. Network Cost</span>
            <span className="font-mono text-gray-500 dark:text-gray-400">~{gasEstimate.toString()} wei</span>
          </div>
        )}
      </div>

      {/* Profit Projection (Buy Only) */}
      {isBuy && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 border-dashed space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Potential ROI</span>
            <span className="font-bold text-green-600 dark:text-green-400 text-sm sm:text-base">+{maxProfitPct.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800/30">
            <span className="text-xs sm:text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">Max Payout</span>
            <span className="font-black text-xl sm:text-2xl text-green-700 dark:text-green-400 tabular-nums">${maxPayout.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Sell Summary */}
      {!isBuy && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 border-dashed">
          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <span className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Total USDC Receive</span>
            <span className="font-black text-xl sm:text-2xl text-blue-700 dark:text-blue-400 tabular-nums">${costUsd.toFixed(2)}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center pt-2" role="note">
        All values are estimates and may vary based on market conditions
      </p>
    </div>
  );
}