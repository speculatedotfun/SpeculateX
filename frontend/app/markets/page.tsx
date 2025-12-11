'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, TrendingUp, Users, Activity, Clock } from 'lucide-react';
import Header from '@/components/Header';
import { Badge, Input } from '@/components/ui';
import { getMarketCount, getMarket, getPriceYes, getMarketResolution, getMarketState } from '@/lib/hooks';
import { formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';

// --- Helper Functions (Kept Logic, Improved Formatting) ---

const formatPriceInCents = (price: number): string => {
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

const STATUS_FILTERS = ['Active', 'Expired', 'Resolved'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// --- Sub-Components ---

// Real-time countdown component
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
  
  // Style based on status
  let colorClass = "text-gray-500 dark:text-gray-400";
  if (timeRemaining === 'Expired') colorClass = "text-orange-500";
  if (isResolved || timeRemaining === 'Ended') colorClass = "text-purple-500";
  
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      <Clock className={`w-3.5 h-3.5 ${colorClass}`} />
      <span className={colorClass}>{timeRemaining || formatTimeRemaining(expiryTimestamp)}</span>
    </div>
  );
}

// Stats Card Component
function StatBox({ label, value, subtext, icon: Icon }: any) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
      <div className="w-12 h-12 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-[#14B8A6]" />
      </div>
      <div>
        <div className="text-2xl font-black text-[#0f0a2e] dark:text-white tracking-tight leading-none mb-1">
          {value}
        </div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
          {label}
        </div>
        {subtext && <div className="text-[10px] text-gray-500 font-medium">{subtext}</div>}
      </div>
    </div>
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
  status: 'LIVE TRADING' | 'EXPIRED' | 'RESOLVED';
  totalPairsUSDC: bigint;
  expiryTimestamp: bigint;
  oracleType: number;
  isResolved: boolean;
  yesWins?: boolean;
}

export default function MarketsPage() {
  const [marketCount, setMarketCount] = useState<number | null>(null);
  const [markets, setMarkets] = useState<MarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatusTab, setActiveStatusTab] = useState<StatusFilter>('Active');
  const publicClient = usePublicClient();

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(loadMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- Data Loading Logic (Unchanged) ---
  const loadMarkets = async () => {
    try {
      const count = await getMarketCount();
      const countNum = Number(count);
      setMarketCount(countNum);
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

          let status: 'LIVE TRADING' | 'EXPIRED' | 'RESOLVED' = 'LIVE TRADING';
          if (resolution.isResolved) status = 'RESOLVED';
          else if (isExpired) status = 'EXPIRED';

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

  // --- Filtering Logic (Unchanged) ---
  const filteredMarkets = markets.filter(market => {
    if (searchTerm && !market.question.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (activeStatusTab) {
      if (activeStatusTab === 'Active' && market.status !== 'LIVE TRADING') return false;
      if (activeStatusTab === 'Expired' && market.status !== 'EXPIRED') return false;
      if (activeStatusTab === 'Resolved' && market.status !== 'RESOLVED') return false;
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

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    if (markets.length === 0) return { liquidity: 0, live: 0, resolved: 0, expired: 0, total: 0 };
    let liquidity = 0, live = 0, resolved = 0, expired = 0;
    for (const market of markets) {
      liquidity += Number(formatUnits(market.totalPairsUSDC, 6));
      if (market.status === 'LIVE TRADING') live += 1;
      else if (market.status === 'RESOLVED') resolved += 1;
      else if (market.status === 'EXPIRED') expired += 1;
    }
    return { liquidity, live, resolved, expired, total: markets.length };
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

  const categories = ['All', 'Crypto', 'Bitcoin', 'Ethereum', 'Politics', 'Sports', 'Tech', 'Finance'];

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
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden font-sans">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
             <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-[#14B8A6]/30 text-[#0d9488] bg-[#14B8A6]/5 px-3 py-1 text-xs font-bold uppercase tracking-widest">
                  Live Markets
                </Badge>
             </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0f0a2e] dark:text-white tracking-tighter leading-none mb-4">
              Explore <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] to-teal-400">Opportunities.</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl leading-relaxed">
              Trade on the outcome of real-world events. Every market reflects real-time sentiment and deep liquidity.
            </p>
          </motion.div>

          {/* Stats Dashboard */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto"
          >
            <StatBox 
              label="Liquidity" 
              value={`$${liquidityDisplay}`} 
              subtext="Total Pooled"
              icon={TrendingUp}
            />
            <StatBox 
              label="Traders" 
              value={formatNumber(Number(activeTraders))} 
              subtext="Active Unique"
              icon={Users}
            />
             <StatBox 
              label="Markets" 
              value={formatNumber(stats.total)} 
              subtext={`${stats.live} Live`}
              icon={Activity}
            />
          </motion.div>
        </div>

        {/* Controls: Search, Tabs, Categories */}
        <div className="space-y-6 mb-10">
          
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
             {/* Status Tabs */}
             <div className="bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl flex gap-1 w-full lg:w-auto">
              {STATUS_FILTERS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveStatusTab(tab)}
                  className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                    activeStatusTab === tab
                      ? 'bg-white dark:bg-gray-700 text-[#0f0a2e] dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full lg:w-96 group">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#14B8A6] transition-colors" />
              <Input
                placeholder="Search markets..."
                className="pl-12 h-12 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-all duration-200 ${
                  activeCategory === category
                    ? "bg-[#14B8A6] border-[#14B8A6] text-white shadow-lg shadow-[#14B8A6]/20"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-[#14B8A6]/50 hover:text-[#14B8A6]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Counter */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Showing <span className="text-gray-900 dark:text-white font-bold">{filteredMarkets.length}</span> markets
          </p>
        </div>

        {/* Market Cards Grid */}
        <AnimatePresence mode="popLayout">
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-64 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse border border-gray-200 dark:border-gray-700"></div>
                ))}
             </div>
          ) : filteredMarkets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-white/50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700"
            >
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No markets found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filters</p>
              <button onClick={() => { setSearchTerm(''); setActiveCategory('All'); }} className="text-[#14B8A6] font-bold hover:underline">Clear all filters</button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMarkets.map((market, index) => (
                <motion.div
                  key={market.id}
                  layout
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link href={`/markets/${market.id}`} className="block h-full">
                    <div className="group h-full bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-5 border border-gray-100 dark:border-gray-700/60 hover:border-[#14B8A6] dark:hover:border-[#14B8A6] hover:shadow-xl hover:shadow-[#14B8A6]/5 transition-all duration-300 flex flex-col relative overflow-hidden">
                      
                      {/* Active Pulse */}
                      {market.status === 'LIVE TRADING' && (
                        <div className="absolute top-0 right-0 p-5">
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </div>
                      )}

                      {/* Card Header */}
                      <div className="flex gap-4 mb-4 pr-4">
                        <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                           <Image
                            src={getMarketLogo(market.question)}
                            alt="Logo"
                            width={32}
                            height={32}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 group-hover:text-[#14B8A6] transition-colors">
                          {market.question}
                        </h3>
                      </div>

                      {/* Probability Bar */}
                      <div className="mt-auto mb-5 space-y-2">
                         <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                           <span>Yes {market.yesPercent}%</span>
                           <span>No {market.noPercent}%</span>
                         </div>
                         <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                           <div style={{ width: `${market.yesPercent}%` }} className="h-full bg-gradient-to-r from-[#14B8A6] to-teal-400"></div>
                         </div>
                      </div>

                      {/* Price Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-2.5 text-center group-hover:border-emerald-300 transition-colors">
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-0.5">Yes</div>
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatPriceInCents(market.yesPrice)}</div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-500/20 rounded-xl p-2.5 text-center group-hover:border-rose-300 transition-colors">
                          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-0.5">No</div>
                          <div className="text-lg font-black text-rose-600 dark:text-rose-400">{formatPriceInCents(market.noPrice)}</div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <Activity className="w-3.5 h-3.5" />
                          ${formatNumber(market.volume)} Vol
                        </div>
                        <MarketCountdown expiryTimestamp={market.expiryTimestamp} isResolved={market.isResolved} />
                      </div>

                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

      </main>

      {/* Simplified Footer matching Home */}
      <footer className="w-full bg-white/50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2025 SpeculateX. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
             <a href="#" className="hover:text-[#14B8A6]">Terms</a>
             <a href="#" className="hover:text-[#14B8A6]">Privacy</a>
             <a href="#" className="hover:text-[#14B8A6]">Docs</a>
          </div>
        </div>
      </footer>

    </div>
  );
}