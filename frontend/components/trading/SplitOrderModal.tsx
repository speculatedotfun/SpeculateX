import { AlertTriangle, ArrowRight } from 'lucide-react';

interface SplitOrderModalProps {
  show: boolean;
  totalSplitDisplay: string;
  splitChunkAmountDisplay: string;
  splitChunkCountDisplay: number;
  isTradeable: boolean;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SplitOrderModal({
  show,
  totalSplitDisplay,
  splitChunkAmountDisplay,
  splitChunkCountDisplay,
  isTradeable,
  isBusy,
  onCancel,
  onConfirm,
}: SplitOrderModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onCancel} />
      
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-800 transform transition-all scale-100">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">High Impact Trade</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium leading-relaxed">
            This trade exceeds the single-transaction price limit. We can split it into smaller chunks to execute it safely.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-3 mb-6 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Total Amount</span>
            <span className="font-bold text-gray-900 dark:text-white">{totalSplitDisplay} USDC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Chunk Size</span>
            <span className="font-bold text-gray-900 dark:text-white">{splitChunkAmountDisplay} USDC</span>
          </div>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Transactions</span>
            <span className="font-bold bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
              ~{splitChunkCountDisplay} Txs
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isTradeable || isBusy}
            className="flex-1 py-3 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold shadow-lg shadow-[#14B8A6]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            Execute Split <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}