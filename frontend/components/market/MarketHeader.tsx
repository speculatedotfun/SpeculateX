'use client';
import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Clock, Zap, Activity, BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { ResolutionInfoModal } from './ResolutionInfoModal';

interface MarketHeaderProps {
  market: any;
  resolution: any;
  totalVolume: number;
  totalVolumeDisplay: string;
  createdAtDate: Date | null;
  logoSrc: string;
  marketIsActive: boolean;
  marketIsCancelled?: boolean;
  marketIsExpired?: boolean;
  marketIsResolved?: boolean;
  yesPrice: number;
  expiryTimestamp: bigint;
  onLogoError: () => void;
}

// Countdown timer hook
function useCountdown(targetTimestamp: number) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, expired: false });

  useEffect(() => {
    const calculate = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = targetTimestamp - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, expired: true });
        return;
      }

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);

      setTimeLeft({ days, hours, minutes, expired: false });
    };

    calculate();
    const interval = setInterval(calculate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [targetTimestamp]);

  return timeLeft;
}

export function MarketHeader({
  market,
  resolution,
  totalVolumeDisplay,
  logoSrc,
  marketIsActive,
  marketIsCancelled = false,
  marketIsExpired = false,
  marketIsResolved = false,
  yesPrice,
  expiryTimestamp,
  onLogoError,
}: MarketHeaderProps) {
  const [showResolutionModal, setShowResolutionModal] = useState(false);

  const yesPercent = Math.round(yesPrice * 100);
  const countdown = useCountdown(Number(expiryTimestamp));

  // Status badge
  const statusConfig = useMemo(() => {
    if (marketIsCancelled) return { label: 'Cancelled', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400' };
    if (marketIsResolved) return { label: 'Resolved', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-600 dark:text-purple-400' };
    if (marketIsExpired) return { label: 'Expired', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-400' };
    if (marketIsActive) return { label: 'Live', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', pulse: true };
    return { label: 'Closed', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500' };
  }, [marketIsCancelled, marketIsResolved, marketIsExpired, marketIsActive]);

  // Format countdown
  const countdownText = countdown.expired
    ? 'Expired'
    : countdown.days > 0
      ? `${countdown.days}d ${countdown.hours}h`
      : `${countdown.hours}h ${countdown.minutes}m`;

  const expiryDate = new Date(Number(expiryTimestamp) * 1000);
  const formattedExpiry = expiryDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative mb-6"
        data-testid="market-header"
      >
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 lg:p-7">
            {/* Top Row: Logo + Status + Question */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 p-1.5 shrink-0 border border-gray-100 dark:border-gray-700 shadow-sm">
                <Image
                  src={logoSrc}
                  alt={market.question as string}
                  width={56}
                  height={56}
                  className="object-contain w-full h-full rounded-xl"
                  unoptimized
                  onError={onLogoError}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.pulse && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                    )}
                    {statusConfig.label}
                  </div>
                  {resolution?.oracleType === 1 && (
                    <button
                      onClick={() => setShowResolutionModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-widest hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors border border-teal-100/50 dark:border-teal-800/50"
                    >
                      <Zap className="w-2.5 h-2.5 rotate-[15deg]" />
                      Auto-Resolve
                    </button>
                  )}
                </div>
                <h1 className="text-lg md:text-xl lg:text-2xl font-black text-gray-900 dark:text-white leading-[1.2] tracking-tight">
                  {market.question}
                </h1>
              </div>
            </div>

            {/* Stats Bar: Impactful Hierarchy */}
            <div className="flex flex-wrap items-center gap-x-10 gap-y-4 pt-6 border-t border-gray-50 dark:border-gray-800">

              {/* PRIMARY: CHANCE */}
              <div className="flex items-center gap-3">
                <div className={`flex items-baseline ${yesPrice >= 0.5 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  <span className="text-4xl md:text-5xl font-black tabular-nums tracking-tighter">{yesPercent}</span>
                  <span className="text-xl font-bold ml-0.5">%</span>
                </div>
                <div className="flex flex-col justify-center">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${yesPrice >= 0.5 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                    YES CHANCE
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                    {yesPrice >= 0.5 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    24H CHANGE
                  </span>
                </div>
              </div>

              {/* SECONDARY: TIME */}
              <div className="flex items-center gap-3 border-l border-gray-100 dark:border-gray-800 pl-10" title={formattedExpiry}>
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Resolves In</span>
                  <span className="text-lg md:text-xl font-black text-gray-900 dark:text-white tabular-nums">
                    {countdownText}
                  </span>
                </div>
              </div>

              {/* TERTIARY: VOLUME & ORACLE */}
              <div className="flex flex-wrap items-center gap-6 ml-auto md:ml-0">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  <Activity className="w-3.5 h-3.5 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">Volume</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">${totalVolumeDisplay}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-none mb-1">Oracle</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">
                      {resolution?.oracleType === 1 ? 'Chainlink' : 'Manual'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Resolution Info Modal */}
      {resolution?.oracleType === 1 && (
        <ResolutionInfoModal
          isOpen={showResolutionModal}
          onClose={() => setShowResolutionModal(false)}
          expiryTimestamp={expiryTimestamp}
        />
      )}
    </>
  );
}