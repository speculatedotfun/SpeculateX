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

  return (
    <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Redeem Winnings</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleRedeem(true)}
          disabled={yesBalanceRaw === 0n || !resolution?.yesWins || isBusy}
          className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-left disabled:opacity-50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <div className="text-xl font-bold text-green-800 dark:text-green-400">Yes</div>
          <div className="text-xs text-green-700 dark:text-green-300">Balance: {yesBalance}</div>
        </button>
        <button
          onClick={() => handleRedeem(false)}
          disabled={noBalanceRaw === 0n || resolution?.yesWins || isBusy}
          className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-left disabled:opacity-50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <div className="text-xl font-bold text-red-800 dark:text-red-400">No</div>
          <div className="text-xs text-red-700 dark:text-red-300">Balance: {noBalance}</div>
        </button>
      </div>
    </div>
  );
}






