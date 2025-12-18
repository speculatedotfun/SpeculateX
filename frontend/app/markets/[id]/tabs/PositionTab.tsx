'use client';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface PositionTabProps {
  isConnected: boolean;
  yesBalance: string;
  noBalance: string;
  priceYes: number;
  priceNo: number;
}

export function PositionTab({
  isConnected,
  yesBalance,
  noBalance,
  priceYes,
  priceNo,
}: PositionTabProps) {
  const hasYes = parseFloat(yesBalance) > 0;
  const hasNo = parseFloat(noBalance) > 0;

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
        role="status"
        aria-label="Wallet not connected"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4"
        >
          <Wallet className="w-8 h-8 text-gray-400" aria-hidden="true" />
        </motion.div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Wallet Not Connected</h3>
        <p className="text-sm text-gray-500">Connect your wallet to view your active positions.</p>
      </motion.div>
    );
  }

  if (!hasYes && !hasNo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.6, y: 0 }}
        className="flex flex-col items-center justify-center py-12 text-center"
        role="status"
        aria-label="No positions in this market"
      >
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">You don&apos;t have any positions in this market yet.</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {hasYes && (
        <PositionCard 
          type="yes" 
          balance={yesBalance} 
          price={priceYes} 
        />
      )}
      {hasNo && (
        <PositionCard 
          type="no" 
          balance={noBalance} 
          price={priceNo} 
        />
      )}
    </div>
  );
}

function PositionCard({ type, balance, price }: { type: 'yes' | 'no', balance: string, price: number }) {
  const isYes = type === 'yes';
  const shares = parseFloat(balance);
  const value = shares * price;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`p-6 rounded-[24px] border-2 relative overflow-hidden ${
        isYes
          ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
          : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
      }`}
      role="article"
      aria-label={`${type.toUpperCase()} position: ${shares.toLocaleString()} shares worth $${value.toFixed(2)}`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <div className={`text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 ${
            isYes ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {isYes ? <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> : <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />}
            {type.toUpperCase()} Shares
          </div>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-black text-gray-900 dark:text-white tracking-tight"
          >
            {shares.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            isYes ? 'bg-green-200 dark:bg-green-800/30 text-green-800 dark:text-green-300' : 'bg-red-200 dark:bg-red-800/30 text-red-800 dark:text-red-300'
          }`}
        >
          Avg ${(price).toFixed(2)}
        </motion.div>
      </div>

      <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex justify-between items-end relative z-10">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Value</span>
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`text-xl font-black ${
            isYes ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
          }`}
        >
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </motion.span>
      </div>
    </motion.div>
  );
}