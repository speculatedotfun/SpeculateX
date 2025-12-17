import { ChangeEvent, useState } from 'react';
import { formatUnits } from 'viem';
import { Droplets, Info, DollarSign, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [validationError, setValidationError] = useState<string>('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValidationError('');

    if (!val) {
      setAddLiquidityAmount('');
      return;
    }
    if (!liquidityRegex.test(val)) return;
    if (val === '.' || val.endsWith('.')) {
      setAddLiquidityAmount(val);
      return;
    }
    const num = parseFloat(val);
    if (!Number.isFinite(num)) return;

    if (num > maxBuyAmount) {
      setValidationError(`Amount exceeds available balance ($${maxBuyAmount.toFixed(2)})`);
      return;
    }

    setAddLiquidityAmount(formatLiquidity(num));
  };

  const hasClaimableRewards = pendingLpFeesValue > 0n || pendingLpResidualValue > 0n;

  return (
    <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6" role="region" aria-label="Liquidity provider section">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg" aria-hidden="true">
            <Droplets className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Liquidity Pool</h3>
        </div>
        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 self-start sm:self-auto">
          <span className="sr-only">Total vault balance:</span>
          Vault: ${vaultBase.toFixed(2)}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 space-y-3">
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Your LP Shares</span>
          <span className="font-bold text-gray-900 dark:text-white text-right">
            <span className="block sm:inline">{lpShareFloat.toFixed(2)} USDC</span>
            <span className="text-gray-400 font-normal text-xs ml-0 sm:ml-1 block sm:inline">({userSharePct.toFixed(2)}%)</span>
          </span>
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Unclaimed Fees</span>
          <span className="font-bold text-green-600 dark:text-green-400 tabular-nums">
            ${pendingFeesFloat.toFixed(4)}
            {hasClaimableRewards && <span className="sr-only">Available to claim</span>}
          </span>
        </div>
        {isResolved && (
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Residual Value</span>
            <span className="font-bold text-[#14B8A6] tabular-nums">${pendingResidualFloat.toFixed(4)}</span>
          </div>
        )}
        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
          <span className="text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" aria-hidden="true" /> Global Fee Pool
          </span>
          <span className="font-mono text-gray-600 dark:text-gray-300 tabular-nums">${lpFeePoolFloat.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="liquidity-amount-input" className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 ml-1">
          Add Liquidity
        </label>
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true">
              <DollarSign className="w-4 h-4" />
            </div>
            <input
              id="liquidity-amount-input"
              type="text"
              inputMode="decimal"
              pattern={liquidityRegex.source}
              value={addLiquidityAmount}
              onChange={handleInputChange}
              placeholder="0.00"
              className={`w-full h-12 pl-10 pr-20 rounded-xl bg-white dark:bg-gray-900 border ${
                validationError
                  ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-[#14B8A6]'
              } text-gray-900 dark:text-white font-bold focus:ring-2 focus:border-transparent outline-none transition-all`}
              disabled={!isTradeable || isBusy || isLpProcessing}
              aria-label="Liquidity amount in USDC"
              aria-invalid={!!validationError}
              aria-describedby={validationError ? "liquidity-error" : undefined}
            />
            <button
              onClick={() => {
                const maxString = Number.isFinite(maxBuyAmount) ? formatLiquidity(maxBuyAmount) : '0';
                setAddLiquidityAmount(maxString);
                setValidationError('');
              }}
              className="absolute right-2 top-2 bottom-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 rounded-lg transition-colors uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:ring-offset-1"
              disabled={!isTradeable || isBusy || isLpProcessing}
              aria-label={`Set maximum amount: ${maxBuyAmount.toFixed(2)} USDC`}
              type="button"
            >
              Max
            </button>
          </div>

          <AnimatePresence>
            {validationError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                id="liquidity-error"
                className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg"
                role="alert"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{validationError}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleAddLiquidity}
          disabled={!canAddLiquidity || isLpProcessing || isBusy || !isTradeable || !!validationError}
          className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          aria-label={`Add liquidity${addLiquidityAmount ? `: ${addLiquidityAmount} USDC` : ''}`}
        >
          {pendingLpAction === 'add' && isLpProcessing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              <span>Adding...</span>
            </>
          ) : (
            'Add Liquidity'
          )}
        </button>
      </div>

      <button
        onClick={handleClaimAllLp}
        disabled={!hasClaimableRewards || isLpProcessing}
        className="w-full h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label={`Claim rewards: ${pendingFeesFloat.toFixed(4)} fees${isResolved ? ` and ${pendingResidualFloat.toFixed(4)} residual` : ''}`}
        aria-disabled={!hasClaimableRewards}
      >
        {pendingLpAction === 'claim' && isLpProcessing ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"
            />
            <span>Claiming...</span>
          </>
        ) : (
          <>
            Claim Rewards
            {hasClaimableRewards && (
              <span className="ml-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-bold">
                ${(pendingFeesFloat + pendingResidualFloat).toFixed(2)}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}