'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react';
import Header from '@/components/Header';
import { Badge, Button, Card, CardContent, Input } from '@/components/ui';
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
    return `${days}D ${hours}H`;
  } else if (hours > 0) {
    return `${hours}H ${minutes}M`;
  } else {
    return `${minutes}M`;
  }
};

// Helper function to format total duration (from creation to expiry)
const formatDuration = (expiryTimestamp: bigint): string => {
  if (expiryTimestamp === 0n) return 'N/A';
  
  // For now, we'll calculate from current time as we don't have creation timestamp
  // This will be approximate but better than random numbers
  const now = Math.floor(Date.now() / 1000);
  const expiry = Number(expiryTimestamp);
  const totalSeconds = expiry - now;
  
  if (totalSeconds <= 0) return 'Expired';
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  
  if (days > 0) {
    return `${days}D ${hours}H`;
  } else {
    return `${hours}H`;
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
        setTimeRemaining(`${days}D ${hours}H`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}H ${minutes}M`);
      } else {
        setTimeRemaining(`${minutes}M`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [expiryTimestamp]);
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Time Remaining</span>
      <span className={`text-sm sm:text-base font-bold ${
        timeRemaining === 'Expired' 
          ? 'text-red-600' 
          : 'text-gray-900'
      }`}>
        {timeRemaining || formatTimeRemaining(expiryTimestamp)}
      </span>
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
  const [activeStatusTab, setActiveStatusTab] = useState<StatusFilter>('Active');
  // Removed advanced filters since they are not used anymore
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

          let yesPriceNum = parseFloat(priceYes);
          let yesPriceClean = Number.isFinite(yesPriceNum) ? yesPriceNum : 0;
          let noPriceClean = Number.isFinite(yesPriceNum) ? Math.max(0, 1 - yesPriceNum) : 0;

          // Calculate percentages based on price to ensure consistency with displayed prices
          let yesPercent = Math.round(yesPriceClean * 100);
          let noPercent = 100 - yesPercent;

          // Override prices if market is resolved
          if (resolution.isResolved) {
            if (resolution.yesWins) {
              yesPriceClean = 1;
              noPriceClean = 0;
              yesPercent = 100;
              noPercent = 0;
            } else {
              yesPriceClean = 0;
              noPriceClean = 1;
              yesPercent = 0;
              noPercent = 100;
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
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-br from-[#14B8A6]/10 to-purple-400/10 dark:from-[#14B8A6]/5 dark:to-purple-400/5 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-[#14B8A6]/10 dark:from-blue-400/5 dark:to-[#14B8A6]/5 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
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

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        {/* Header Section - Figma Design */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6 translate-y-[-1rem] animate-fade-in opacity-0">
            <svg className="w-5 h-5 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="[font-family:'Geist',Helvetica] font-semibold text-[#14B8A6] text-sm tracking-[0.35px] leading-5">
              BROWSE MARKETS
            </div>
          </div>
          <h1 className="[font-family:'Geist',Helvetica] font-bold text-[#0f0a2e] dark:text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-[0] leading-tight sm:leading-[50px] md:leading-[60px] mb-6 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
            What&apos;s the Market Thinking?
          </h1>
          <p className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-base sm:text-lg tracking-[0] leading-6 sm:leading-7 mb-8 max-w-[668px] translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
            Trade what you believe in every market reflects real-time sentiment and liquidity.
          </p>
        </div>

        {/* Stats Banner - Figma Design with Logo Patterns */}
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-[#14B8A6] border-solid shadow-lg mb-8 sm:mb-12 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms] overflow-hidden" style={{ boxSizing: 'border-box' }}>
          {/* Left Logo */}
          <div className="absolute left-0 top-0 bottom-0 w-[80px] sm:w-[140px] md:w-[182px] pointer-events-none opacity-20 md:opacity-100">
            <Image
              src="/leftside.png"
              alt="SpeculateX Logo"
              fill
              className="object-cover object-left"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white dark:to-gray-900 md:hidden" />
          </div>

          {/* Stats Content */}
          <div className="relative z-10 grid grid-cols-3 md:flex md:items-center md:justify-center gap-0 sm:gap-3 md:gap-12 lg:gap-20 xl:gap-32 px-2 sm:px-4 md:px-8 py-6 sm:py-6 md:py-0 min-h-[120px] md:min-h-[155px] divide-x divide-gray-100 dark:divide-gray-800 md:divide-x-0">
            {/* Total Liquidity */}
            <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-4">
              <div className="font-inter text-gray-500 dark:text-gray-400 text-[9px] sm:text-[10px] md:text-[11px] text-center tracking-[0.55px] leading-[17.6px] uppercase font-bold relative z-20">
                TOTAL LIQUIDITY
              </div>
              <div className="flex flex-col items-center gap-0.5 relative z-20">
                <div className="font-inter text-[#0a0e17] dark:text-gray-100 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[32px] text-center tracking-[0] leading-tight font-black">
                  ${liquidityDisplay}
                </div>
                <div className="font-inter text-[#0a0e17] dark:text-gray-300 text-[10px] sm:text-sm md:text-lg lg:text-xl text-center tracking-[0] leading-tight font-bold text-gray-600 dark:text-gray-400">
                  USDC pooled
                </div>
              </div>
              <div className="font-inter text-[#475569] dark:text-gray-400 text-[9px] sm:text-[10px] md:text-xs text-center tracking-[0] leading-[19.2px] hidden sm:block relative z-20">
                Across {stats.total} markets
              </div>
            </div>

            {/* Active Traders */}
            <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-4">
              <div className="font-inter text-gray-500 dark:text-gray-400 text-[9px] sm:text-[10px] md:text-[11px] text-center tracking-[0.55px] leading-[17.6px] uppercase font-bold">
                ACTIVE TRADERS
              </div>
              <div className="font-inter text-[#0a0e17] dark:text-gray-100 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[32px] text-center tracking-[0] leading-tight font-black">
                {formatNumber(typeof activeTraders === 'number' ? activeTraders : Number(activeTraders) || 0)}
              </div>
              <div className="font-inter text-[#475569] dark:text-gray-400 text-[9px] sm:text-[10px] md:text-xs text-center tracking-[0] leading-[19.2px] hidden sm:block">
                Updated every minute
              </div>
            </div>

            {/* Total Markets */}
            <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 md:gap-4">
              <div className="font-inter text-gray-500 dark:text-gray-400 text-[9px] sm:text-[10px] md:text-[11px] text-center tracking-[0.55px] leading-[17.6px] uppercase font-bold relative z-20">
                MARKETS
              </div>
              <div className="font-inter text-[#0a0e17] dark:text-gray-100 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[32px] text-center tracking-[0] leading-tight font-black relative z-20">
                {formatNumber(stats.total)}
              </div>
              <div className="font-inter text-[#475569] dark:text-gray-400 text-[9px] sm:text-[10px] md:text-xs text-center tracking-[0] leading-[19.2px] hidden sm:block relative z-20">
                Live: {formatNumber(stats.live)} • Ended: {formatNumber(stats.resolved + stats.expired)}
              </div>
            </div>
          </div>

          {/* Right Logo */}
          <div className="absolute right-0 top-0 bottom-0 w-[80px] sm:w-[140px] md:w-[189px] pointer-events-none opacity-20 md:opacity-100">
            <Image
              src="/rightside.png"
              alt="SpeculateX Logo"
              fill
              className="object-cover object-right"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white dark:to-gray-900 md:hidden" />
          </div>
        </div>

        {/* Search and Filters - Figma Design */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveStatusTab(tab)}
                className={`relative px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  activeStatusTab === tab
                    ? 'bg-[#2DD4BF] text-white shadow'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b717f99]" />
              <Input
                placeholder="Search markets..."
                className="pl-12 h-12 bg-white dark:bg-gray-800 rounded-2xl border-[#e5e6ea80] dark:border-gray-700 shadow-[0px_1px_2px_#0000000d] dark:shadow-none [font-family:'Geist',Helvetica] text-sm focus:border-[#14B8A6] text-gray-900 dark:text-gray-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </motion.div>

        <div className="mb-6">
          <p className="[font-family:'Geist',Helvetica] text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium">Showing </span>
            <span className="font-semibold text-[#0f0a2e] dark:text-gray-200">{filteredMarkets.length}</span>
            <span className="font-medium"> markets</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((category, index) => (
            <Badge
              key={category}
              variant={activeCategory === category ? "default" : "secondary"}
              className={`h-[42px] px-6 rounded-full cursor-pointer transition-colors ${
                activeCategory === category
                  ? "bg-[#14B8A6] hover:bg-[#0D9488] text-white border-0"
                  : "bg-[#f0f0f280] hover:bg-[#e5e6ea80] text-[#0e092db2] border border-[#e5e6ea4c]"
              } [font-family:'Geist',Helvetica] font-medium text-sm`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Market Cards Grid */}
        <div id="markets">
          {loading ? (
            <div className="text-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block w-16 h-16 border-4 border-[#14B8A6] border-t-transparent rounded-full"
              />
              <p className="mt-6 text-lg font-semibold text-gray-600">Loading markets...</p>
            </div>
          ) : filteredMarkets.length === 0 ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-lg"
            >
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No markets found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search or filters</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSearchTerm('');
                  setActiveCategory('All');
                }}
                className="px-6 py-3 bg-[#14B8A6] text-white font-semibold rounded-lg hover:bg-[#0D9488] transition-colors"
              >
                Clear Filters
              </motion.button>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {filteredMarkets.map((market, index) => (
                  <motion.div
                    key={market.id}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <Link href={`/markets/${market.id}`}>
                      <div className="group relative bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.03)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:border-[#14B8A6]/20 dark:hover:border-[#14B8A6]/30 transition-all duration-300 h-full flex flex-col">
                        {/* Live Indicator */}
                        {market.status === 'LIVE TRADING' && (
                          <div className="absolute top-5 right-5 z-10">
                            <span className="flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                          </div>
                        )}

                        {/* Card Header */}
                        <div className="flex items-start gap-4 mb-4 pr-6">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-2 flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            <Image
                              src={getMarketLogo(market.question)}
                              alt={market.question}
                              width={48}
                              height={48}
                              className="w-full h-full object-contain"
                              unoptimized
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/logos/default.png';
                              }}
                            />
                          </div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-[#14B8A6] transition-colors">
                            {market.question}
                          </h3>
                        </div>

                        {/* Graph / Probability Bar */}
                        <div className="mb-5 space-y-2">
                          <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wide">
                            <span>Yes {market.yesPercent}%</span>
                            <span>No {market.noPercent}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                            <div 
                              style={{ width: `${market.yesPercent}%` }}
                              className="h-full bg-gradient-to-r from-[#14B8A6] to-[#0D9488] opacity-90"
                            />
                            <div 
                              style={{ width: `${market.noPercent}%` }}
                              className="h-full bg-gray-300/50"
                            />
                          </div>
                        </div>

                        {/* Price Buttons - Visual Only */}
                        <div className="grid grid-cols-2 gap-3 mb-5 mt-auto">
                          <div className="bg-[#F0FDFA] dark:bg-[#115e59]/20 border border-[#CCFBF1] dark:border-[#14b8a6]/20 rounded-xl p-3 text-center group-hover:border-[#14B8A6]/30 transition-colors">
                            <div className="text-xs font-bold text-[#0F766E] dark:text-[#2dd4bf] uppercase tracking-wider mb-0.5">Yes</div>
                            <div className="text-lg font-black text-[#14B8A6] dark:text-[#2dd4bf]">{formatPriceInCents(market.yesPrice)}</div>
                          </div>
                          <div className="bg-[#FEF2F2] dark:bg-[#7f1d1d]/20 border border-[#FEE2E2] dark:border-[#ef4444]/20 rounded-xl p-3 text-center group-hover:border-red-200 transition-colors">
                            <div className="text-xs font-bold text-[#991B1B] dark:text-[#f87171] uppercase tracking-wider mb-0.5">No</div>
                            <div className="text-lg font-black text-[#EF4444] dark:text-[#f87171]">{formatPriceInCents(market.noPrice)}</div>
                          </div>
                        </div>

                        {/* Footer Stats */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-xs font-medium text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>${formatNumber(market.volume)} Vol</span>
                          </div>
                          {market.expiryTimestamp > 0n && (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className={market.isResolved ? "text-purple-600 font-bold" : (Number(market.expiryTimestamp) < Date.now() / 1000 ? "text-orange-400" : "")}>
                                {market.isResolved ? "Resolved" : formatTimeRemaining(market.expiryTimestamp)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </main>
      {/* Footer */}
      <footer className="w-full bg-[#fffefe66] dark:bg-[#0f172a66] border-t border-border mt-12 sm:mt-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-12 lg:px-20 py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12 md:mb-16">
            <div className="flex flex-col gap-4 sm:gap-6">
              <h3 className="[font-family:'Geist',Helvetica] font-semibold text-[#0f0a2e] dark:text-white text-sm sm:text-base leading-6">
                Product
              </h3>
              <div className="flex flex-col gap-3 sm:gap-[18px]">
                <Link href="/markets" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Markets
                </Link>
                <Link href="/admin" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Create Market
                </Link>
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  API
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:gap-6">
              <h3 className="[font-family:'Geist',Helvetica] font-semibold text-[#0f0a2e] dark:text-white text-sm sm:text-base leading-6">
                Resources
              </h3>
              <div className="flex flex-col gap-3 sm:gap-[18px]">
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Documentation
                </a>
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  FAQ
                </a>
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Blog
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:gap-6">
              <h3 className="[font-family:'Geist',Helvetica] font-semibold text-[#0f0a2e] dark:text-white text-sm sm:text-base leading-6">
                Community
              </h3>
              <div className="flex flex-col gap-3 sm:gap-[18px]">
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Discord
                </a>
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Twitter
                </a>
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Governance
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:gap-6">
              <h3 className="[font-family:'Geist',Helvetica] font-semibold text-[#0f0a2e] dark:text-white text-sm sm:text-base leading-6">
                Legal
              </h3>
              <div className="flex flex-col gap-3 sm:gap-[18px]">
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Privacy
                </a>
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Terms
                </a>
                <a href="#" className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Security
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 pt-4 sm:pt-6 border-t border-[#e5e6ea80] dark:border-gray-800">
            <p className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 text-center sm:text-left">
              © 2025 SpeculateX. All rights reserved.
            </p>
            <p className="[font-family:'Geist',Helvetica] font-light text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-5 text-center sm:text-right">
              Built for the decentralized web
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
