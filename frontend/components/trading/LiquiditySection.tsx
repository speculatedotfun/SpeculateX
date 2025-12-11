import { ChangeEvent } from 'react';
import { formatUnits } from 'viem';
import { Droplets, Info, DollarSign } from 'lucide-react';

interface LiquiditySectionProps {
  vaultBase: number;
  lpShareFloat: number;
  userSharePct: number;
  pendingFeesFloat: number;
  pendingResidualFloat: number;
  lpFeePoolFloat: number;
  isResolved: boolean;
  addLiquidityAmount: string;
  setAddLiquidityAmount: (value: string) => void;
  liquidityRegex: RegExp;
  formatLiquidity: (num: number) => string;
  maxBuyAmount: number;
  canAddLiquidity: boolean;
  isLpProcessing: boolean;
  isBusy: boolean;
  isTradeable: boolean;
  pendingLpAction: null | 'add' | 'claim';
  pendingLpFeesValue: bigint;
  pendingLpResidualValue: bigint;
  handleAddLiquidity: () => void;
  handleClaimAllLp: () => void;
}

export function LiquiditySection({
  vaultBase,
  lpShareFloat,
  userSharePct,
  pendingFeesFloat,
  pendingResidualFloat,
  lpFeePoolFloat,
  isResolved,
  addLiquidityAmount,
  setAddLiquidityAmount,
  liquidityRegex,
  formatLiquidity,
  maxBuyAmount,
  canAddLiquidity,
  isLpProcessing,
  isBusy,
  isTradeable,
  pendingLpAction,
  pendingLpFeesValue,
  pendingLpResidualValue,
  handleAddLiquidity,
  handleClaimAllLp,
}: LiquiditySectionProps) {
  return (
    <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Droplets className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Liquidity Pool</h3>
        </div>
        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          Vault: ${vaultBase.toFixed(2)}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Your LP Shares</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {lpShareFloat.toFixed(2)} USDC <span className="text-gray-400 font-normal">({userSharePct.toFixed(2)}%)</span>
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Unclaimed Fees</span>
          <span className="font-bold text-green-600 dark:text-green-400">${pendingFeesFloat.toFixed(4)}</span>
        </div>
        {isResolved && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Residual Value</span>
            <span className="font-bold text-[#14B8A6]">${pendingResidualFloat.toFixed(4)}</span>
          </div>
        )}
        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
          <span className="text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" /> Global Fee Pool
          </span>
          <span className="font-mono text-gray-600 dark:text-gray-300">${lpFeePoolFloat.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 ml-1">
          Add Liquidity
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <input
            type="text"
            inputMode="decimal"
            pattern={liquidityRegex.source}
            value={addLiquidityAmount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              if (!val) { setAddLiquidityAmount(''); return; }
              if (!liquidityRegex.test(val)) return;
              if (val === '.' || val.endsWith('.')) { setAddLiquidityAmount(val); return; }
              const num = parseFloat(val);
              if (!Number.isFinite(num)) return;
              if (num > maxBuyAmount) return;
              setAddLiquidityAmount(formatLiquidity(num));
            }}
            placeholder="0.00"
            className="w-full h-12 pl-10 pr-20 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent outline-none transition-all"
            disabled={!isTradeable || isBusy || isLpProcessing}
          />
          <button
            onClick={() => {
              const maxString = Number.isFinite(maxBuyAmount) ? formatLiquidity(maxBuyAmount) : '0';
              setAddLiquidityAmount(maxString);
            }}
            className="absolute right-2 top-2 bottom-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 rounded-lg transition-colors uppercase tracking-wider"
            disabled={!isTradeable || isBusy || isLpProcessing}
          >
            Max
          </button>
        </div>
        
        <button
          onClick={handleAddLiquidity}
          disabled={!canAddLiquidity || isLpProcessing || isBusy || !isTradeable}
          className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {pendingLpAction === 'add' && isLpProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adding...
            </>
          ) : (
            'Add Liquidity'
          )}
        </button>
      </div>

      <button
        onClick={handleClaimAllLp}
        disabled={(pendingLpFeesValue === 0n && pendingLpResidualValue === 0n) || isLpProcessing}
        className="w-full h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {pendingLpAction === 'claim' && isLpProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Claiming...
          </>
        ) : (
          'Claim Rewards'
        )}
      </button>
    </div>
  );
}