'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Activity, TrendingUp, Calendar, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface MarketHeaderProps {
  market: any;
  resolution: any;
  totalVolume: number;
  totalVolumeDisplay: string;
  createdAtDate: Date | null;
  logoSrc: string;
  marketIsActive: boolean;
  marketIsCancelled?: boolean;
  yesPrice: number;
  expiryTimestamp: bigint;
  onLogoError: () => void;
}

export function MarketHeader({
  market,
  resolution,
  totalVolumeDisplay,
  createdAtDate,
  logoSrc,
  marketIsActive,
  marketIsCancelled = false,
  yesPrice,
  expiryTimestamp,
  onLogoError,
}: MarketHeaderProps) {
  const [showRules, setShowRules] = useState(false);

  const yesPercent = Math.round(yesPrice * 100);
  const noPercent = 100 - yesPercent;

  const startTime = resolution?.startTime ? BigInt(resolution.startTime) : 0n;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isScheduled = startTime > 0n && now < startTime;

  const dateStr = useMemo(() => {
    if (!expiryTimestamp) return 'N/A';
    const date = new Date(Number(expiryTimestamp) * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [expiryTimestamp]);

  // Determine dominant color based on sentiment
  const dominantColor = yesPercent >= 50 ? 'emerald' : 'rose';

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative mb-8 z-10"
      data-testid="market-header"
    >
      {/* Dynamic Background Glow */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${yesPercent >= 50 ? 'from-emerald-500/20 via-teal-500/10 to-emerald-500/20' : 'from-rose-500/20 via-red-500/10 to-rose-500/20'} rounded-[36px] blur-2xl opacity-50 -z-10 transition-colors duration-1000`} />

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[32px] shadow-2xl shadow-black/5 dark:shadow-black/50 border border-white/50 dark:border-gray-700/50 overflow-hidden ring-1 ring-black/5 dark:ring-white/5">

        {/* Main Content Area */}
        <div className="p-6 md:p-8 flex flex-col gap-8 relative z-10">

          {/* Top Row: Logo & Title */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Logo */}
            <div className="shrink-0 relative group">
              <div className={`absolute inset-0 bg-gradient-to-br ${yesPercent >= 50 ? 'from-emerald-400 to-teal-400' : 'from-rose-400 to-red-400'} rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white dark:bg-gray-800 p-2 shadow-lg ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center">
                <Image
                  src={logoSrc}
                  alt={market.question as string}
                  width={80}
                  height={80}
                  className="object-contain w-full h-full rounded-2xl group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                  onError={onLogoError}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              {/* Status Badge */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm ${marketIsCancelled
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    : isScheduled
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : marketIsActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                >
                  {marketIsActive && !isScheduled && !marketIsCancelled ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${marketIsCancelled ? 'bg-red-500' : isScheduled ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {marketIsCancelled ? 'Cancelled' : isScheduled ? 'Scheduled' : marketIsActive ? 'Live Market' : 'Closed'}
                  </span>
                </div>
                <time className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Opened {createdAtDate ? createdAtDate.toLocaleDateString() : '—'}
                </time>
              </div>

              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight mb-4">
                {market.question}
              </h1>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Volume */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2 mb-1 opacity-70">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">Volume</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                ${totalVolumeDisplay}
              </div>
            </div>

            {/* Deadline */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2 mb-1 opacity-70">
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">End Date</span>
              </div>
              <div className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none truncate">
                {new Date(Number(expiryTimestamp) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                {new Date(Number(expiryTimestamp) * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Sentiment (Wider on mobile) */}
            <div className="col-span-2 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2 opacity-70">
                  <TrendingUp className={`w-3.5 h-3.5 ${yesPercent >= 50 ? 'text-emerald-500' : 'text-rose-500'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">Sentiment</span>
                </div>
                <div className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">
                  {yesPercent}% Yes
                </div>
              </div>

              {/* Tug of War Bar */}
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative z-10 flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${yesPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-emerald-500 h-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${noPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-rose-500 h-full flex-1 relative"
                >
                  <div className="absolute inset-0 bg-black/10" />
                </motion.div>
              </div>

              <div className="flex justify-between mt-1 text-[10px] font-bold text-gray-400 uppercase relative z-10">
                <span className="text-emerald-600 dark:text-emerald-400">Yes ({yesPercent}%)</span>
                <span className="text-rose-600 dark:text-rose-400">No ({noPercent}%)</span>
              </div>

              {/* Background glow for sentiment */}
              <div className={`absolute -right-10 -bottom-10 w-32 h-32 bg-${dominantColor}-500/10 blur-2xl rounded-full pointer-events-none group-hover:bg-${dominantColor}-500/20 transition-colors`} />
            </div>
          </div>
        </div>

        {/* --- Rules Accordion --- */}
        <div className="border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full px-6 py-3 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-expanded={showRules}
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Resolution Rules
            </span>
            {showRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {showRules && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                  {resolution?.oracleType === 0 ? 'This market is resolved manually by the platform administrators.' : ''}
                  {resolution?.oracleType === 1 ? 'This market resolves automatically based on Chainlink oracle data at the expiration time.' : ''}
                  {!resolution && 'Standard resolution rules apply.'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}