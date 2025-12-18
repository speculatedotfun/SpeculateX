'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Holder } from '@/lib/marketTransformers';
import { Trophy, Copy, Check } from 'lucide-react';

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
    <div className="bg-white dark:bg-gray-800 rounded-[24px] p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col relative overflow-hidden">
      {/* Decorative gradient blob background */}
      <div 
        className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${
          holderTab === 'yes' ? 'from-emerald-500/10' : 'from-rose-500/10'
        } to-transparent rounded-bl-full -z-0 transition-colors duration-500 pointer-events-none`} 
      />

      <div className="flex items-center gap-2 mb-5 z-10">
        <Trophy className="w-4 h-4 text-yellow-500" aria-hidden="true" />
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Top Holders</h3>
      </div>

      {/* Improved Tabs */}
      <div className="flex bg-gray-100/50 dark:bg-gray-700/50 p-1.5 rounded-xl mb-6 relative z-10" role="group" aria-label="Holder side selection">
        <div
          className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-gray-600 rounded-[10px] shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            holderTab === 'no' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'
          }`}
          aria-hidden="true"
        />
        {(['yes', 'no'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setHolderTab(tab)}
            className={`relative flex-1 py-2 font-bold text-xs uppercase tracking-wider transition-colors z-10 flex items-center justify-center gap-2 ${
              holderTab === tab
                ? (tab === 'yes' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            role="radio"
            aria-checked={holderTab === tab}
            aria-label={`Show top ${tab.toUpperCase()} holders`}
          >
            {tab}
            <span className={`w-1.5 h-1.5 rounded-full transition-opacity duration-300 ${
                tab === 'yes' ? 'bg-emerald-500' : 'bg-rose-500'
            } ${holderTab === tab ? 'opacity-100 animate-pulse' : 'opacity-0'}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="space-y-1 flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 pr-2 z-10">
        <AnimatePresence mode="wait">
          {holderTab === 'yes' ? (
            topHoldersYes.length > 0 ? (
              <motion.div 
                key="list-yes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                 {topHoldersYes.map((holder, idx) => (
                  <HolderRow key={`yes-${holder.address}`} holder={holder} idx={idx} type="yes" />
                ))}
              </motion.div>
            ) : (
              <EmptyState key="empty-yes" text="No YES holders yet" />
            )
          ) : (
             topHoldersNo.length > 0 ? (
               <motion.div 
                key="list-no"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
               >
                {topHoldersNo.map((holder, idx) => (
                  <HolderRow key={`no-${holder.address}`} holder={holder} idx={idx} type="no" />
                ))}
               </motion.div>
            ) : (
              <EmptyState key="empty-no" text="No NO holders yet" />
            )
          )}
        </AnimatePresence>
      </div>

      {address && ((holderTab === 'yes' && parseFloat(yesBalance) > 0) || (holderTab === 'no' && parseFloat(noBalance) > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 z-10"
          role="region"
          aria-label="Your position value"
        >
          <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200/50 dark:border-gray-600/30">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" aria-hidden="true" />
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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(holder.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate a distinct gradient based on the address string
  const getGradient = (str: string) => {
    const hash = str.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      'from-blue-400 to-indigo-500',
      'from-purple-400 to-pink-500',
      'from-emerald-400 to-teal-500',
      'from-orange-400 to-rose-500',
      'from-cyan-400 to-blue-500'
    ];
    return colors[hash % colors.length];
  };

  return (
    <motion.div
      layout
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      whileHover={{ scale: 1.01 }}
      className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all group border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
      role="article"
      aria-label={`Rank ${idx + 1}: ${holder.address.slice(0, 6)}...${holder.address.slice(-4)}, holding $${holder.balanceUsd.toLocaleString()} worth of ${type.toUpperCase()} shares`}
    >
      <div className="flex items-center gap-3">
        {/* Rank / Avatar */}
        <div className="relative">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getGradient(holder.address)} flex items-center justify-center shadow-sm`} aria-label={`Rank ${idx + 1}`}>
            {isTop3 ? (
              <span className="text-sm filter drop-shadow-sm" aria-hidden="true">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-white/90">{idx + 1}</span>
            )}
          </div>
        </div>

        {/* Address with Copy */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          aria-label={`Copy address ${holder.address}`}
          title="Click to copy address"
        >
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 font-mono group-hover:text-[#14B8A6] transition-colors">
            {holder.address.slice(0, 4)}...{holder.address.slice(-4)}
          </span>
          {copied ? (
            <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
          ) : (
            <Copy className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Balance */}
      <span className={`text-xs font-black font-mono tracking-tight ${
        type === 'yes' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
      }`}>
        ${holder.balanceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </span>
    </motion.div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 0.5, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="text-center py-12"
      role="status"
      aria-label={text}
    >
      <div className="text-3xl mb-3 grayscale" aria-hidden="true">🍃</div>
      <div className="text-xs font-medium text-gray-400">{text}</div>
    </motion.div>
  );
}