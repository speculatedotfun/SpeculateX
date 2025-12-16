'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Activity, TrendingUp, Calendar } from 'lucide-react';

interface MarketHeaderProps {
  market: any;
  resolution: any;
  totalVolume: number;
  totalVolumeDisplay: string;
  createdAtDate: Date | null;
  logoSrc: string;
  marketIsActive: boolean;
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
  yesPrice,
  expiryTimestamp,
  onLogoError,
}: MarketHeaderProps) {
  
  const yesPercent = Math.round(yesPrice * 100);
  
  const dateStr = useMemo(() => {
    if (!expiryTimestamp) return 'N/A';
    const date = new Date(Number(expiryTimestamp) * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [expiryTimestamp]);

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/20 dark:border-gray-700/50 mb-8 overflow-hidden relative isolate"
      data-testid="market-header"
    >
      <div className="p-6 sm:p-8 relative z-10 flex flex-col gap-8">
        
        {/* --- Top Section: Status & Main Info --- */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Logo Container with Glow */}
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white dark:bg-gray-900 p-2 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden">
              <Image
                src={logoSrc}
                alt={market.question as string}
                width={80}
                height={80}
                className="object-contain w-full h-full rounded-2xl transition-transform duration-500 group-hover:scale-110"
                unoptimized
                onError={onLogoError}
              />
            </div>
          </div>

          {/* Title & Meta */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-3 mb-3">
               <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm ${
                marketIsActive 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {marketIsActive ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {marketIsActive ? 'Live Market' : 'Closed'}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                Created {createdAtDate ? createdAtDate.toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '—'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight mb-2 text-balance">
              {market.question}
            </h1>
          </div>
        </div>

        {/* --- 3D Stats Dashboard (Integrated) --- */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 shadow-inner group">
            
            {/* Left 3D Decoration */}
            <div className="absolute left-0 bottom-0 top-0 w-32 md:w-64 opacity-100 pointer-events-none z-0">
               <Image 
                 src="/leftside.png" 
                 alt="" 
                 fill 
                 className="object-contain object-left-bottom transform transition-transform duration-700 group-hover:scale-105 origin-bottom-left"
               />
            </div>

            {/* Right 3D Decoration */}
            <div className="absolute right-0 top-0 bottom-0 w-32 md:w-64 opacity-100 pointer-events-none z-0">
               <Image 
                 src="/rightside.png" 
                 alt="" 
                 fill 
                 className="object-contain object-right-top transform transition-transform duration-700 group-hover:scale-105 origin-top-right"
               />
            </div>

            {/* Stats Content Layer */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700/50 py-6">
                
                {/* Volume Stat */}
                <div className="flex flex-col items-center justify-center p-4 text-center">
                    <div className="flex items-center gap-2 mb-1 opacity-70">
                        <Activity className="w-4 h-4 text-[#14B8A6]" />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Volume</span>
                    </div>
                    <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                       ${totalVolumeDisplay}
                    </span>
                </div>

                {/* Sentiment Stat */}
                <div className="flex flex-col items-center justify-center p-4 text-center bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1 opacity-70">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sentiment</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-4xl font-black tracking-tighter ${yesPercent >= 50 ? 'text-[#14B8A6]' : 'text-rose-500'}`}>
                            {yesPercent}%
                        </span>
                        <span className="text-sm font-bold text-gray-400 uppercase">Yes</span>
                    </div>
                </div>

                {/* Deadline Stat */}
                <div className="flex flex-col items-center justify-center p-4 text-center">
                    <div className="flex items-center gap-2 mb-1 opacity-70">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Deadline</span>
                    </div>
                    <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                       {dateStr}
                    </span>
                </div>

            </div>
        </div>

        {/* --- Rules Footer (Compact) --- */}
        <div className="flex flex-col sm:flex-row gap-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50 pt-4">
          <span className="font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest shrink-0">Resolution:</span>
          <p className="font-medium leading-relaxed opacity-80">
            {resolution?.oracleType === 0 ? 'This market is resolved manually by the platform administrators.' : ''}
            {resolution?.oracleType === 1 ? 'Resolves based on Chainlink oracle data at expiration.' : ''}
          </p>
        </div>

      </div>
    </motion.div>
  );
}