'use client';
import { motion } from 'framer-motion';
import type { Holder } from '@/lib/marketTransformers';

interface TopHoldersCardProps {
  holderTab: 'yes' | 'no';
  setHolderTab: (tab: 'yes' | 'no') => void;
  topHoldersYes: Holder[];
  topHoldersNo: Holder[];
  address?: string;
  yesBalance: string;
  noBalance: string;
  priceYes: number;
  priceNo: number;
}

export function TopHoldersCard({
  holderTab,
  setHolderTab,
  topHoldersYes,
  topHoldersNo,
  address,
  yesBalance,
  noBalance,
  priceYes,
  priceNo,
}: TopHoldersCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700">
      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Top Holders</h3>
      
      {/* Tabs */}
      <div className="flex bg-gray-100/80 dark:bg-gray-700/50 p-1 rounded-xl mb-6 relative backdrop-blur-sm">
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-600 rounded-lg shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            holderTab === 'no' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
          }`}
        />
        {(['yes', 'no'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setHolderTab(tab)}
            className={`relative flex-1 py-2 font-bold text-xs uppercase tracking-wider transition-colors z-10 ${
              holderTab === tab 
                ? (tab === 'yes' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab} Holders
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {holderTab === 'yes' ? (
          topHoldersYes.length > 0 ? (
            topHoldersYes.map((holder, idx) => (
              <motion.div
                key={`yes-${holder.address}`}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-mono">
                    {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">${holder.balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-2 opacity-20">🤷‍♂️</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">No YES holders yet</div>
            </div>
          )
        ) : (
          topHoldersNo.length > 0 ? (
            topHoldersNo.map((holder, idx) => (
              <motion.div
                key={`no-${holder.address}`}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-mono">
                    {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">${holder.balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-2 opacity-20">🤷‍♂️</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">No NO holders yet</div>
            </div>
          )
        )}

        {address && ((holderTab === 'yes' && parseFloat(yesBalance) > 0) || (holderTab === 'no' && parseFloat(noBalance) > 0)) && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700"
          >
            <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
                 <span className="text-sm font-bold text-gray-900 dark:text-white">Your Position</span>
              </div>
              <span className="text-sm font-black text-[#14B8A6]">
                ${(holderTab === 'yes' 
                  ? parseFloat(yesBalance) * priceYes 
                  : parseFloat(noBalance) * priceNo
                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}





