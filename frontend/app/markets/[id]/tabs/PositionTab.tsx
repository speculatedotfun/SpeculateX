'use client';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Wallet Not Connected</h3>
        <p className="text-sm text-gray-500">Connect your wallet to view your active positions.</p>
      </div>
    );
  }

  if (!hasYes && !hasNo) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-sm font-medium">You don&apos;t have any positions in this market yet.</p>
      </div>
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
      className={`p-6 rounded-[24px] border-2 relative overflow-hidden ${
        isYes 
          ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30' 
          : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
      }`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <div className={`text-xs font-black uppercase tracking-widest mb-1 ${
            isYes ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {type.toUpperCase()} Shares
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {shares.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          isYes ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
        }`}>
          Avg ${(price).toFixed(2)}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex justify-between items-end relative z-10">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Current Value</span>
        <span className={`text-xl font-black ${
          isYes ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
        }`}>
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </motion.div>
  );
}