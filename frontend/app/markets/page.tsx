'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, Activity, Clock, SlidersHorizontal, TrendingUp, Loader2, X } from 'lucide-react';
import Header from '@/components/Header';
import { getMarketCount, getMarket, getPriceYes, getMarketResolution, getMarketState, isAdmin as checkIsAdmin } from '@/lib/hooks';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { Skeleton } from '@/components/ui/skeleton';
import { PriceDisplay } from '@/components/market/PriceDisplay';
import { Sparkline } from '@/components/market/Sparkline';
import { useAccount } from 'wagmi';
import { Shield, AlertTriangle } from 'lucide-react';

// --- Helper Functions ---

const formatPriceLocal = (price: number): string => {
  const cents = price * 100;
  if (cents >= 100) return `$${cents.toFixed(2)}`;
  return `${cents.toFixed(1).replace(/\.0$/, '')}¢`;
};

const formatTimeRemaining = (expiryTimestamp: bigint): string => {
  if (expiryTimestamp === 0n) return 'N/A';
  const now = Math.floor(Date.now() / 1000);
  const expiry = Number(expiryTimestamp);
  const secondsRemaining = expiry - now;
  
  if (secondsRemaining <= 0) return 'Expired';
  
  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const STATUS_FILTERS = ['Active', 'Expired', 'Resolved', 'Cancelled'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// --- Sub-Components ---

function MarketCountdown({ expiryTimestamp, isResolved }: { expiryTimestamp: bigint, isResolved: boolean }) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  useEffect(() => {
    if (expiryTimestamp === 0n) { setTimeRemaining('N/A'); return; }
    
    const updateCountdown = () => {
      if (isResolved) { setTimeRemaining('Ended'); return; }

      const now = Math.floor(Date.now() / 1000);
      const expiry = Number(expiryTimestamp);
      const secondsRemaining = expiry - now;
      
      if (secondsRemaining <= 0) { setTimeRemaining('Expired'); return; }
      
      const days = Math.floor(secondsRemaining / 86400);
      const hours = Math.floor((secondsRemaining % 86400) / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      
      if (days > 0) setTimeRemaining(`${days}d ${hours}h`);
      else if (hours > 0) setTimeRemaining(`${hours}h ${minutes}m`);
      else setTimeRemaining(`${minutes}m`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [expiryTimestamp, isResolved]);
  
  let colorClass = "text-gray-500 dark:text-gray-400";
  let bgClass = "bg-gray-100 dark:bg-gray-700/50";

  if (timeRemaining === 'Expired') {
     colorClass = "text-orange-600 dark:text-orange-400";
     bgClass = "bg-orange-100 dark:bg-orange-500/10";
  }
  if (isResolved || timeRemaining === 'Ended') {
     colorClass = "text-purple-600 dark:text-purple-400";
     bgClass = "bg-purple-100 dark:bg-purple-500/10";
  }
  
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${bgClass} ${colorClass}`}
      role="status"
      aria-label={`Market ${isResolved ? 'ended' : timeRemaining === 'Expired' ? 'expired' : `expires in ${timeRemaining}`}`}
    >
      <Clock className="w-3 h-3" aria-hidden="true" />
      <span>{timeRemaining || formatTimeRemaining(expiryTimestamp)}</span>
    </div>
  );
}

// --- NEW STATS BANNER COMPONENT ---
interface StatsBannerProps {
  liquidity: string;
  traders: string;
  liveMarkets: number;
  resolvedMarkets: number;
  expiredMarkets: number;
  loading?: boolean;
  prefersReducedMotion?: boolean;
}

function StatsBanner({ liquidity, traders, liveMarkets, resolvedMarkets, expiredMarkets, loading = false, prefersReducedMotion = false }: StatsBannerProps) {
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.2 }}
      className="relative w-full z-20 mt-12 mb-16 -mx-4 sm:-mx-6 lg:-mx-8"
      role="region"
      aria-label="Platform statistics"
    >
      {/* Container Card */}
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-2xl shadow-[#14B8A6]/10 border border-gray-100 dark:border-gray-700 overflow-hidden relative min-h-[160px] flex items-center">

        {/* Left Decoration Image */}
        <div className="absolute left-0 bottom-0 top-0 w-32 sm:w-48 md:w-64 lg:w-80">
           <Image
             src="/leftside.png"
             alt=""
             fill
             className="object-contain object-left-bottom"
             priority
           />
        </div>

        {/* Right Decoration Image */}
        <div className="absolute right-0 top-0 bottom-0 w-32 sm:w-48 md:w-64 lg:w-80">
           <Image
             src="/rightside.png"
             alt=""
             fill
             className="object-contain object-right-top"
             priority
           />
        </div>

        {/* Stats Content (Centered) */}
        <div className="relative z-10 w-full flex flex-col md:flex-row justify-around items-center gap-8 py-6 px-8 md:px-24 lg:px-32">

            {/* Stat 1: Volume */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.3, duration: prefersReducedMotion ? 0 : 0.5 }}
              className="flex flex-col items-center text-center"
            >
                <span className="text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Total Liquidity</span>
                {loading ? (
                  <div className="h-12 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ) : (
                  <motion.span
                    initial={prefersReducedMotion ? false : { scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: prefersReducedMotion ? 0 : 0.4, type: "spring", stiffness: 200 }}
                    className="text-3xl md:text-5xl font-black text-[#0f0a2e] dark:text-white tracking-tighter"
                  >
                     {liquidity}
                  </motion.span>
                )}
            </motion.div>

            {/* Divider (Hidden on Mobile) */}
            <div className="hidden md:block w-px h-16 bg-gray-100 dark:bg-gray-700" aria-hidden="true"></div>

            {/* Stat 2: Active Traders */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.4, duration: prefersReducedMotion ? 0 : 0.5 }}
              className="flex flex-col items-center text-center"
            >
                <span className="text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Active Traders</span>
                {loading ? (
                  <div className="h-12 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ) : (
                  <motion.span
                    initial={prefersReducedMotion ? false : { scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: prefersReducedMotion ? 0 : 0.5, type: "spring", stiffness: 200 }}
                    className="text-3xl md:text-5xl font-black text-[#0f0a2e] dark:text-white tracking-tighter"
                  >
                     {traders}
                  </motion.span>
                )}
            </motion.div>

            {/* Divider (Hidden on Mobile) */}
            <div className="hidden md:block w-px h-16 bg-gray-100 dark:bg-gray-700" aria-hidden="true"></div>

            {/* Stat 3: Live Markets */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.5, duration: prefersReducedMotion ? 0 : 0.5 }}
              className="flex flex-col items-center text-center"
            >
                <span className="text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Live Markets</span>
                {loading ? (
                  <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ) : (
                  <motion.span
                    initial={prefersReducedMotion ? false : { scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: prefersReducedMotion ? 0 : 0.6, type: "spring", stiffness: 200 }}
                    className="text-3xl md:text-5xl font-black text-[#0f0a2e] dark:text-white tracking-tighter"
                  >
                     {liveMarkets}
                  </motion.span>
                )}
                {!loading && resolvedMarkets > 0 && (
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-1">
                    {resolvedMarkets} resolved
                  </span>
                )}
            </motion.div>

        </div>
      </div>
    </motion.div>
  );
}

interface MarketCard {
  id: number;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  yesPercent: number;
  noPercent: number;
  status: 'LIVE TRADING' | 'EXPIRED' | 'RESOLVED' | 'CANCELLED';
  totalPairsUSDC: bigint;
  expiryTimestamp: bigint;
  oracleType: number;
  isResolved: boolean;
  yesWins?: boolean;
  priceHistory?: number[];
  isCancelled?: boolean;
}

export default function MarketsPage() {
  const { address } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (address) {
      checkIsAdmin(address).then(setIsAdmin);
    }
  }, [address]);
  const [marketCount, setMarketCount] = useState<number | null>(null);
  const [markets, setMarkets] = useState<MarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatusTab, setActiveStatusTab] = useState<StatusFilter>('Active');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(loadMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- Data Loading Logic ---
  const loadMarkets = async () => {
    try {
      const count = await getMarketCount();
      const countNum = Number(count);
      setMarketCount(countNum);

      // Fetch recent trades from subgraph for sparklines
      let historyMap: Record<string, number[]> = {};
      try {
        const historyData = await fetchSubgraph<{ markets: { id: string, trades: { priceE6: string }[] }[] }>(
          `query MarketHistory {
            markets(first: 100) {
              id
              trades(orderBy: timestamp, orderDirection: desc, first: 10) {
                priceE6
              }
            }
          }`
        );
        historyData.markets.forEach(m => {
          historyMap[m.id] = m.trades.map(t => Number(t.priceE6) / 1e6).reverse();
        });
      } catch (e) {
        console.error('Failed to fetch sparkline data', e);
      }

      const marketIds = Array.from({ length: countNum }, (_, i) => i + 1);
      
      const marketPromises = marketIds.map(async (i) => {
        try {
          const [market, priceYes, resolution, state] = await Promise.all([
            getMarket(BigInt(i)),
            getPriceYes(BigInt(i)),
            getMarketResolution(BigInt(i)),
            getMarketState(BigInt(i)),
          ]);
          
          if (!market.exists) return null;

          const now = Math.floor(Date.now() / 1000);
          const expiryTimestamp = resolution.expiryTimestamp || 0n;
          const isExpired = expiryTimestamp > 0n && Number(expiryTimestamp) < now;

          // Use status from getMarketState (more reliable) - it's at index 4 for diamond/testnet
          // Fallback to market.status if state.status is not available
          const marketStatusNum = state?.status !== undefined ? Number(state.status) : (typeof market.status === 'number' ? market.status : Number(market?.status ?? 0));
          
          let status: 'LIVE TRADING' | 'EXPIRED' | 'RESOLVED' | 'CANCELLED' = 'LIVE TRADING';
          // MarketStatus: 0 = Active, 1 = Resolved, 2 = Cancelled
          // IMPORTANT: Check cancelled FIRST because cancelled markets also have isResolved = true
          if (marketStatusNum === 2) {
            status = 'CANCELLED';
          } else if (resolution.isResolved) {
            status = 'RESOLVED';
          } else if (isExpired) {
            status = 'EXPIRED';
          }
          
          // Debug logging for cancelled markets
          if (marketStatusNum === 2) {
            console.log(`[MarketsPage] Market ${i} is CANCELLED:`, {
              marketStatusNum,
              statusFromState: state?.status,
              statusFromMarket: market.status,
              finalStatus: status,
              isResolved: resolution.isResolved,
              question: market.question
            });
          }

          const totalPairs = Number(formatUnits(state.vault, 6));
          let yesPriceNum = parseFloat(priceYes);
          let yesPriceClean = Number.isFinite(yesPriceNum) ? yesPriceNum : 0;
          let noPriceClean = Number.isFinite(yesPriceNum) ? Math.max(0, 1 - yesPriceNum) : 0;
          let yesPercent = Math.round(yesPriceClean * 100);
          let noPercent = 100 - yesPercent;

          if (resolution.isResolved) {
            if (resolution.yesWins) {
              yesPriceClean = 1; noPriceClean = 0; yesPercent = 100; noPercent = 0;
            } else {
              yesPriceClean = 0; noPriceClean = 1; yesPercent = 0; noPercent = 100;
            }
          }

          return {
            id: i,
            question: typeof market.question === 'string' ? market.question : String(market.question ?? 'Untitled Market'),
            yesPrice: yesPriceClean,
            noPrice: noPriceClean,
            volume: totalPairs,
            yesPercent,
            noPercent,
            status,
            totalPairsUSDC: state.vault,
            expiryTimestamp: resolution.expiryTimestamp || 0n,
            oracleType: resolution.oracleType || 0,
            isResolved: resolution.isResolved || false,
            yesWins: resolution.yesWins,
            isCancelled: marketStatusNum === 2,
            priceHistory: historyMap[i.toString()] || [yesPriceClean, yesPriceClean], // Fallback to current price
          } as MarketCard;
        } catch (error) {
          console.error(`Error loading market ${i}:`, error);
          return null;
        }
      });
      
      const marketResults = await Promise.all(marketPromises);
      setMarkets(marketResults.filter((market): market is MarketCard => market !== null));
    } catch (error) {
      console.error('Error loading markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMarkets = markets.filter(market => {
    if (searchTerm && !market.question.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (activeStatusTab) {
      if (activeStatusTab === 'Active' && market.status !== 'LIVE TRADING') return false;
      if (activeStatusTab === 'Expired' && market.status !== 'EXPIRED') return false;
      if (activeStatusTab === 'Resolved' && market.status !== 'RESOLVED') return false;
      if (activeStatusTab === 'Cancelled' && market.status !== 'CANCELLED') return false;
    }
    if (activeCategory !== 'All') {
      const categoryLower = activeCategory.toLowerCase();
      const questionLower = market.question.toLowerCase();
      if (categoryLower === 'crypto') {
        const cryptoKeywords = ['btc', 'bitcoin', 'eth', 'ethereum', 'crypto', 'sol', 'solana', 'xrp', 'doge', 'dogecoin', 'bnb', 'matic'];
        if (!cryptoKeywords.some(keyword => questionLower.includes(keyword))) return false;
      } else if (!questionLower.includes(categoryLower)) return false;
    }
    return true;
  });

  const stats = useMemo(() => {
    if (markets.length === 0) return { liquidity: 0, live: 0, resolved: 0, expired: 0, cancelled: 0, total: 0 };
    let liquidity = 0, live = 0, resolved = 0, expired = 0, cancelled = 0;
    for (const market of markets) {
      liquidity += Number(formatUnits(market.totalPairsUSDC, 6));
      if (market.status === 'LIVE TRADING') live += 1;
      else if (market.status === 'RESOLVED') resolved += 1;
      else if (market.status === 'EXPIRED') expired += 1;
      else if (market.status === 'CANCELLED') cancelled += 1;
    }
    return { liquidity, live, resolved, expired, cancelled, total: markets.length };
  }, [markets]);

  const formatNumber = useCallback((value: number, decimals = 0) => {
    return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }, []);

  const liquidityDisplay = stats.liquidity >= 1 ? formatNumber(stats.liquidity, stats.liquidity >= 1000 ? 0 : 2) : formatNumber(stats.liquidity, 2);
   
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

  const categories = ['All', 'Crypto', 'Politics', 'Sports', 'Tech', 'Finance'];

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
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden font-sans selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white">
      
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Page Header Area */}
        <div className="flex flex-col items-center text-center justify-center gap-4 mb-2">
           <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 text-[#0d9488] dark:text-[#2dd4bf] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
                Live Markets
              </div>
           </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-[#0f0a2e] dark:text-white tracking-tighter leading-[0.9]">
            Explore <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] via-teal-400 to-emerald-400 animate-gradient-x">
              Opportunities.
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl leading-relaxed font-medium">
            Trade on the outcome of real-world events.
          </p>
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
        <div className="sticky top-20 z-30 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-2xl p-4 mb-8 shadow-sm transition-all">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
             
             {/* Left: Filters & Search */}
             <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto flex-1">
                {/* Search Bar */}
                <div className="relative w-full sm:w-80 group">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#14B8A6] transition-colors" aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Search markets..."
                    className="w-full pl-10 pr-4 h-11 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] outline-none transition-all placeholder:text-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search markets by question"
                    role="searchbox"
                  />
                </div>

                {/* Status Tabs */}
                <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar" role="group" aria-label="Market status filter">
                  {STATUS_FILTERS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveStatusTab(tab)}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                        activeStatusTab === tab
                          ? 'bg-white dark:bg-gray-700 text-[#0f0a2e] dark:text-white shadow-sm ring-1 ring-black/5'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                      role="radio"
                      aria-checked={activeStatusTab === tab}
                      aria-label={`Filter ${tab.toLowerCase()} markets`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
            </div>

            {/* Right: Category Pills */}
            <div className="w-full lg:w-auto flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar mask-gradient-right" role="group" aria-label="Category filter">
              <SlidersHorizontal className="w-4 h-4 text-gray-400 shrink-0 mr-1" aria-hidden="true" />
              {categories.map((category) => (
                <motion.button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap border ${
                    activeCategory === category
                      ? "bg-[#14B8A6] border-[#14B8A6] text-white shadow-md shadow-[#14B8A6]/20"
                      : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#14B8A6]/50 hover:text-[#14B8A6]"
                  }`}
                  aria-label={`Filter ${category} markets`}
                  aria-pressed={activeCategory === category}
                >
                  {category}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="mb-6 flex items-center justify-between px-2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Showing <span className="text-gray-900 dark:text-white font-bold">{filteredMarkets.length}</span> results
          </p>
        </div>

        {/* Market Cards Grid */}
        <AnimatePresence mode="popLayout">
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="Loading markets">
                {[1,2,3,4,5,6].map(i => (
                  <motion.div
                    key={i}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: prefersReducedMotion ? 0 : i * 0.1 }}
                  >
                    <Skeleton className="h-[340px] rounded-[28px]" />
                  </motion.div>
                ))}
             </div>
          ) : filteredMarkets.length === 0 ? (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/40 dark:bg-gray-800/40 rounded-[32px] border border-dashed border-gray-300 dark:border-gray-700"
            >
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-3xl">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No markets found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">We couldn&apos;t find any markets matching your current filters.</p>
              <button 
                onClick={() => { setSearchTerm(''); setActiveCategory('All'); setActiveStatusTab('Active'); }} 
                className="px-6 py-2 bg-[#14B8A6] hover:bg-[#0d9488] text-white rounded-full font-bold transition-colors shadow-lg shadow-teal-500/20"
              >
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMarkets.map((market, index) => (
                <motion.div
                  key={market.id}
                  layout={!prefersReducedMotion}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : index * 0.05 }}
                >
                  <Link
                    href={`/markets/${market.id}`}
                    className="block h-full group"
                    aria-label={`Market ${market.id}: ${market.question}. ${market.status === 'LIVE TRADING' ? 'Live trading' : market.status === 'RESOLVED' ? 'Ended' : 'Expired'}. Yes price: ${formatPriceLocal(market.yesPrice)}, No price: ${formatPriceLocal(market.noPrice)}`}
                  >
                    <motion.div
                      className="h-full bg-white dark:bg-gray-800/60 backdrop-blur-xl rounded-[28px] p-1 border border-gray-100 dark:border-gray-700/50 hover:border-[#14B8A6] dark:hover:border-[#14B8A6] hover:shadow-2xl hover:shadow-[#14B8A6]/10 transition-all duration-300 flex flex-col relative overflow-hidden ring-1 ring-gray-900/5 dark:ring-white/5"
                      whileHover={prefersReducedMotion ? {} : { y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      
                      {/* Inner Card Content */}
                      <div className="flex-1 p-5 flex flex-col">
                        
                        {/* Top Section: Logo & Status */}
                        <div className="flex justify-between items-start mb-4">
                           <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                             {market.question ? (
                               <Image
                                src={getMarketLogo(market.question)}
                                alt="Logo"
                                width={32}
                                height={32}
                                className="object-contain"
                                unoptimized
                              />
                             ) : <div className="text-xl">📈</div>}
                           </div>

                           <div className="flex items-center gap-2">
                             {market.status === 'LIVE TRADING' ? (
                               <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                 <span className="relative flex h-1.5 w-1.5">
                                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                   <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                 </span>
                                 Live
                               </div>
                             ) : market.status === 'CANCELLED' ? (
                               <div className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide flex items-center gap-1">
                                 <X className="w-3 h-3" />
                                 Cancelled
                               </div>
                             ) : (
                               <div className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                 {market.status === 'RESOLVED' ? 'Ended' : 'Expired'}
                               </div>
                             )}
                             {/* Admin Indicator for expired markets needing resolution */}
                             {isAdmin && market.status === 'EXPIRED' && !market.isResolved && market.oracleType === 1 && (
                               <div 
                                 className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1"
                                 title="Admin: This market needs resolution"
                               >
                                 <Shield className="w-3 h-3" />
                                 Action
                               </div>
                             )}
                           </div>
                        </div>

                        {/* Question */}
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-2 group-hover:text-[#14B8A6] transition-colors">
                          {market.question}
                        </h3>

                        {/* Sparkline */}
                        <div className="mb-4 h-[30px] flex items-end">
                          {market.priceHistory && market.priceHistory.length >= 2 ? (
                            <Sparkline 
                              data={market.priceHistory} 
                              color={market.yesPrice > (market.priceHistory[0] || 0) ? '#10b981' : '#ef4444'} 
                            />
                          ) : (
                            <div className="w-full h-[2px] bg-gray-100 dark:bg-gray-700/50 rounded-full" />
                          )}
                        </div>

                        <div className="mt-auto space-y-5">
                          
                          {/* Probability Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                              <span>Yes Chance</span>
                              <span>{market.yesPercent}%</span>
                            </div>
                            <div className="h-3 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden flex shadow-inner">
                              <div 
                                style={{ width: `${market.yesPercent}%` }} 
                                className="h-full bg-gradient-to-r from-[#14B8A6] to-teal-400 transition-all duration-1000 ease-out relative"
                              >
                                <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-white/30"></div>
                              </div>
                            </div>
                          </div>

                          {/* Price Cards */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center group-hover:border-emerald-300 dark:group-hover:border-emerald-500/40 transition-colors">
                              <span className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase">Yes</span>
                              <PriceDisplay 
                                price={market.yesPrice} 
                                priceClassName="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight"
                              />
                            </div>
                            <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-500/20 rounded-xl p-3 flex flex-col items-center justify-center group-hover:border-rose-300 dark:group-hover:border-rose-500/40 transition-colors">
                              <span className="text-[10px] font-bold text-rose-600/60 dark:text-rose-400/60 uppercase">No</span>
                              <PriceDisplay 
                                price={market.noPrice} 
                                priceClassName="text-lg font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight"
                              />
                            </div>
                          </div>
                          
                          {/* Footer Info */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/40">
                             <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>${formatNumber(market.volume)} Vol</span>
                             </div>
                             <MarketCountdown expiryTimestamp={market.expiryTimestamp} isResolved={market.isResolved} />
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

      </main>

    </div>
  );
}