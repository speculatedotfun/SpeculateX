'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, TrendingUp, Clock, Users, Activity, Filter, ArrowUpRight } from 'lucide-react';
import Header from '@/components/Header';
import { Badge, Button, Card, CardContent, Input, Skeleton } from '@/components/ui';
import { getMarketCount, getMarket, getPriceYes, getMarketResolution, getMarketState } from '@/lib/hooks';
import { formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';

// Helper function to format price in cents
const formatPriceInCents = (price: number): string => {
  const cents = price * 100;
  if (cents >= 100) {
    return `$${cents.toFixed(2)}`;
  }
  const formatted = cents.toFixed(1).replace(/\.0$/, '');
  return `${formatted}¢`;
};

// Helper function to format time remaining until expiry
const formatTimeRemaining = (expiryTimestamp: bigint): string => {
  if (expiryTimestamp === 0n) return 'N/A';
  
  const now = Math.floor(Date.now() / 1000);
  const expiry = Number(expiryTimestamp);
  const secondsRemaining = expiry - now;
  
  if (secondsRemaining <= 0) return 'Expired';
  
  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Helper function to get resolution type label
const getResolutionTypeLabel = (oracleType: number): string => {
  switch (oracleType) {
    case 0:
      return 'Manual';
    case 1:
      return 'Chainlink Auto';
    case 2:
      return 'Chainlink Functions';
    default:
      return 'Manual';
  }
};

const STATUS_FILTERS = ['Active', 'Expired', 'Resolved'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// Real-time countdown component for each market
function MarketCountdown({ expiryTimestamp }: { expiryTimestamp: bigint }) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  useEffect(() => {
    if (expiryTimestamp === 0n) {
      setTimeRemaining('N/A');
      return;
    }
    
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const expiry = Number(expiryTimestamp);
      const secondsRemaining = expiry - now;
      
      if (secondsRemaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      
      const days = Math.floor(secondsRemaining / 86400);
      const hours = Math.floor((secondsRemaining % 86400) / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [expiryTimestamp]);
  
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
      <Clock className="w-3.5 h-3.5" />
      <span className={`${
        timeRemaining === 'Expired' 
          ? 'text-red-600 font-bold' 
          : ''
      }`}>
        {timeRemaining || formatTimeRemaining(expiryTimestamp)}
      </span>
    </div>
  );
}

function MarketCardSkeleton() {
  return (
    <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-full shrink-0" />
        <div className="space-y-2.5 flex-1">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 flex-1 rounded-xl" />
      </div>
      <div className="space-y-3 pt-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  )
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
  oracleType: number; // 0 = None, 1 = ChainlinkFeed, 2 = ChainlinkFunctions
  isResolved: boolean;
  yesWins?: boolean;
}

export default function MarketsPage() {
  const [marketCount, setMarketCount] = useState<number | null>(null);
  const [markets, setMarkets] = useState<MarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatusTab, setActiveStatusTab] = useState<StatusFilter | null>('Active');
  const [showFilters, setShowFilters] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [minLiquidity, setMinLiquidity] = useState('');
  const [oracleFilter, setOracleFilter] = useState<'all' | 'manual' | 'chainlink'>('all');
  const publicClient = usePublicClient();

  useEffect(() => {
    loadMarkets();
    
    // Refresh markets every 30 seconds to update countdown timers
    const interval = setInterval(() => {
      loadMarkets();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadMarkets = async () => {
    try {
      const count = await getMarketCount();
      const countNum = Number(count);
      setMarketCount(countNum);
      
      // Create array of market IDs
      const marketIds = Array.from({ length: countNum }, (_, i) => i + 1);
      
      // Load all markets in parallel
      const marketPromises = marketIds.map(async (i) => {
        try {
          // Parallelize the calls for each market (market data, prices, and resolution)
          const [market, priceYes, resolution, state] = await Promise.all([
            getMarket(BigInt(i)),
            getPriceYes(BigInt(i)),
            getMarketResolution(BigInt(i)),
            getMarketState(BigInt(i)),
          ]);
          
          if (!market.exists) return null;

          // Determine status based on resolution and expiry
          const now = Math.floor(Date.now() / 1000);
          const expiryTimestamp = resolution.expiryTimestamp || 0n;
          const isExpired = expiryTimestamp > 0n && Number(expiryTimestamp) < now;

          let status: 'LIVE TRADING' | 'EXPIRED' | 'RESOLVED' = 'LIVE TRADING';
          if (resolution.isResolved) {
            status = 'RESOLVED';
          } else if (isExpired) {
            // Market has expired but not yet resolved
            status = 'EXPIRED';
          }

          const qYes = Number(formatUnits(state.qYes, 18));
          const qNo = Number(formatUnits(state.qNo, 18));
          const totalPairs = Number(formatUnits(state.vault, 6));
          const totalShares = qYes + qNo;

          let yesPercent = 50;
          let noPercent = 50;
          if (totalShares > 0) {
            yesPercent = Math.round((qYes / totalShares) * 100);
            noPercent = Math.round((qNo / totalShares) * 100);
          }

          const yesPriceNum = parseFloat(priceYes);
          const yesPriceClean = Number.isFinite(yesPriceNum) ? yesPriceNum : 0;
          const noPriceClean = Number.isFinite(yesPriceNum) ? Math.max(0, 1 - yesPriceNum) : 0;

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
      
      // Wait for all markets to load and filter out nulls
      const marketResults = await Promise.all(marketPromises);
      const marketArray = marketResults.filter((market): market is MarketCard => market !== null);
      
      setMarkets(marketArray);
    } catch (error) {
      console.error('Error loading markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMarkets = markets.filter(market => {
    if (searchTerm && !market.question.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    if (activeStatusTab) {
      switch (activeStatusTab) {
        case 'Active':
          if (market.status !== 'LIVE TRADING') return false;
          break;
        case 'Expired':
          if (market.status !== 'EXPIRED') return false;
          break;
        case 'Resolved':
          if (market.status !== 'RESOLVED') return false;
          break;
        default:
          break;
      }
    }

    if (activeCategory !== 'All') {
      const categoryLower = activeCategory.toLowerCase();
      const questionLower = market.question.toLowerCase();

      if (categoryLower === 'crypto') {
        const cryptoKeywords = ['btc', 'bitcoin', 'eth', 'ethereum', 'crypto', 'sol', 'solana', 'xrp', 'doge', 'dogecoin', 'bnb', 'matic'];
        if (!cryptoKeywords.some(keyword => questionLower.includes(keyword))) {
          return false;
        }
      } else if (!questionLower.includes(categoryLower)) {
        return false;
      }
    }

    if (!showResolved && market.status === 'RESOLVED' && activeStatusTab !== 'Resolved') return false;
    if (!showExpired && market.status === 'EXPIRED' && activeStatusTab !== 'Expired') return false;

    if (minLiquidity) {
      const min = parseFloat(minLiquidity) || 0;
      const liquidity = Number(formatUnits(market.totalPairsUSDC, 6));
      if (liquidity < min) return false;
    }

    if (oracleFilter !== 'all') {
      const isManual = market.oracleType === 0;
      if (oracleFilter === 'manual' && !isManual) return false;
      if (oracleFilter === 'chainlink' && isManual) return false;
    }

    return true;
  });

  const stats = useMemo(() => {
    if (markets.length === 0) {
      return {
        liquidity: 0,
        live: 0,
        resolved: 0,
        expired: 0,
        total: 0,
      };
    }

    let liquidity = 0;
    let live = 0;
    let resolved = 0;
    let expired = 0;

    for (const market of markets) {
      liquidity += Number(formatUnits(market.totalPairsUSDC, 6));
      if (market.status === 'LIVE TRADING') live += 1;
      else if (market.status === 'RESOLVED') resolved += 1;
      else if (market.status === 'EXPIRED') expired += 1;
    }

    return {
      liquidity,
      live,
      resolved,
      expired,
      total: markets.length,
    };
  }, [markets]);

  const formatNumber = useCallback((value: number, decimals = 0) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, []);

  const liquidityDisplay = stats.liquidity >= 1 ? formatNumber(stats.liquidity, stats.liquidity >= 1000 ? 0 : 2) : formatNumber(stats.liquidity, 2);
   
  // Fetch unique traders count from on-chain trade events
  const { data: activeTraders = 0 } = useQuery({
    queryKey: ['uniqueTraders'],
    queryFn: async () => {
      try {
        const data = await fetchSubgraph<{
          globalState: { uniqueTraders: number } | null;
        }>(
          `
            query UniqueTraders($id: ID!) {
              globalState(id: $id) {
                uniqueTraders
              }
            }
          `,
          { id: 'global' },
        );
        return Number.isFinite(data.globalState?.uniqueTraders)
          ? Number(data.globalState?.uniqueTraders ?? 0)
          : 0;
      } catch (error) {
        console.error('Error fetching unique traders stats from subgraph:', error);
        return 0;
      }
    },
    refetchInterval: 120_000,
  });

  const categories = ['All', 'Crypto', 'Bitcoin', 'Ethereum', 'Politics', 'Sports', 'Tech', 'Finance'];

  const getMarketLogo = (question?: string | null): string => {
    const normalized = typeof question === 'string' ? question : question != null ? String(question) : '';
    const q = normalized.toLowerCase();
    // More specific matches first to avoid false positives
    if (q.includes('aster')) return '/logos/ASTER_solana.png';
    if (q.includes('zcash') || q.includes('zec')) return '/logos/default.png'; // ZCASH logo not available yet
    if (q.includes('doge') || q.includes('dogecoin')) return '/logos/default.png'; // DOGE logo not available yet
    if (q.includes('btc') || q.includes('bitcoin')) return '/logos/BTC_ethereum.png';
    if (q.includes('eth') || q.includes('ethereum')) return '/logos/ETH_ethereum.png';
    if (q.includes('sol') || q.includes('solana')) return '/logos/SOL_solana.png';
    if (q.includes('xrp') || q.includes('ripple')) return '/logos/XRP_ethereum.png';
    if (q.includes('bnb') || q.includes('binance')) return '/logos/BNB_bsc.png';
    if (q.includes('ada') || q.includes('cardano')) return '/logos/ADA_ethereum.png';
    if (q.includes('atom') || q.includes('cosmos')) return '/logos/ATOM_ethereum.png';
    if (q.includes('dai')) return '/logos/DAI_ethereum.png';
    if (q.includes('usdt') || q.includes('tether')) return '/logos/USDT_ethereum.png';
    if (q.includes('tao')) return '/logos/TAO_ethereum.png';
    if (q.includes('will')) return '/logos/WILL_ethereum.png';
    if (q.includes('google')) return '/logos/GOOGLE_ethereum.png';
    // Default fallback
    return '/logos/default.png';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-hidden">
      {/* Animated Background - Figma inspired */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#14B8A6]/10 to-purple-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-[#14B8A6]/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="mb-12 text-center sm:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center sm:justify-start gap-2 mb-4"
          >
            <div className="px-3 py-1 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] text-xs font-bold tracking-wide flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              LIVE MARKETS
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-bold text-[#0f0a2e] text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.1] mb-6"
          >
            What&apos;s the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] to-blue-600">Market</span> Thinking?
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-500 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto sm:mx-0 mb-10"
          >
            Trade your convictions on sports, crypto, politics, and more. Real-time sentiment powered by liquidity.
          </motion.p>
        </div>

        {/* Stats Banner - Figma Design with Logo Patterns */}
        <div className="relative bg-white rounded-2xl border-2 border-[#14B8A6] border-solid shadow-lg mb-8 sm:mb-12 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms] overflow-hidden" style={{ boxSizing: 'border-box' }}>
          {/* Left Logo - Subtle background on mobile */}
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 md:w-[182px] pointer-events-none flex items-center justify-center overflow-hidden opacity-15 sm:opacity-30 md:opacity-100">
            <Image
              src="/leftside.png"
              alt="SpeculateX Logo"
              width={182}
              height={155}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>

          {/* Stats Content */}
          <div className="relative z-10 grid grid-cols-3 md:flex md:items-center md:justify-center gap-2 sm:gap-3 md:gap-12 lg:gap-20 xl:gap-32 px-3 sm:px-4 md:px-8 py-5 sm:py-6 md:py-0 min-h-[140px] md:min-h-[155px]">
            {/* Total Liquidity */}
            <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-4">
              <div className="font-inter text-gray-500 text-[9px] sm:text-[10px] md:text-[11px] text-center tracking-[0.55px] leading-[17.6px] uppercase">
                TOTAL LIQUIDITY
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="font-inter text-[#0a0e17] text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[32px] text-center tracking-[0] leading-tight font-bold">
                  ${liquidityDisplay}
                </div>
                <div className="font-inter text-[#0a0e17] text-sm sm:text-base md:text-lg lg:text-xl text-center tracking-[0] leading-tight font-bold">
                  USDC pooled
                </div>
              </div>
              <div className="font-inter text-[#475569] text-[9px] sm:text-[10px] md:text-xs text-center tracking-[0] leading-[19.2px]">
                Across {stats.total} markets
              </div>
            </div>

            {/* Active Traders */}
            <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-4">
              <div className="font-inter text-gray-500 text-[9px] sm:text-[10px] md:text-[11px] text-center tracking-[0.55px] leading-[17.6px] uppercase">
                ACTIVE TRADERS
              </div>
              <div className="font-inter text-[#0a0e17] text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[32px] text-center tracking-[0] leading-tight font-bold">
                {formatNumber(typeof activeTraders === 'number' ? activeTraders : Number(activeTraders) || 0)}
              </div>
              <div className="font-inter text-[#475569] text-[9px] sm:text-[10px] md:text-xs text-center tracking-[0] leading-[19.2px]">
                Updated every minute
              </div>
            </div>

            {/* Live Markets */}
            <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-4">
              <div className="font-inter text-gray-500 text-[9px] sm:text-[10px] md:text-[11px] text-center tracking-[0.55px] leading-[17.6px] uppercase">
                LIVE MARKETS
              </div>
              <div className="font-inter text-[#0a0e17] text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[32px] text-center tracking-[0] leading-tight font-bold">
                {formatNumber(stats.live)}
              </div>
              <div className="font-inter text-[#475569] text-[9px] sm:text-[10px] md:text-xs text-center tracking-[0] leading-[19.2px]">
                Resolved: {formatNumber(stats.resolved)} • Awaiting: {formatNumber(stats.expired)}
              </div>
            </div>
          </div>

          {/* Right Logo - Subtle background on mobile */}
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 md:w-[189px] pointer-events-none flex items-center justify-center overflow-hidden opacity-15 sm:opacity-30 md:opacity-100">
            <Image
              src="/rightside.png"
              alt="SpeculateX Logo"
              width={189}
              height={155}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col gap-6 mb-8">
          {/* Top Row: Categories and Status Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeCategory === category
                      ? "bg-[#14B8A6] text-white shadow-md shadow-[#14B8A6]/20 transform scale-105"
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex bg-white p-1 rounded-xl border border-gray-200 w-fit">
              {STATUS_FILTERS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveStatusTab(prev => (prev === tab ? null : tab))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                    activeStatusTab === tab
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Row: Search and Advanced Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#14B8A6] transition-colors" />
              <Input
                placeholder="Search markets..."
                className="pl-11 h-12 bg-white rounded-xl border-gray-200 shadow-sm focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowFilters(prev => !prev)}
                className={`h-12 px-5 rounded-xl border-gray-200 shadow-sm hover:bg-gray-50 hover:text-[#14B8A6] transition-all ${showFilters ? 'border-[#14B8A6] text-[#14B8A6] bg-[#14B8A6]/5' : ''}`}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl p-5 z-30"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Advanced Filters
                      </h3>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Status</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={showResolved}
                              onChange={(e) => setShowResolved(e.target.checked)}
                              className="rounded border-gray-300 text-[#14B8A6] focus:ring-[#14B8A6] w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-700">Show resolved</span>
                          </label>
                          <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={showExpired}
                              onChange={(e) => setShowExpired(e.target.checked)}
                              className="rounded border-gray-300 text-[#14B8A6] focus:ring-[#14B8A6] w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-700">Show awaiting resolution</span>
                          </label>
                        </div>
                      </div>

                      <div className="h-px bg-gray-100" />

                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Liquidity &gt;</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input
                            type="number"
                            value={minLiquidity}
                            onChange={(e) => setMinLiquidity(e.target.value)}
                            placeholder="500"
                            className="w-full pl-7 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent transition-shadow"
                          />
                        </div>
                      </div>

                      <div className="h-px bg-gray-100" />

                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Oracle</label>
                        <div className="space-y-1">
                          {[
                            { label: 'All Types', value: 'all' },
                            { label: 'Manual Only', value: 'manual' },
                            { label: 'Chainlink Only', value: 'chainlink' },
                          ].map(option => (
                            <label key={option.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                              <input
                                type="radio"
                                name="oracle-filter"
                                value={option.value}
                                checked={oracleFilter === option.value}
                                onChange={() => setOracleFilter(option.value as typeof oracleFilter)}
                                className="text-[#14B8A6] focus:ring-[#14B8A6] w-4 h-4"
                              />
                              <span className="text-sm font-medium text-gray-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                        <Button
                        onClick={() => {
                          setShowFilters(false);
                          setShowResolved(false);
                          setShowExpired(false);
                          setMinLiquidity('');
                          setOracleFilter('all');
                          setActiveStatusTab('Active');
                        }}
                        className="w-full bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">
            Showing <span className="text-gray-900 font-bold">{filteredMarkets.length}</span> markets
          </p>
        </div>

        {/* Market Cards Grid */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredMarkets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No markets found</h3>
              <p className="text-gray-500 mb-8 text-center max-w-md">
                We couldn&apos;t find any markets matching your criteria. Try adjusting your filters or search term.
              </p>
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setActiveCategory('All');
                }}
                className="px-8 h-12 bg-[#14B8A6] hover:bg-[#0d9488] text-white rounded-xl font-medium transition-colors shadow-lg shadow-[#14B8A6]/20"
              >
                Clear Filters
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredMarkets.map((market, index) => (
                  <motion.div
                    key={market.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    layout
                  >
                    <Link href={`/markets/${market.id}`} className="block h-full group">
                      <Card className="h-full border-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-2xl overflow-hidden bg-white hover:-translate-y-1">
                        <CardContent className="p-0 flex flex-col h-full">
                          {/* Card Header */}
                          <div className="p-6 pb-4">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white p-1">
                                <Image
                                  src={getMarketLogo(market.question)}
                                  alt={market.question}
                                  width={56}
                                  height={56}
                                  className="w-full h-full object-contain"
                                  unoptimized
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/logos/default.png';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {market.status === 'RESOLVED' && (
                                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">Resolved</Badge>
                                  )}
                                  {market.status === 'EXPIRED' && (
                                    <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider">Ended</Badge>
                                  )}
                                  {market.status === 'LIVE TRADING' && (
                                    <Badge className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 hover:bg-green-200 border-0">Live</Badge>
                                  )}
                                  {market.oracleType > 0 && (
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-blue-600 border-blue-100 bg-blue-50">
                                      {market.oracleType === 1 ? 'Chainlink' : 'Functions'}
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-[#14B8A6] transition-colors">
                                  {market.question}
                                </h3>
                              </div>
                            </div>

                            {/* Betting Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="group/yes relative overflow-hidden rounded-xl bg-[#10B981]/5 hover:bg-[#10B981]/10 border border-[#10B981]/20 transition-colors p-3 cursor-pointer">
                                <div className="flex flex-col items-center">
                                  <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider mb-1">Buy Yes</span>
                                  <span className="text-lg font-black text-[#065F46]">{formatPriceInCents(market.yesPrice)}</span>
                                </div>
                                <div className="absolute inset-0 opacity-0 group-hover/yes:opacity-100 flex items-center justify-center bg-[#10B981] transition-opacity duration-200">
                                  <span className="text-white font-bold text-sm">Trade YES</span>
                                </div>
                              </div>
                              <div className="group/no relative overflow-hidden rounded-xl bg-[#EF4444]/5 hover:bg-[#EF4444]/10 border border-[#EF4444]/20 transition-colors p-3 cursor-pointer">
                                <div className="flex flex-col items-center">
                                  <span className="text-xs font-bold text-[#EF4444] uppercase tracking-wider mb-1">Buy No</span>
                                  <span className="text-lg font-black text-[#7F1D1D]">{formatPriceInCents(market.noPrice)}</span>
                                </div>
                                <div className="absolute inset-0 opacity-0 group-hover/no:opacity-100 flex items-center justify-center bg-[#EF4444] transition-opacity duration-200">
                                  <span className="text-white font-bold text-sm">Trade NO</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Probability Bar */}
                          <div className="px-6 mb-4">
                            <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1.5">
                              <span className="text-[#10B981]">{market.yesPercent}% Yes</span>
                              <span className="text-[#EF4444]">{market.noPercent}% No</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                              <div 
                                className="h-full bg-[#10B981] transition-all duration-500 ease-out" 
                                style={{ width: `${market.yesPercent}%` }}
                              />
                              <div 
                                className="h-full bg-[#EF4444] transition-all duration-500 ease-out" 
                                style={{ width: `${market.noPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className="mt-auto border-t border-gray-50 bg-gray-50/30 p-4 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                              <div className="p-1 rounded-md bg-gray-200/50">
                                <Activity className="w-3.5 h-3.5" />
                              </div>
                              ${market.volume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Vol
                            </div>
                            
                            {market.expiryTimestamp > 0n && (
                              <MarketCountdown expiryTimestamp={market.expiryTimestamp} />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Improved Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Platform</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><Link href="/markets" className="hover:text-[#14B8A6] transition-colors">Markets</Link></li>
                <li><Link href="/create" className="hover:text-[#14B8A6] transition-colors">Create Market</Link></li>
                <li><Link href="/portfolio" className="hover:text-[#14B8A6] transition-colors">Portfolio</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Resources</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-[#14B8A6] transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-[#14B8A6] transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-[#14B8A6] transition-colors">API</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Community</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-[#14B8A6] transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-[#14B8A6] transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-[#14B8A6] transition-colors">Governance</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Legal</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-[#14B8A6] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#14B8A6] transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">© 2025 SpeculateX. All rights reserved.</p>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Systems Operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
