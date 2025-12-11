'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { formatUnits } from 'viem';

interface MarketHeaderProps {
  market: any;
  resolution: any;
  totalVolume: number;
  createdAtDate: Date | null;
  logoSrc: string;
  marketIsActive: boolean;
  onLogoError: () => void;
}

export function MarketHeader({
  market,
  resolution,
  totalVolume,
  createdAtDate,
  logoSrc,
  marketIsActive,
  onLogoError,
}: MarketHeaderProps) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 shadow-xl border border-white/20 dark:border-gray-700/50 mb-8"
      data-testid="market-header"
    >
      {/* Top Row: Status & Actions */}
      <div className="flex items-start justify-between mb-6">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
          marketIsActive 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
            : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${marketIsActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {marketIsActive ? 'Live Trading' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        {/* Logo */}
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white dark:bg-gray-700 p-2 shadow-sm border border-gray-100 dark:border-gray-600 flex-shrink-0 flex items-center justify-center">
          <Image
            src={logoSrc}
            alt={market.question as string}
            width={80}
            height={80}
            className="object-contain w-full h-full rounded-2xl"
            unoptimized
            onError={onLogoError}
          />
        </div>

        {/* Text Details */}
        <div className="flex-1 space-y-4">
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
            {market.question}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
              <span className="uppercase text-[10px] font-bold tracking-wider">Volume</span>
              <span className="text-gray-900 dark:text-white font-bold">${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
              <span className="uppercase text-[10px] font-bold tracking-wider">Created</span>
              <span className="text-gray-900 dark:text-white font-bold">
                {createdAtDate ? createdAtDate.toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Resolution Rules</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
          {resolution?.oracleType === 0 ? 'This market is resolved manually by the platform administrators.' : ''}
          {resolution?.oracleType === 1 ? (
            <>
              Resolves <strong>YES</strong> if price is 
              <span className="mx-1 inline-block px-1.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-xs">
                {resolution?.comparison === 0 ? '>' : resolution?.comparison === 1 ? '<' : '='}
              </span>
              <strong>${Number(formatUnits(resolution?.targetValue || 0n, 8)).toLocaleString()}</strong> 
              at expiration. Data provided by Chainlink.
            </>
          ) : ''}
        </p>
      </div>
    </motion.div>
  );
}