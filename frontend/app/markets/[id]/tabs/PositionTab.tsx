'use client';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight, Trophy } from 'lucide-react';
import type { TransactionRow } from '@/lib/marketTransformers';

interface PositionTabProps {
  isConnected: boolean;
  address?: string;
  transactions: TransactionRow[];
  yesBalance: string;
  noBalance: string;
  priceYes: number;
  priceNo: number;
}

export function PositionTab({
  isConnected,
  address,
  transactions,
  yesBalance,
  noBalance,
  priceYes,
  priceNo,
}: PositionTabProps) {
  const yesShares = parseFloat(yesBalance);
  const noShares = parseFloat(noBalance);
  const hasYes = yesShares > 0.0001;
  const hasNo = noShares > 0.0001;
  const yesValue = yesShares * priceYes;
  const noValue = noShares * priceNo;
  const totalValue = yesValue + noValue;
  const totalShares = yesShares + noShares;

  // Calculate Average Cost & P&L
  const userTransactions = transactions.filter(
    tx => tx.user.toLowerCase() === address?.toLowerCase()
  );

  let yesCostBasis = 0;
  let yesSharesOwned = 0;
  let noCostBasis = 0;
  let noSharesOwned = 0;

  // Sort chronological for basis calculation
  const sortedTx = [...userTransactions].sort((a, b) => a.timestamp - b.timestamp);

  for (const tx of sortedTx) {
    const isBuy = tx.type.startsWith('Buy');
    const isYes = tx.type.endsWith('Yes');

    // In our transformer: 
    // If Buy: amount = USDC (6 dec), output = Tokens (18 dec)
    // If Sell: amount = Tokens (18 dec), output = USDC (6 dec)
    const usdc = isBuy ? parseFloat(tx.amount) / 1e6 : parseFloat(tx.output) / 1e6;
    const shares = isBuy ? parseFloat(tx.output) / 1e18 : parseFloat(tx.amount) / 1e18;

    if (isYes) {
      if (isBuy) {
        yesCostBasis += usdc;
        yesSharesOwned += shares;
      } else if (yesSharesOwned > 0) {
        const ratio = Math.min(1, shares / yesSharesOwned);
        yesCostBasis -= yesCostBasis * ratio;
        yesSharesOwned -= shares;
      }
    } else {
      if (isBuy) {
        noCostBasis += usdc;
        noSharesOwned += shares;
      } else if (noSharesOwned > 0) {
        const ratio = Math.min(1, shares / noSharesOwned);
        noCostBasis -= noCostBasis * ratio;
        noSharesOwned -= shares;
      }
    }
  }

  const yesAvgPrice = yesSharesOwned > 0 ? yesCostBasis / yesSharesOwned : 0;
  const noAvgPrice = noSharesOwned > 0 ? noCostBasis / noSharesOwned : 0;

  // Final P&L calculation based on CURRENT reported balances
  const yesProfit = hasYes ? (priceYes - yesAvgPrice) * yesShares : 0;
  const noProfit = hasNo ? (priceNo - noAvgPrice) * noShares : 0;
  const totalProfit = yesProfit + noProfit;
  const totalProfitPct = (yesCostBasis + noCostBasis) > 0
    ? (totalProfit / (yesCostBasis + noCostBasis)) * 100
    : 0;

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
        role="status"
        aria-label="Wallet not connected"
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 rounded-full blur-xl opacity-50" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="relative w-20 h-20 bg-white dark:bg-gray-800 rounded-[2rem] flex items-center justify-center shadow-xl border border-gray-100 dark:border-gray-700"
          >
            <Wallet className="w-10 h-10 text-gray-400" aria-hidden="true" />
          </motion.div>
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Connect Wallet</h3>
        <p className="text-gray-500 max-w-sm mx-auto">Connect your wallet to track your positions, P&L, and performance in real-time.</p>
      </motion.div>
    );
  }

  if (!hasYes && !hasNo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center container mx-auto"
        role="status"
        aria-label="No positions in this market"
      >
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-4">
          <PieChart className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Active Positions</p>
        <p className="text-sm text-gray-500">Take a position on YES or NO to see it here.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Individual Positions */}
      <h3 className="text-lg font-black text-gray-900 dark:text-white px-2">Your Positions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hasYes && (
          <PositionCard
            type="yes"
            balance={yesBalance}
            price={priceYes}
            avgPrice={yesAvgPrice}
            profit={yesProfit}
          />
        )}
        {hasNo && (
          <PositionCard
            type="no"
            balance={noBalance}
            price={priceNo}
            avgPrice={noAvgPrice}
            profit={noProfit}
          />
        )}
      </div>
    </div>
  );
}

function PositionCard({ type, balance, price, avgPrice, profit }: { type: 'yes' | 'no', balance: string, price: number, avgPrice: number, profit: number }) {
  const isYes = type === 'yes';
  const shares = parseFloat(balance);
  const value = shares * price;
  const profitPct = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`p-6 rounded-[32px] border relative overflow-hidden group ${isYes
        ? 'bg-gradient-to-br from-white to-green-50/50 dark:from-gray-800 dark:to-green-900/10 border-green-200 dark:border-green-800/30'
        : 'bg-gradient-to-br from-white to-red-50/50 dark:from-gray-800 dark:to-red-900/10 border-red-200 dark:border-red-800/30'
        }`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <div className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isYes ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
            <span className={`p-1.5 rounded-lg ${isYes ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {isYes ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </span>
            {type.toUpperCase()} POSITION
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {shares.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-bold text-gray-400 uppercase">Shares</span>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-sm font-black border flex items-center gap-1.5 ${isYes
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800/50'
          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800/50'
          }`}>
          <span className="opacity-50 text-[10px]">NOW</span>
          ${(price * 100).toFixed(1)}¢
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-2 gap-4 relative z-10">
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Avg. Price</div>
          <div className="text-lg font-black text-gray-900 dark:text-white">
            ${(avgPrice * 100).toFixed(1)}¢
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Unrealized ROI</div>
          <div className={`text-lg font-black flex flex-col items-end justify-center ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            <div className="flex items-center gap-1">
              {profit >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {profit >= 0 ? '+' : '-'}{Math.abs(profitPct).toFixed(1)}%
            </div>
            <div className="text-[10px] font-bold opacity-60">
              {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-gray-900/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <Trophy className="w-3 h-3 text-amber-500" /> If You Win
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-gray-900 dark:text-white">
              ${shares.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-bold text-emerald-500">
              +${(shares - (avgPrice * shares)).toFixed(2)} ({((1 - avgPrice) / (avgPrice || 1) * 100).toFixed(0)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Decorative background icon */}
      <div className={`absolute -bottom-4 -right-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none transition-transform group-hover:scale-110 duration-500 ${isYes ? 'text-green-500' : 'text-red-500'}`}>
        {isYes ? <TrendingUp size={120} /> : <TrendingDown size={120} />}
      </div>
    </motion.div>
  );
}