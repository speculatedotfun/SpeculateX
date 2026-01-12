'use client';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight, Trophy, ArrowRight } from 'lucide-react';
import type { TransactionRow } from '@/lib/marketTransformers';
import { hapticFeedback } from '@/lib/haptics';

interface PositionTabProps {
  isConnected: boolean;
  address?: string;
  transactions: TransactionRow[];
  yesBalance: string;
  noBalance: string;
  priceYes: number;
  priceNo: number;
  setTradeMode: (mode: 'buy' | 'sell') => void;
  setSide: (side: 'yes' | 'no') => void;
}

export function PositionTab({
  isConnected,
  address,
  transactions,
  yesBalance,
  noBalance,
  priceYes,
  priceNo,
  setTradeMode,
  setSide,
}: PositionTabProps) {
  const yesShares = parseFloat(yesBalance);
  const noShares = parseFloat(noBalance);
  const hasYes = yesShares > 0.0001;
  const hasNo = noShares > 0.0001;
  const yesValue = yesShares * priceYes;
  const noValue = noShares * priceNo;

  const getAvgPrice = (type: 'BuyYes' | 'BuyNo') => {
    const relevant = transactions.filter(t => t.type === type);
    if (relevant.length === 0) return 0;
    // For buy transactions: output = tokens received, price = price per token
    // Calculate weighted average: sum(tokens * price) / sum(tokens)
    const weightedSum = relevant.reduce((acc, curr) => acc + (parseFloat(curr.output) * parseFloat(curr.price)), 0);
    const totalTokens = relevant.reduce((acc, curr) => acc + parseFloat(curr.output), 0);
    return totalTokens > 0 ? (weightedSum / totalTokens) : 0;
  };

  const yesAvgPrice = getAvgPrice('BuyYes');
  const noAvgPrice = getAvgPrice('BuyNo');

  const yesProfit = yesAvgPrice > 0 ? (priceYes - yesAvgPrice) * yesShares : 0;
  const noProfit = noAvgPrice > 0 ? (priceNo - noAvgPrice) * noShares : 0;

  const handleSellAction = (side: 'yes' | 'no') => {
    hapticFeedback('medium');
    setTradeMode('sell');
    setSide(side);
    document.getElementById('trading-card-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isConnected) {
    return (
      <div className="p-8 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
        <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Connect Wallet</h3>
        <p className="text-sm text-gray-500">Connect your wallet to view your active positions</p>
      </div>
    );
  }

  if (!hasYes && !hasNo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700 text-center relative overflow-hidden"
        role="status"
        aria-label="No positions in this market"
      >
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <div className="absolute top-4 left-4 w-32 h-32 rounded-full bg-emerald-500 blur-3xl" />
          <div className="absolute bottom-4 right-4 w-32 h-32 rounded-full bg-rose-500 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-[#14B8A6]/20 to-[#14B8A6]/5 dark:from-[#14B8A6]/30 dark:to-[#14B8A6]/10 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-[#14B8A6]/20">
            <PieChart className="w-10 h-10 text-[#14B8A6]" />
          </div>
          <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">No active position</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
            Select an outcome and enter an amount in the trading panel to start trading.
          </p>

          {/* Action hint buttons */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>Buy YES</span>
            </div>
            <span className="text-gray-300 dark:text-gray-600">or</span>
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold">
              <TrendingDown className="w-4 h-4" />
              <span>Buy NO</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {hasYes && (
          <PositionCard
            type="yes"
            balance={yesBalance}
            price={priceYes}
            avgPrice={yesAvgPrice}
            profit={yesProfit}
            onSell={() => handleSellAction('yes')}
          />
        )}
        {hasNo && (
          <PositionCard
            type="no"
            balance={noBalance}
            price={priceNo}
            avgPrice={noAvgPrice}
            profit={noProfit}
            onSell={() => handleSellAction('no')}
          />
        )}
      </div>
    </div>
  );
}

function PositionCard({
  type,
  balance,
  price,
  avgPrice,
  profit,
  onSell
}: {
  type: 'yes' | 'no',
  balance: string,
  price: number,
  avgPrice: number,
  profit: number,
  onSell: () => void
}) {
  const isYes = type === 'yes';
  const shares = parseFloat(balance);
  const value = shares * price;
  const profitPct = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`p-6 rounded-[32px] border relative overflow-hidden group ${isYes
        ? 'bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-800/50 dark:to-emerald-900/5 border-emerald-100 dark:border-emerald-800/30'
        : 'bg-gradient-to-br from-white to-rose-50/30 dark:from-gray-800/50 dark:to-rose-900/5 border-rose-100 dark:border-rose-800/30'
        }`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${isYes ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
            <span className={`p-1.5 rounded-lg ${isYes ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
              {isYes ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </span>
            {type} Position
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
              ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <span>{shares.toLocaleString(undefined, { maximumFractionDigits: 2 })} Shares</span>
            <span>•</span>
            <span>{(price * 100).toFixed(1)}¢</span>
          </div>
        </div>

        <button
          onClick={onSell}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isYes
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600'
              : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600'
            }`}
        >
          Sell
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800/50 flex justify-between relative z-10">
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avg. Price</div>
          <div className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
            {(avgPrice * 100).toFixed(1)}¢
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unrealized P&L</div>
          <div className={`text-xl font-black flex flex-col items-end justify-center tabular-nums ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            <div className="flex items-center gap-1">
              {profit >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              {profit >= 0 ? '+' : ''}{profitPct.toFixed(1)}%
            </div>
            <div className="text-[10px] font-bold opacity-60">
              {profit >= 0 ? '+' : ''}${Math.abs(profit).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative background icon */}
      <div className={`absolute -bottom-6 -right-6 opacity-[0.03] dark:opacity-[0.05] pointer-events-none transition-transform group-hover:scale-110 duration-500 ${isYes ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isYes ? <TrendingUp size={140} /> : <TrendingDown size={140} />}
      </div>
    </motion.div>
  );
}