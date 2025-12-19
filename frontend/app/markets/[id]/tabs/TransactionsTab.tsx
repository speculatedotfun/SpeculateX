'use client';
import { motion } from 'framer-motion';
import { useChainId } from 'wagmi';
import type { TransactionRow } from '@/lib/marketTransformers';
import { ExternalLink, ShoppingCart, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

// Explorer URLs by chain ID
const EXPLORER_URLS: Record<number, string> = {
  97: 'https://testnet.bscscan.com', // BSC Testnet
  56: 'https://bscscan.com', // BSC Mainnet
};

interface TransactionsTabProps {
  transactions: TransactionRow[];
  loading: boolean;
}

export function TransactionsTab({ transactions, loading }: TransactionsTabProps) {
  const chainId = useChainId();
  const explorerUrl = EXPLORER_URLS[chainId] || EXPLORER_URLS[97]; // Default to testnet

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400" role="status" aria-label="Loading transactions">
        <Loader2 className="w-8 h-8 text-[#14B8A6] animate-spin mb-4" aria-hidden="true" />
        <p className="text-sm font-medium">Loading ledger...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div
        className="text-center py-12 opacity-50"
        role="status"
        aria-label="No transactions found"
      >
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No transactions recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, index) => {
        const isBuy = tx.type.includes('Buy');
        const isYes = tx.type.includes('Yes');

        return (
          <div
            key={tx.id}
            className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:border-[#14B8A6]/30 transition-all group"
            role="article"
            aria-label={`${tx.user.slice(0, 6)}...${tx.user.slice(-4)} ${isBuy ? 'bought' : 'sold'} ${tx.amount} ${isYes ? 'YES' : 'NO'} shares at $${Number(tx.price).toFixed(3)} on ${new Date(tx.timestamp * 1000).toLocaleString()}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isYes
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {isBuy ? (
                  isYes ? <TrendingUp className="w-4 h-4" aria-hidden="true" /> : <TrendingDown className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">
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
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                  {new Date(tx.timestamp * 1000).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {tx.amount}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                @ ${Number(tx.price).toFixed(3)}
              </div>
            </div>

            <a
              href={`${explorerUrl}/tx/${tx.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-[#14B8A6] transition-colors hover:scale-110 active:scale-95"
              aria-label="View transaction on block explorer"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        );
      })}
    </div>
  );
}