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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6 space-y-4 border border-gray-200 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Split Order Confirmation</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            This buy would exceed the single-transaction price jump limit. We will execute it in smaller chunks.
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex justify-between">
            <span>Total buy</span>
            <span className="font-semibold text-gray-900 dark:text-white">{totalSplitDisplay} USDC</span>
          </div>
          <div className="flex justify-between">
            <span>Chunk size</span>
            <span className="font-semibold text-gray-900 dark:text-white">{splitChunkAmountDisplay} USDC</span>
          </div>
          {splitChunkCountDisplay > 0 && (
            <div className="flex justify-between">
              <span>Estimated chunks</span>
              <span className="font-semibold text-gray-900 dark:text-white">{splitChunkCountDisplay}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isTradeable || isBusy}
            className="flex-1 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Split & Execute
          </button>
        </div>
      </div>
    </div>
  );
}






