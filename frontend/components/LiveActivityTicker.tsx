'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToSubgraph, fetchSubgraph } from '@/lib/subgraphClient';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
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

  // Hide on home page
  if (pathname === '/') return null;

  // Hide on market detail pages (reduces distraction)
  if (pathname?.startsWith('/markets/') && pathname !== '/markets') return null;

  if (trades.length === 0) return null;

  return (
    <div
      className="w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 h-10 flex items-center overflow-hidden z-40 relative group/ticker"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Glow effect at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#14B8A6]/20 to-transparent" />

      {/* Minimal 'LIVE' Indicator */}
      <div className="flex-shrink-0 pl-6 pr-4 h-full flex items-center gap-2 z-20 bg-gradient-to-r from-white/90 dark:from-gray-950/90 to-transparent">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-black text-gray-900 dark:text-white tracking-widest uppercase opacity-80">
          Live
        </span>
      </div>

      <div className="flex-1 overflow-hidden relative h-full mask-linear-fade">
        <motion.div
          className="flex items-center gap-8 px-4 h-full whitespace-nowrap"
          animate={{ x: isPaused ? undefined : [0, -2000] }}
          transition={{
            duration: 80,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {tickerContent?.map((trade, i) => {
            const isYes = trade.side === 'yes';
            const isBuy = trade.action === 'buy';
            const timeAgo = formatDistanceToNow(new Date(Number(trade.timestamp) * 1000), { addSuffix: true })
              .replace('about ', '')
              .replace('less than a minute ago', 'just now');

            const colorClass = isYes ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
            const badgeClass = isYes
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400';

            return (
              <Link
                key={`${trade.id}-${i}`}
                href={`/markets/${trade.market.id}`}
                className="flex items-center gap-2.5 group hover:opacity-100 opacity-90 transition-opacity"
              >
                {/* Minimal Badge */}
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${badgeClass}`}>
                  {isBuy ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {trade.action} {trade.side}
                </div>

                {/* Market Question */}
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate max-w-[200px]">
                  {trade.market.question}
                </span>

                {/* Price */}
                <span className={`text-[11px] font-bold font-mono ${colorClass}`}>
                  {(Number(trade.priceE6) / 10000).toFixed(1)}¢
                </span>

                <span className="text-gray-300 dark:text-gray-700 text-[10px]">•</span>

                {/* Time Ago */}
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                  {timeAgo}
                </span>
              </Link>
            );
          })}
        </motion.div>

        {/* Fade edges */}
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#FAF9FF] dark:from-[#0f172a] to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
}
