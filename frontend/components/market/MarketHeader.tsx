'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Activity, Calendar, HelpCircle, Users } from 'lucide-react';
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

export function MarketHeader({
  market,
  resolution,
  totalVolumeDisplay,
  createdAtDate,
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
  const noPercent = 100 - yesPercent;

  const startTime = resolution?.startTime ? BigInt(resolution.startTime) : 0n;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isScheduled = startTime > 0n && now < startTime;

  // Status config
  const statusConfig = useMemo(() => {
    if (marketIsCancelled) return { label: 'Cancelled', color: 'red', dot: 'bg-red-500' };
    if (marketIsResolved) return { label: 'Resolved', color: 'purple', dot: 'bg-purple-500' };
    if (marketIsExpired) return { label: 'Expired', color: 'orange', dot: 'bg-orange-500' };
    if (isScheduled) return { label: 'Scheduled', color: 'blue', dot: 'bg-blue-500' };
    if (marketIsActive) return { label: 'Live', color: 'emerald', dot: 'bg-emerald-500', pulse: true };
    return { label: 'Closed', color: 'gray', dot: 'bg-gray-400' };
  }, [marketIsCancelled, marketIsResolved, marketIsExpired, isScheduled, marketIsActive]);

  return (
    <>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative mb-4"
        data-testid="market-header"
      >
        {/* Compact Card */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden">

          <div className="p-4 md:p-5">
            {/* Top Row: Logo + Title + Status */}
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div className="shrink-0">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gray-100 dark:bg-gray-800 p-1.5 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                  <Image
                    src={logoSrc}
                    alt={market.question as string}
                    width={64}
                    height={64}
                    className="object-contain w-full h-full rounded-lg"
                    unoptimized
                    onError={onLogoError}
                  />
                </div>
              </div>

              {/* Title + Meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                    ${statusConfig.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : ''}
                    ${statusConfig.color === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : ''}
                    ${statusConfig.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : ''}
                    ${statusConfig.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : ''}
                    ${statusConfig.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : ''}
                    ${statusConfig.color === 'gray' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : ''}
                  `}>
                    {statusConfig.pulse ? (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                    )}
                    {statusConfig.label}
                  </div>

                  {/* Oracle Badge */}
                  {resolution?.oracleType === 1 && (
                    <button
                      onClick={() => setShowResolutionModal(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[10px] font-bold uppercase tracking-wider hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
                    >
                      <HelpCircle className="w-2.5 h-2.5" />
                      Auto-Resolve
                    </button>
                  )}
                </div>

                {/* Question Title */}
                <h1 className="text-lg md:text-xl lg:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {market.question}
                </h1>
              </div>
            </div>

            {/* Stats Row - Inline */}
            <div className="flex items-center gap-3 md:gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex-wrap">
              {/* Current Odds */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Yes</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{yesPercent}¢</span>
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">No</span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400">{noPercent}¢</span>
                </div>
              </div>

              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden md:block" />

              {/* Volume */}
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase">Vol</span>
                <span className="text-sm font-black text-gray-700 dark:text-gray-200">${totalVolumeDisplay}</span>
              </div>

              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden md:block" />

              {/* End Date */}
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase">Ends</span>
                <span className="text-sm font-black text-gray-700 dark:text-gray-200">
                  {new Date(Number(expiryTimestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
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