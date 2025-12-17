import { Check, X, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface RedeemSectionProps {
  isResolved: boolean;
  yesBalance: string;
  noBalance: string;
  yesBalanceRaw: bigint;
  noBalanceRaw: bigint;
  resolution: any;
  isBusy: boolean;
  handleRedeem: (isYes: boolean) => void;
}

export function RedeemSection({
  isResolved,
  yesBalance,
  noBalance,
  yesBalanceRaw,
  noBalanceRaw,
  resolution,
  isBusy,
  handleRedeem,
}: RedeemSectionProps) {
  if (!isResolved) return null;

  const yesWins = resolution?.yesWins;

  return (
    <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4" role="region" aria-label="Redeem winnings section">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Claim Winnings</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
            Result: <span className={`font-black ${yesWins ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} role="status">{yesWins ? 'YES' : 'NO'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <motion.button
          onClick={() => handleRedeem(true)}
          disabled={yesBalanceRaw === 0n || !yesWins || isBusy}
          whileHover={yesWins && yesBalanceRaw > 0n && !isBusy ? { scale: 1.02 } : {}}
          whileTap={yesWins && yesBalanceRaw > 0n && !isBusy ? { scale: 0.98 } : {}}
          className={`relative p-4 rounded-2xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            yesWins
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-400 hover:shadow-lg hover:shadow-green-500/10 cursor-pointer focus:ring-green-500'
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
          } disabled:cursor-not-allowed`}
          aria-label={`Redeem ${parseFloat(yesBalance).toFixed(2)} YES shares${yesWins ? ' - Winner' : ' - Not redeemable'}`}
          aria-disabled={yesBalanceRaw === 0n || !yesWins || isBusy}
        >
          {yesWins && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="absolute top-3 right-3 text-green-600 dark:text-green-400"
              aria-hidden="true"
            >
              <Check className="w-5 h-5" />
            </motion.div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs sm:text-sm font-bold uppercase tracking-wider">YES Shares</div>
            {yesWins && (
              <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" aria-label="Winning outcome" />
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black tabular-nums">{parseFloat(yesBalance).toFixed(2)}</div>
          {yesWins && yesBalanceRaw > 0n && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 bg-white/50 dark:bg-white/10 px-2.5 py-1 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Redeemable
            </div>
          )}
          {yesBalanceRaw === 0n && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No shares to redeem</p>
          )}
        </motion.button>

        <motion.button
          onClick={() => handleRedeem(false)}
          disabled={noBalanceRaw === 0n || yesWins || isBusy}
          whileHover={!yesWins && noBalanceRaw > 0n && !isBusy ? { scale: 1.02 } : {}}
          whileTap={!yesWins && noBalanceRaw > 0n && !isBusy ? { scale: 0.98 } : {}}
          className={`relative p-4 rounded-2xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            !yesWins
              ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-400 hover:shadow-lg hover:shadow-red-500/10 cursor-pointer focus:ring-red-500'
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
          } disabled:cursor-not-allowed`}
          aria-label={`Redeem ${parseFloat(noBalance).toFixed(2)} NO shares${!yesWins ? ' - Winner' : ' - Not redeemable'}`}
          aria-disabled={noBalanceRaw === 0n || yesWins || isBusy}
        >
          {!yesWins && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="absolute top-3 right-3 text-red-600 dark:text-red-400"
              aria-hidden="true"
            >
              <Check className="w-5 h-5" />
            </motion.div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs sm:text-sm font-bold uppercase tracking-wider">NO Shares</div>
            {!yesWins && (
              <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" aria-label="Winning outcome" />
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black tabular-nums">{parseFloat(noBalance).toFixed(2)}</div>
          {!yesWins && noBalanceRaw > 0n && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400 bg-white/50 dark:bg-white/10 px-2.5 py-1 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Redeemable
            </div>
          )}
          {noBalanceRaw === 0n && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No shares to redeem</p>
          )}
        </motion.button>
      </div>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic pt-2" role="note">
        Click to redeem your winning shares for USDC
      </p>
    </div>
  );
}