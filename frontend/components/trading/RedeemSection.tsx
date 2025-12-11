import { Check, X } from 'lucide-react';

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
    <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Claim Winnings</h3>
        <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-500">
          Result: <span className={yesWins ? 'text-green-600' : 'text-red-600'}>{yesWins ? 'YES' : 'NO'}</span>
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleRedeem(true)}
          disabled={yesBalanceRaw === 0n || !yesWins || isBusy}
          className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
            yesWins
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-400 hover:shadow-lg hover:shadow-green-500/10 cursor-pointer'
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
          }`}
        >
          {yesWins && <div className="absolute top-3 right-3 text-green-600"><Check className="w-5 h-5" /></div>}
          <div className="text-sm font-bold uppercase tracking-wider mb-1">YES Shares</div>
          <div className="text-2xl font-black">{parseFloat(yesBalance).toFixed(2)}</div>
          {yesWins && yesBalanceRaw > 0n && <div className="mt-2 text-xs font-bold text-green-600 bg-white/50 px-2 py-1 rounded inline-block">Redeemable</div>}
        </button>

        <button
          onClick={() => handleRedeem(false)}
          disabled={noBalanceRaw === 0n || yesWins || isBusy}
          className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
            !yesWins
              ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-400 hover:shadow-lg hover:shadow-red-500/10 cursor-pointer'
              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
          }`}
        >
          {!yesWins && <div className="absolute top-3 right-3 text-red-600"><Check className="w-5 h-5" /></div>}
          <div className="text-sm font-bold uppercase tracking-wider mb-1">NO Shares</div>
          <div className="text-2xl font-black">{parseFloat(noBalance).toFixed(2)}</div>
          {!yesWins && noBalanceRaw > 0n && <div className="mt-2 text-xs font-bold text-red-600 bg-white/50 px-2 py-1 rounded inline-block">Redeemable</div>}
        </button>
      </div>
    </div>
  );
}