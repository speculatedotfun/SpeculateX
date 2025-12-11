'use client';
import { motion } from 'framer-motion';
import type { TransactionRow } from '@/lib/marketTransformers';
import { ExternalLink, ShoppingCart } from 'lucide-react';

interface TransactionsTabProps {
  transactions: TransactionRow[];
  loading: boolean;
}

export function TransactionsTab({ transactions, loading }: TransactionsTabProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full mb-4"
        />
        <p className="text-sm font-medium">Loading ledger...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 opacity-50">
        <div className="text-4xl mb-3">📜</div>
        <p className="text-sm font-medium">No transactions recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, index) => {
        const isBuy = tx.type.includes('Buy');
        const isYes = tx.type.includes('Yes');
        
        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:border-[#14B8A6]/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isYes 
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                <ShoppingCart className="w-4 h-4" />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {tx.user.slice(0, 6)}...{tx.user.slice(-4)}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isYes 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {isBuy ? 'BOUGHT' : 'SOLD'} {isYes ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(tx.timestamp * 1000).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {tx.amount}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">
                @ ${Number(tx.price).toFixed(3)}
              </div>
            </div>

            <a
              href={`https://testnet.bscscan.com/tx/${tx.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-[#14B8A6] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        );
      })}
    </div>
  );
}