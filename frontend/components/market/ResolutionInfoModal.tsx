'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';

interface ResolutionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  expiryTimestamp: bigint;
}

export function ResolutionInfoModal({ isOpen, onClose, expiryTimestamp }: ResolutionInfoModalProps) {
  const expiryTime = new Date(Number(expiryTimestamp) * 1000);
  const expiryTimeStr = expiryTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const expiryDateStr = expiryTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                    <Info className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    How is the final price determined?
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Main explanation */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">Default Resolution</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        The market resolves using the first Chainlink Price Feed update <strong>AFTER</strong> the expiry time (e.g., after {expiryTimeStr} on {expiryDateStr}).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">SLA (5-minute window)</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        If that first update arrives within <strong>5 minutes</strong> of expiry, that price is the final price.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">Fallback (TWAP)</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        If the first update is later than 5 minutes, but Chainlink updates exist covering the full {expiryTimeStr}–{new Date(expiryTime.getTime() + 5 * 60 * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} window, we resolve using a <strong>5-minute time-weighted average price (TWAP)</strong> over that window.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">Late Resolution</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        If no update exists after {new Date(expiryTime.getTime() + 5 * 60 * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}, the market resolves as soon as the first update after {expiryTimeStr} becomes available (can be delayed).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Why not exactly at expiry */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">Why not exactly at {expiryTimeStr}?</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Chainlink Price Feeds update based on market movement/heartbeat, not every second. We use a deterministic rule so resolution is fair and cannot be gamed.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

