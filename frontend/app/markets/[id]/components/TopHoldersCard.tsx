'use client';
import { motion } from 'framer-motion';
import type { Holder } from '@/lib/marketTransformers';
import { Trophy } from 'lucide-react';

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
    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Top Holders</h3>
      </div>
      
      {/* Tabs */}
      <div className="flex bg-gray-100/50 dark:bg-gray-700/50 p-1 rounded-xl mb-6 relative">
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
                ? (tab === 'yes' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-1 flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 pr-2">
        {holderTab === 'yes' ? (
          topHoldersYes.length > 0 ? (
            topHoldersYes.map((holder, idx) => (
              <HolderRow key={`yes-${holder.address}`} holder={holder} idx={idx} type="yes" />
            ))
          ) : (
            <EmptyState text="No YES holders yet" />
          )
        ) : (
          topHoldersNo.length > 0 ? (
            topHoldersNo.map((holder, idx) => (
              <HolderRow key={`no-${holder.address}`} holder={holder} idx={idx} type="no" />
            ))
          ) : (
            <EmptyState text="No NO holders yet" />
          )
        )}
      </div>

      {address && ((holderTab === 'yes' && parseFloat(yesBalance) > 0) || (holderTab === 'no' && parseFloat(noBalance) > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700"
        >
          <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200/50 dark:border-gray-600/30">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
               <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Your Position</span>
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
  );
}

function HolderRow({ holder, idx, type }: { holder: Holder, idx: number, type: 'yes' | 'no' }) {
  const isTop3 = idx < 3;
  return (
    <motion.div
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: idx * 0.05 }}
      className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          isTop3 
            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {idx + 1}
        </div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 font-mono">
          {holder.address.slice(0, 4)}...{holder.address.slice(-4)}
        </span>
      </div>
      <span className={`text-xs font-bold ${type === 'yes' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        ${holder.balanceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </span>
    </motion.div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 opacity-50">
      <div className="text-2xl mb-2">🍃</div>
      <div className="text-xs font-medium">{text}</div>
    </div>
  );
}