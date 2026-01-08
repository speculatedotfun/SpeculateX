'use client';

export const dynamic = 'force-dynamic';

// Import BigInt serializer first
import '@/lib/bigint-serializer';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon } from 'lucide-react';
import Header from '@/components/Header';
import { getMarketCount } from '@/lib/hooks';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccount } from 'wagmi';
import { formatCompact } from '@/lib/format';
import { Pagination } from '@/components/ui/Pagination';

// NEW IMPORTS
import { StatsBanner } from '@/components/market/StatsBanner';
import { MarketCard, MarketCardData } from '@/components/market/MarketCard';
import { FeaturedMarketCard } from '@/components/market/FeaturedMarketCard';
import { Filter, ArrowUpDown, Flame, Clock } from 'lucide-react';
import { useMarketsListOptimized } from '@/lib/hooks/useMarketsListOptimized'; // NEW HOOK

const STATUS_FILTERS = ['Active', 'Expired', 'Resolved', 'Cancelled'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function MarketsPage() {
  console.log('[DEBUG] Rendering Markets page');
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (address) {
      checkIsAdmin(address).then(setIsAdmin);
    }
  }, [address]);
  // Optimized Data Fetching
  const { data: marketsRaw = [], isLoading: isLoadingMarkets } = useMarketsListOptimized();

  // Aligning with existing state names
  const markets = marketsRaw;
  const loading = isLoadingMarkets;

  // Derive stats (Total Markets count comes from array length now)
  // const [marketCount, setMarketCount] ... removed

  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState<StatusFilter>('Active');
  const [sortBy, setSortBy] = useState<'volume' | 'newest' | 'ending'>('volume');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Removed old loadMarkets and useEffect


  const filteredMarkets = useMemo(() => {
    let result = markets.filter(market => {
      // Always filter out scheduled markets - users should not see them
      if (market.status === 'SCHEDULED') return false;

      if (searchTerm && !market.question.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (activeStatusTab) {
        if (activeStatusTab === 'Active' && market.status !== 'LIVE TRADING') return false;
        if (activeStatusTab === 'Expired' && market.status !== 'EXPIRED') return false;
        if (activeStatusTab === 'Resolved' && market.status !== 'RESOLVED') return false;
        if (activeStatusTab === 'Cancelled' && market.status !== 'CANCELLED') return false;
      }
      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'volume') return b.volume - a.volume;
      if (sortBy === 'newest') return Number(b.id) - Number(a.id); // Assuming higher ID is newer
      if (sortBy === 'ending') return Number(a.expiryTimestamp) - Number(b.expiryTimestamp);
      return 0;
    });
  }, [markets, searchTerm, activeStatusTab, sortBy]);

  // Identify Featured Market (Highest Volume Active Market)
  const featuredMarket = useMemo(() => {
    if (markets.length === 0) return null;
    const activeMarkets = markets.filter(m => m.status === 'LIVE TRADING');
    if (activeMarkets.length === 0) return null;
    return activeMarkets.reduce((prev, current) => (prev.volume > current.volume) ? prev : current);
  }, [markets]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeStatusTab]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedMarkets = filteredMarkets.slice(startIndex, endIndex);

  const stats = useMemo(() => {
    if (markets.length === 0) return { liquidity: 0, live: 0, resolved: 0, expired: 0, cancelled: 0, total: 0 };
    let liquidity = 0, live = 0, resolved = 0, expired = 0, cancelled = 0;
    for (const market of markets) {
      const vaultValue = typeof market.totalPairsUSDC === 'bigint' ? market.totalPairsUSDC : BigInt(market.totalPairsUSDC || 0);
      liquidity += Number(formatUnits(vaultValue, 6));
      if (market.status === 'LIVE TRADING') live += 1;
      else if (market.status === 'RESOLVED') resolved += 1;
      else if (market.status === 'EXPIRED') expired += 1;
      else if (market.status === 'CANCELLED') cancelled += 1;
    }
    return { liquidity, live, resolved, expired, cancelled, total: markets.length };
  }, [markets]);

  const formatNumber = useCallback((value: number) => {
    return formatCompact(value, value >= 1000 ? 1 : 0);
  }, []);

  const liquidityDisplay = formatCompact(stats.liquidity, stats.liquidity >= 1000 ? 1 : 2);

  const { data: activeTraders = 0 } = useQuery({
    queryKey: ['uniqueTraders'],
    queryFn: async () => {
      try {
        const data = await fetchSubgraph<{ globalState: { uniqueTraders: number } | null }>(
          `query UniqueTraders($id: ID!) { globalState(id: $id) { uniqueTraders } }`,
          { id: 'global' }
        );
        return Number(data.globalState?.uniqueTraders ?? 0);
      } catch (e) { return 0; }
    },
    refetchInterval: 120_000,
  });

  const getMarketLogo = (question?: string | null): string => {
    const normalized = typeof question === 'string' ? question : question != null ? String(question) : '';
    const q = normalized.toLowerCase();
    if (q.includes('btc') || q.includes('bitcoin')) return '/logos/BTC_ethereum.png';
    if (q.includes('eth') || q.includes('ethereum')) return '/logos/ETH_ethereum.png';
    if (q.includes('sol') || q.includes('solana')) return '/logos/SOL_solana.png';
    if (q.includes('bnb') || q.includes('binance')) return '/logos/BNB_bsc.png';
    return '/logos/default.png';
  };

  return (
    <div className="min-h-screen relative font-sans selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white pb-20">

      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#FAF9FF] dark:bg-[#0f1219]">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[bottom_1px_center]"></div>
        <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-teal-400/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Page Header Area */}
        <div className="flex flex-col items-center text-center justify-center gap-4 mb-12 relative z-20">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
            </span>
            Live Markets
          </motion.div>

          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f0a2e] dark:text-white tracking-tighter leading-[0.9]"
          >
            Be The <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-purple-500 animate-gradient-x">
              Market.
            </span>
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-2xl leading-relaxed font-medium"
          >
            Trade on the outcome of real-world events with global liquidity.
          </motion.p>
        </div>

        {/* --- STATS BANNER --- */}
        <StatsBanner
          liquidity={`$${liquidityDisplay}`}
          traders={formatNumber(Number(activeTraders))}
          liveMarkets={stats.live}
          resolvedMarkets={stats.resolved}
          expiredMarkets={stats.expired}
          loading={loading}
          prefersReducedMotion={prefersReducedMotion}
        />

        {/* Controls Section */}
        {/* --- LIVE FEATURED MARKET --- */}
        {!loading && featuredMarket && !searchTerm && activeStatusTab === 'Active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Featured Market</h2>
            </div>
            <FeaturedMarketCard
              market={featuredMarket}
              getMarketLogo={getMarketLogo}
              formatNumber={formatNumber}
              prefersReducedMotion={prefersReducedMotion}
            />
          </motion.div>
        )}

        {/* --- CONTROLS BAR --- */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6 w-full"
        >
          <div className="bg-white/80 dark:bg-[#131722]/90 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-1.5 shadow-2xl shadow-black/5 flex flex-col md:flex-row gap-2">

            {/* Search Bar */}
            <div className="relative flex-1 group bg-gray-50/50 dark:bg-black/20 rounded-lg transition-colors hover:bg-gray-100/50 dark:hover:bg-black/40">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full h-10 pl-9 pr-3 rounded-lg bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-0 sm:text-sm border-none transition-all font-medium"
                placeholder="Search markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar md:overflow-visible">
              {/* Divider */}
              <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

              {/* Status Filters (Pills) */}
              <div className="flex items-center bg-gray-100/50 dark:bg-black/20 p-1 rounded-xl">
                {STATUS_FILTERS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveStatusTab(tab)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap
                      ${activeStatusTab === tab
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }
                    `}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

              {/* Sort Dropdown (Simple implementation) */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none pl-9 pr-8 py-2.5 bg-gray-100/50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/40 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer border border-transparent focus:border-teal-500/50 transition-colors"
                >
                  <option value="volume">Highest Volume</option>
                  <option value="newest">Newest Listed</option>
                  <option value="ending">Ending Soon</option>
                </select>
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

            </div>
          </div>
        </motion.div>

        {/* Results Counter */}
        <div className="mb-6 flex items-center justify-between px-2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Showing <span className="text-gray-900 dark:text-white font-bold">{filteredMarkets.length}</span> {filteredMarkets.length === 1 ? 'result' : 'results'}
          </p>
        </div>

        {/* Market Cards Grid */}
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" role="status" aria-label="Loading markets">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <motion.div
                  key={i}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: prefersReducedMotion ? 0 : i * 0.1 }}
                >
                  <Skeleton className="h-[380px] rounded-[32px] bg-gray-200 dark:bg-gray-800" />
                </motion.div>
              ))}
            </div>
          ) : filteredMarkets.length === 0 ? (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/40 dark:bg-gray-800/40 rounded-[32px] border border-dashed border-gray-300 dark:border-gray-700 backdrop-blur-sm"
            >
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4 text-3xl shadow-inner">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No markets found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">We couldn&apos;t find any markets matching your current filters.</p>
              <button
                onClick={() => { setSearchTerm(''); setActiveStatusTab('Active'); }}
                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-full font-bold transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:-translate-y-0.5"
              >
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedMarkets.map((market, index) => (
                <motion.div
                  key={market.id}
                  layout={!prefersReducedMotion}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : index * 0.05 }}
                >
                  <MarketCard
                    market={market}
                    prefersReducedMotion={prefersReducedMotion}
                    getMarketLogo={getMarketLogo}
                    formatNumber={formatNumber}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Pagination */
          !loading && filteredMarkets.length > 0 && (
            <div className="mt-16 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
      </main>
    </div>
  );
}