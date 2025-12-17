import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (show) {
      confirmButtonRef.current?.focus();

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [show, onCancel]);

  useEffect(() => {
    if (!show) return;

    const focusableElements = document.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const modalElements = Array.from(focusableElements).filter(el =>
      el.closest('[role="dialog"]')
    );

    if (modalElements.length === 0) return;

    const firstElement = modalElements[0];
    const lastElement = modalElements[modalElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [show]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="split-modal-title" aria-describedby="split-modal-desc">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onCancel}
          aria-hidden="true"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full p-6 border border-gray-200 dark:border-gray-800"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400" aria-hidden="true">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 id="split-modal-title" className="text-xl font-black text-gray-900 dark:text-white">High Impact Trade</h3>
            <p id="split-modal-desc" className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium leading-relaxed">
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

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              ref={cancelButtonRef}
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              aria-label="Cancel split order"
            >
              Cancel
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              disabled={!isTradeable || isBusy}
              className="flex-1 py-3 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold shadow-lg shadow-[#14B8A6]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              aria-label={`Execute split order with ${splitChunkCountDisplay} transactions`}
              aria-disabled={!isTradeable || isBusy}
            >
              {isBusy ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  Execute Split <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}