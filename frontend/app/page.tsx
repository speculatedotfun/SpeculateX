'use client';

export const dynamic = 'force-dynamic';

// Import BigInt serializer first
import '@/lib/bigint-serializer';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import { getMarketCount } from '@/lib/hooks';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccount } from 'wagmi';
import { useAddresses } from '@/lib/contracts';
import { formatCompact } from '@/lib/format';
import { Pagination } from '@/components/ui/Pagination';

// NEW IMPORTS
import { StatsBanner } from '@/components/market/StatsBanner';
import { MarketCard, MarketCardData } from '@/components/market/MarketCard';
import { FeaturedMarketCard } from '@/components/market/FeaturedMarketCard';
import { QuickBuyModal } from '@/components/QuickBuyModal';
import { Filter, ArrowUpDown } from 'lucide-react';
import { useMarketsListOptimized } from '@/lib/hooks/useMarketsListOptimized'; // NEW HOOK
import { detectCryptoSymbol } from '@/lib/hooks/useCryptoPrice';

const STATUS_FILTERS = ['Active', 'Resolved'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function MarketsPage() {
  const { address } = useAccount();
  const addresses = useAddresses();

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
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Quick Buy Modal State
  const [quickBuyModal, setQuickBuyModal] = useState<{
    isOpen: boolean;
    marketId: number | null;
    side: 'yes' | 'no';
  }>({ isOpen: false, marketId: null, side: 'yes' });

  const handleQuickBuy = useCallback((marketId: number, side: 'yes' | 'no') => {
    setQuickBuyModal({ isOpen: true, marketId, side });
  }, []);

  const handleCloseQuickBuy = useCallback(() => {
    setQuickBuyModal({ isOpen: false, marketId: null, side: 'yes' });
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Removed old loadMarkets and useEffect


  // Get available coins from markets
  const availableCoins = useMemo(() => {
    const coinSet = new Set<string>();
    markets.forEach(market => {
      const { baseToken } = detectCryptoSymbol(market.question || '');
      if (baseToken) {
        coinSet.add(baseToken);
      }
    });
    return Array.from(coinSet).sort();
  }, [markets]);

  const filteredMarkets = useMemo(() => {
    let result = markets.filter(market => {
      // Always filter out scheduled markets - users should not see them
      if (market.status === 'SCHEDULED') return false;

      if (searchTerm && !market.question.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (activeStatusTab) {
        if (activeStatusTab === 'Active' && market.status !== 'LIVE TRADING') return false;
        if (activeStatusTab === 'Resolved' && market.status !== 'RESOLVED') return false;
      }
      // Coin filter
      if (selectedCoin) {
        const { baseToken } = detectCryptoSymbol(market.question || '');
        if (baseToken !== selectedCoin) return false;
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
  }, [markets, searchTerm, activeStatusTab, sortBy, selectedCoin]);

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
  }, [searchTerm, activeStatusTab, selectedCoin]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredMarkets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedMarkets = filteredMarkets.slice(startIndex, endIndex);

  const stats = useMemo(() => {
    if (markets.length === 0) return { liquidity: 0, live: 0, resolved: 0, cancelled: 0, total: 0 };
    let liquidity = 0, live = 0, resolved = 0, cancelled = 0;
    for (const market of markets) {
      const vaultValue = typeof market.totalPairsUSDC === 'bigint' ? market.totalPairsUSDC : BigInt(market.totalPairsUSDC || 0);
      liquidity += Number(formatUnits(vaultValue, addresses.usdcDecimals ?? 6));
      if (market.status === 'LIVE TRADING') live += 1;
      else if (market.status === 'RESOLVED') resolved += 1;
      else if (market.status === 'CANCELLED') cancelled += 1;
    }
    return { liquidity, live, resolved, cancelled, total: markets.length };
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
    <div className="flex-1 flex flex-col relative font-sans selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white">

      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#FAF9FF] dark:bg-[#0f1219]">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[bottom_1px_center]"></div>
        <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-teal-400/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <Header
        stats={{
          liquidity: `$${liquidityDisplay}`,
          traders: formatNumber(Number(activeTraders))
        }}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showSearch={true}
      />

      <main className="relative z-10 w-full mx-auto max-w-[1440px] px-6 py-6 flex-1">

        {/* Hero Section - Two Column Layout */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-4"
        >
          <div>
            {/* Left: Hero Content */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
                Price the Future
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-4">
                Trade YES/NO shares on what happens next.
              </p>

              {/* CTA Buttons with How it Works Tooltip */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => document.getElementById('markets-grid')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  Explore Markets
                </button>

                {/* How it Works Tooltip Trigger */}
                <div className="relative group">
                  <button className="px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:border-slate-300 dark:hover:border-gray-600 transition-all flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">?</span>
                    How it Works
                  </button>

                  {/* Tooltip Content */}
                  <div className="absolute left-0 top-full mt-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl p-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">1</span>
                          <span className="text-sm text-slate-700 dark:text-slate-300">Buy YES or NO shares</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                          <span className="text-sm text-slate-700 dark:text-slate-300">Price = probability</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">3</span>
                          <span className="text-sm text-slate-700 dark:text-slate-300">Settles to $1 if you're right</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between">
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="text-amber-500">💡</span>
                          <span>YES at 70¢ → win $1</span>
                        </p>
                        <a href="/docs" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                          Learn more →
                        </a>
                      </div>
                      {/* Tooltip Arrow */}
                      <div className="absolute -top-2 left-8 w-4 h-4 bg-white dark:bg-gray-900 border-l border-t border-slate-200 dark:border-gray-700 rotate-45" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- FEATURED MARKET --- */}
        {!loading && featuredMarket && !searchTerm && activeStatusTab === 'Active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 mb-6"
          >
            {/* Featured Pill + Reason */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-500/20 dark:border-amber-500/30">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Featured</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Highest volume today</span>
            </div>
            {/* Glow wrapper */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 rounded-2xl blur-lg opacity-50 dark:opacity-30"></div>
              <div className="relative">
                <FeaturedMarketCard
                  market={featuredMarket}
                  getMarketLogo={getMarketLogo}
                  formatNumber={formatNumber}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* --- CONTROLS BAR --- */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 mb-4 w-full"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Left: Status Filters (underline style) */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {STATUS_FILTERS.map((tab) => {
                // Get count for each tab
                let count = 0;
                if (tab === 'Active') count = stats.live;
                else if (tab === 'Resolved') count = stats.resolved;
                else if (tab === 'Cancelled') count = stats.cancelled;

                const isActive = activeStatusTab === tab;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveStatusTab(tab)}
                    className={`
                      relative px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap
                      ${isActive
                        ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }
                    `}
                  >
                    {tab} <span className="text-xs">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Sort Dropdown + Coin Filter */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none h-8 pl-3 pr-7 bg-white dark:bg-gray-800 rounded-full text-sm border border-slate-200 dark:border-gray-700 cursor-pointer hover:border-slate-300 dark:hover:border-gray-600 transition-colors text-slate-700 dark:text-gray-200"
                >
                  <option value="volume">Highest Volume</option>
                  <option value="newest">Newest Listed</option>
                  <option value="ending">Ending Soon</option>
                </select>
                <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-gray-400 pointer-events-none" />
              </div>

              {/* Coin Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedCoin || ''}
                  onChange={(e) => setSelectedCoin(e.target.value || null)}
                  className="appearance-none h-8 pl-3 pr-7 bg-white dark:bg-gray-800 rounded-full text-sm border border-slate-200 dark:border-gray-700 cursor-pointer hover:border-slate-300 dark:hover:border-gray-600 transition-colors text-slate-700 dark:text-gray-200"
                >
                  <option value="">All Coins</option>
                  {availableCoins.map(coin => (
                    <option key={coin} value={coin}>{coin}</option>
                  ))}
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Counter */}
        <div className="mt-4 mb-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredMarkets.length} results</span>
          </p>
        </div>

        {/* Market Cards Grid */}
        <div id="markets-grid">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" role="status" aria-label="Loading markets">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <motion.div
                    key={i}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: prefersReducedMotion ? 0 : i * 0.1 }}
                  >
                    <Skeleton className="h-[240px] rounded-xl bg-gray-200 dark:bg-gray-800" />
                  </motion.div>
                ))}
              </div>
            ) : filteredMarkets.length === 0 ? (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/40 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 backdrop-blur-sm"
              >
                {/* Tab-specific empty states */}
                {activeStatusTab === 'Active' && (
                  <>
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-4 text-3xl shadow-inner">🔍</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No markets found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">We couldn&apos;t find any markets matching your current filters.</p>
                  </>
                )}
                {activeStatusTab === 'Resolved' && (
                  <>
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4 text-3xl shadow-inner">📊</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No resolved markets yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">Check back soon to see completed markets and their outcomes.</p>
                  </>
                )}
                <button
                  onClick={() => { setSearchTerm(''); setActiveStatusTab('Active'); }}
                  className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-full font-bold transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:-translate-y-0.5"
                >
                  View active markets
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      onQuickBuy={handleQuickBuy}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

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

      {/* Quick Buy Modal */}
      {quickBuyModal.marketId && (() => {
        const selectedMarket = markets.find(m => m.id === quickBuyModal.marketId);
        if (!selectedMarket) return null;
        return (
          <QuickBuyModal
            isOpen={quickBuyModal.isOpen}
            onClose={handleCloseQuickBuy}
            marketId={quickBuyModal.marketId}
            initialSide={quickBuyModal.side}
            question={selectedMarket.question}
            logoUrl={getMarketLogo(selectedMarket.question)}
            yesPrice={selectedMarket.yesPrice}
            noPrice={selectedMarket.noPrice}
          />
        );
      })()}
    </div >
  );
}
