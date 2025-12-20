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
      className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] border-2 border-white dark:border-gray-700/50 mb-8 overflow-hidden relative isolate ring-1 ring-gray-900/5 dark:ring-white/5"
      data-testid="market-header"
      role="region"
      aria-label="Market information"
    >
      <div className="p-6 sm:p-8 relative z-10 flex flex-col gap-8">
        
        {/* --- Top Section: Status & Main Info --- */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Logo Container with Enhanced Glow */}
          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-teal-500/30 dark:from-blue-400/30 dark:via-purple-400/20 dark:to-teal-400/30 rounded-3xl blur-2xl group-hover:blur-3xl opacity-50 group-hover:opacity-70 transition-all duration-700" />
            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden ring-1 ring-gray-900/5 dark:ring-white/10 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] transition-all duration-500">
              <Image
                src={logoSrc}
                alt={market.question as string}
                width={80}
                height={80}
                className="object-contain w-full h-full rounded-2xl transition-transform duration-500 group-hover:scale-110 filter group-hover:brightness-110"
                unoptimized
                onError={onLogoError}
              />
            </div>
          </div>

          {/* Title & Meta */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
               <div
                 className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm self-start ${
                   marketIsCancelled
                     ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
                     : marketIsActive
                       ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                       : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                 }`}
                 role="status"
                 aria-label={
                   marketIsCancelled 
                     ? 'Market has been cancelled' 
                     : marketIsActive 
                       ? 'Market is live and accepting trades' 
                       : 'Market is closed'
                 }
               >
                 {marketIsCancelled ? (
                   <div className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
                 ) : marketIsActive ? (
                   <span className="relative flex h-2 w-2" aria-hidden="true">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                   </span>
                 ) : (
                   <div className="w-2 h-2 rounded-full bg-gray-400" aria-hidden="true" />
                 )}
                 <span className="text-[10px] font-black uppercase tracking-widest">
                   {marketIsCancelled ? 'Cancelled' : marketIsActive ? 'Live Market' : 'Closed'}
                 </span>
               </div>
               <time className="text-xs font-medium text-gray-400 dark:text-gray-500" dateTime={createdAtDate?.toISOString()}>
                 Created {createdAtDate ? createdAtDate.toLocaleString('en-US', {
                   month: 'short',
                   day: 'numeric',
                   year: 'numeric',
                   hour: '2-digit',
                   minute: '2-digit'
                 }) : '—'}
               </time>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent leading-tight tracking-tight mb-2 text-balance drop-shadow-sm">
              {market.question}
            </h1>
          </div>
        </div>

        {/* --- 3D Stats Dashboard (Integrated) --- */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-gray-50/80 via-white to-gray-100/50 dark:from-gray-900/80 dark:via-gray-800 dark:to-gray-900/50 border-2 border-gray-200/60 dark:border-gray-700/60 shadow-[inset_0_2px_20px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_2px_20px_rgba(0,0,0,0.2)] group backdrop-blur-xl ring-1 ring-gray-900/5 dark:ring-white/5" role="region" aria-label="Market statistics">

            {/* Left 3D Decoration - Hidden on mobile */}
            <div className="hidden md:block absolute left-0 bottom-0 top-0 w-32 md:w-64 opacity-100 pointer-events-none z-0" aria-hidden="true">
               <Image
                 src="/leftside.png"
                 alt=""
                 fill
                 className="object-contain object-left-bottom transform transition-transform duration-700 group-hover:scale-105 origin-bottom-left"
               />
            </div>

            {/* Right 3D Decoration - Hidden on mobile */}
            <div className="hidden md:block absolute right-0 top-0 bottom-0 w-32 md:w-64 opacity-100 pointer-events-none z-0" aria-hidden="true">
               <Image
                 src="/rightside.png"
                 alt=""
                 fill
                 className="object-contain object-right-top transform transition-transform duration-700 group-hover:scale-105 origin-top-right"
               />
            </div>

            {/* Stats Content Layer */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700/50 py-6" role="list">
                
                {/* Volume Stat */}
                <div className="flex flex-col items-center justify-center p-4 text-center" role="listitem">
                    <div className="flex items-center gap-2 mb-1 opacity-70">
                        <Activity className="w-4 h-4 text-[#14B8A6]" aria-hidden="true" />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Volume</span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter" aria-label={`Total trading volume: ${totalVolumeDisplay} dollars`}>
                       ${totalVolumeDisplay}
                    </span>
                </div>

                {/* Sentiment Stat - Enhanced with gradient background */}
                <div className="flex flex-col items-center justify-center p-4 text-center relative overflow-hidden" role="listitem">
                    <div className={`absolute inset-0 bg-gradient-to-br ${yesPercent >= 50 ? 'from-teal-500/10 via-emerald-500/5 to-transparent' : 'from-rose-500/10 via-red-500/5 to-transparent'} backdrop-blur-sm`} aria-hidden="true" />
                    <div className="flex items-center gap-2 mb-1 opacity-70 relative z-10">
                        <TrendingUp className={`w-4 h-4 ${yesPercent >= 50 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`} aria-hidden="true" />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sentiment</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 relative z-10">
                        <span className={`text-3xl sm:text-4xl font-black tracking-tighter bg-gradient-to-br ${yesPercent >= 50 ? 'from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400' : 'from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400'} bg-clip-text text-transparent drop-shadow-sm`} aria-label={`Market sentiment: ${yesPercent} percent predict yes`}>
                            {yesPercent}%
                        </span>
                        <span className="text-sm font-bold text-gray-400 uppercase" aria-hidden="true">Yes</span>
                    </div>
                </div>

                {/* Deadline Stat */}
                <div className="flex flex-col items-center justify-center p-4 text-center" role="listitem">
                    <div className="flex items-center gap-2 mb-1 opacity-70">
                        <Calendar className="w-4 h-4 text-purple-500" aria-hidden="true" />
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Deadline</span>
                    </div>
                    <time
                      className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight"
                      dateTime={new Date(Number(expiryTimestamp) * 1000).toISOString()}
                      aria-label={`Market deadline: ${dateStr}`}
                    >
                       {dateStr}
                    </time>
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