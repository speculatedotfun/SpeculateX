import { formatPrice } from '@/lib/tradingUtils';
import { Info } from 'lucide-react';

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
  if (!amount || parseFloat(amount) <= 0) return null;

  const isBuy = tradeMode === 'buy';

  return (
    <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 space-y-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
      
      {/* Price Impact Section */}
      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 border-dashed">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Price</div>
          <div className="font-mono font-bold text-gray-900 dark:text-white">{formatPrice(currentPrice)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">New Price</div>
          <div className={`font-mono font-bold ${newPrice !== currentPrice ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
            {formatPrice(newPrice)}
          </div>
        </div>
      </div>

      {/* Details List */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">
            {isBuy ? 'Est. Shares' : 'Shares to Sell'}
          </span>
          <span className="font-bold text-gray-900 dark:text-white">{shares.toFixed(4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">
            {isBuy ? 'Avg. Entry' : 'Receive per Share'}
          </span>
          <span className="font-bold text-gray-900 dark:text-white">
            {isBuy ? `$${avgPrice.toFixed(3)}` : shares > 0 ? `$${(costUsd / shares).toFixed(3)}` : '$0.000'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 group relative cursor-help">
            Fees <Info className="w-3 h-3" />
            {isBuy && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50">
                Treasury: {(feeTreasuryBps / 100).toFixed(2)}%<br/>
                Vault: {(feeVaultBps / 100).toFixed(2)}%<br/>
                LP: {(feeLpBps / 100).toFixed(2)}%
              </div>
            )}
          </span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {feePercent.toFixed(2)}% {feeUsd > 0 && <span className="text-gray-400">(${feeUsd.toFixed(2)})</span>}
          </span>
        </div>

        {gasEstimate && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Network Cost</span>
            <span className="font-mono text-xs text-gray-500">~{gasEstimate.toString()} wei</span>
          </div>
        )}
      </div>

      {/* Profit Projection (Buy Only) */}
      {isBuy && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 border-dashed space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">Potential ROI</span>
            <span className="font-bold text-green-500">+{maxProfitPct.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
            <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Max Payout</span>
            <span className="font-black text-green-700 dark:text-green-400">${maxPayout.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Sell Summary */}
      {!isBuy && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 border-dashed">
          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase">Total USDC Receive</span>
            <span className="font-black text-2xl text-blue-700 dark:text-blue-400">${costUsd.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}