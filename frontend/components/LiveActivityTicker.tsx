'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToSubgraph, fetchSubgraph } from '@/lib/subgraphClient';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Trade {
  id: string;
  timestamp: string;
  action: 'buy' | 'sell';
  side: 'yes' | 'no';
  priceE6: string;
  market: {
    id: string;
    question: string;
  };
}

export function LiveActivityTicker() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Initial fetch
    const fetchRecent = async () => {
      try {
        const data = await fetchSubgraph<{ trades: Trade[] }>(
          `query RecentTrades {
            trades(first: 15, orderBy: timestamp, orderDirection: desc) {
              id
              timestamp
              action
              side
              priceE6
              market {
                id
                question
              }
            }
          }`
        );
        setTrades(data.trades);
      } catch (e) {
        console.error('Failed to fetch initial trades for ticker', e);
      }
    };

    fetchRecent();

    // Subscribe to live trades
    const unsubscribe = subscribeToSubgraph<{ trades: Trade[] }>(
      {
        query: `subscription LiveTrades {
          trades(first: 1, orderBy: timestamp, orderDirection: desc) {
            id
            timestamp
            action
            side
            priceE6
            market {
              id
              question
            }
          }
        }`,
        variables: {},
      },
      {
        onData: (data) => {
          if (data.trades && data.trades.length > 0) {
            setTrades(prev => [data.trades[0], ...prev.slice(0, 14)]);
          }
        },
      }
    );

    return () => unsubscribe();
  }, []);

  const tickerContent = useMemo(() => {
    if (trades.length === 0) return null;
    // Repeat for seamless loop
    return [...trades, ...trades, ...trades];
  }, [trades]);

  if (trades.length === 0) return null;

  return (
    <div 
      className="w-full bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 h-11 flex items-center overflow-hidden z-40 relative group/ticker"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Glow effect at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#14B8A6]/30 to-transparent shadow-[0_1px_10px_rgba(20,184,166,0.2)]" />

      <div className="flex-shrink-0 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] px-4 h-full flex items-center text-white text-[10px] font-black uppercase tracking-[0.15em] z-20 shadow-[10px_0_25px_rgba(0,0,0,0.1)] transition-transform group-hover/ticker:scale-105 origin-left">
        <span className="relative flex h-2 w-2 mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        Live Feed
      </div>
      
      <div className="flex-1 overflow-hidden relative h-full">
        <motion.div 
          className="flex items-center gap-12 px-6 h-full whitespace-nowrap"
          animate={{ x: isPaused ? undefined : [0, -2000] }}
          transition={{ 
            duration: 80, 
            repeat: Infinity, 
            ease: "linear",
            // If we pause, we want to maintain the current position
          }}
        >
          {tickerContent?.map((trade, i) => {
            const isYes = trade.side === 'yes';
            const isBuy = trade.action === 'buy';
            const timeAgo = formatDistanceToNow(new Date(Number(trade.timestamp) * 1000), { addSuffix: true })
              .replace('about ', '')
              .replace('less than a minute ago', 'just now');

            return (
              <Link 
                key={`${trade.id}-${i}`}
                href={`/markets/${trade.market.id}`}
                className="flex items-center gap-3 group hover:opacity-100 transition-all py-1 px-3 rounded-full hover:bg-gray-100/50 dark:hover:bg-white/5"
              >
                {/* Action Tag */}
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                  isYes 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.1)]'
                }`}>
                  {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {trade.action.toUpperCase()} {trade.side.toUpperCase()}
                </div>

                {/* Market Question */}
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 group-hover:text-[#14B8A6] transition-colors truncate max-w-[180px]">
                  {trade.market.question}
                </span>

                {/* Price */}
                <span className="text-[11px] font-black text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
                  @ {(Number(trade.priceE6) / 10000).toFixed(1)}¢
                </span>

                {/* Time Ago */}
                <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                  <Clock className="w-2.5 h-2.5 opacity-50" />
                  {timeAgo}
                </div>
              </Link>
            );
          })}
        </motion.div>

        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white/60 dark:from-gray-950/60 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white/60 dark:from-gray-950/60 to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
}

