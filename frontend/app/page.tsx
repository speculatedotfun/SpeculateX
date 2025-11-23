// @ts-nocheck
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { getMarketCount, getMarket, getMarketState, getSpotPriceYesE6, getSpotPriceNoE6, getMarketResolution } from '@/lib/hooks';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { formatPriceInCents, getAssetLogo } from '@/lib/marketUtils';

interface FeaturedMarket {
  id: number;
  question: string;
  priceYes: number;
  priceNo: number;
  logo: string;
  isActive: boolean;
}

export default function Home() {
  const [marketCount, setMarketCount] = useState<number>(0);
  const [stats, setStats] = useState({
    liquidity: 0,
    live: 0,
    resolved: 0,
    expired: 0,
  });
  const [featuredMarket, setFeaturedMarket] = useState<FeaturedMarket | null>(null);
  const [loadingFeaturedMarket, setLoadingFeaturedMarket] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const countBn = await getMarketCount();
      const count = Number(countBn);
      setMarketCount(count);

      if (count === 0) {
        setStats({ liquidity: 0, live: 0, resolved: 0, expired: 0 });
        setLoadingFeaturedMarket(false);
        return;
      }

      let liquidity = 0;
      let live = 0;
      let resolved = 0;
      let expired = 0;
      let foundFeatured = false;

      // Only fetch stats for first 20 markets to avoid rate limits on home load
      const limit = Math.min(count, 20);
      
      for (let i = 1; i <= limit; i++) {
        const marketId = BigInt(i);
        try {
          // Parallelize for speed
          const [market, state, resolution] = await Promise.all([
            getMarket(marketId),
            getMarketState(marketId),
            getMarketResolution(marketId).catch(() => null),
          ]);
          if (!market.exists) continue;

          liquidity += Number(formatUnits(state.vault, 6));

          const marketStatus = market.status === 0 ? 'active' : market.status === 1 ? 'resolved' : 'expired';
          if (market.status === 0) {
            live += 1;
          } else if (market.status === 1) {
            resolved += 1;
          } else {
            expired += 1;
          }

          // Find first active, non-resolved market for featured preview
          if (!foundFeatured && market.status === 0 && (!resolution || !resolution.isResolved)) {
            try {
              const [priceYesE6, priceNoE6] = await Promise.all([
                getSpotPriceYesE6(marketId),
                getSpotPriceNoE6(marketId),
              ]);

              const priceYes = Number(priceYesE6) / 1e6;
              const priceNo = Number(priceNoE6) / 1e6;

              setFeaturedMarket({
                id: i,
                question: market.question || 'Market',
                priceYes: Math.max(0, Math.min(1, priceYes)),
                priceNo: Math.max(0, Math.min(1, priceNo)),
                logo: getAssetLogo(market.question),
                isActive: true,
              });
              foundFeatured = true;
            } catch (error) {
              console.error(`Error fetching prices for market ${i}:`, error);
            }
          }
        } catch (error) {
          console.error(`Error loading market ${i}:`, error);
        }
      }

      setStats({ liquidity, live, resolved, expired });
      setLoadingFeaturedMarket(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadingFeaturedMarket(false);
    }
  };

  const { data: traders = 0 } = useQuery({
    queryKey: ['uniqueTraders-home'],
    staleTime: 30_000,
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
        return Number(data.globalState?.uniqueTraders ?? 0);
      } catch (error) {
        console.error('Error fetching trader count from subgraph:', error);
        return 0;
      }
    },
  });

  const formatCurrency = useCallback((value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }, []);

  const formatNumber = useCallback((value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  }, []);

  const liquidityDisplay = useMemo(() => formatCurrency(stats.liquidity), [stats.liquidity, formatCurrency]);

  // Truncate question for display
  const truncatedQuestion = featuredMarket 
    ? featuredMarket.question.length > 30 
      ? featuredMarket.question.substring(0, 30) + '...'
      : featuredMarket.question
    : '';

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden lg:overflow-hidden flex flex-col selection:bg-[#14B8A6]/20 dark:selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white">
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

      {/* Minimal Top Bar with Logo only */}
      <header className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center">
        <Link href="/" className="flex items-center group">
          <div className="relative w-[140px] sm:w-[160px] h-10 sm:h-12 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/logo.jpg"
              alt="SpeculateX Logo"
              fill
              priority
              className="object-contain object-left dark:[filter:invert(1)_hue-rotate(180deg)_brightness(1.1)]"
            />
          </div>
        </Link>
        {/* Optional: Add Launch App button in header for quick access on mobile */}
        <Link
          href="/markets"
          className="lg:hidden rounded-full bg-[#14B8A6] px-4 py-2 text-xs font-bold text-white shadow-lg"
        >
          Launch App
        </Link>
      </header>

      <main className="flex-1 flex flex-col justify-center relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-4 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-24 items-center h-full lg:max-h-[800px]">
          
          {/* Left Column: Hero Text */}
          <div className="text-center lg:text-left space-y-4 lg:space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Live on BNB Chain</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#0f0a2e] dark:text-white leading-[1.1] tracking-tight mb-4 lg:mb-6">
                Be the <br/>
                <span className="bg-gradient-to-r from-[#14B8A6] to-[#0D9488] bg-clip-text text-transparent">Market.</span>
              </h1>
              <p className="hidden sm:block text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Trade your convictions on crypto, politics, and sports. 
                Infinite liquidity powered by bonding curves.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-row items-center gap-3 justify-center lg:justify-start"
            >
              <Link
                href="/markets"
                className="group w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-[#0f0a2e] dark:bg-white text-white dark:text-[#0f0a2e] text-base sm:text-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-900 dark:hover:bg-gray-100 transition-all shadow-xl shadow-gray-900/20 dark:shadow-white/10"
              >
                Start Trading
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/docs"
                className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-base sm:text-lg font-bold flex items-center justify-center hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Read Docs
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="hidden sm:flex pt-4 flex-wrap justify-center lg:justify-start gap-x-8 gap-y-2 text-sm font-semibold text-gray-400 dark:text-gray-500"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Instant Settlement
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Non-Custodial
              </div>
            </motion.div>
          </div>

          {/* Right Column: Stats / Visuals */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/20 to-purple-500/20 rounded-[40px] blur-2xl transform rotate-6"></div>
            <div className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-[32px] p-4 sm:p-8 shadow-2xl grid grid-cols-2 gap-4">
              <StatCard  
                title="Total Liquidity" 
                value={liquidityDisplay} 
                icon="💧"
                delay={0.5}
              />
              <StatCard 
                title="Active Markets" 
                value={formatNumber(stats.live)} 
                icon="📊"
                delay={0.6}
              />
              <StatCard 
                title="Total Traders" 
                value={formatNumber(typeof traders === 'number' ? traders : Number(traders) || 0)} 
                icon="👥"
                delay={0.7}
              />
              <StatCard 
                title="Protocol Fees" 
                value="2%" 
                icon="💎"
                delay={0.8}
              />
              
              {/* Mini Market Preview with Real Data */}
              {loadingFeaturedMarket ? (
                <div className="col-span-2 mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ) : featuredMarket ? (
                <Link 
                  href={`/markets/${featuredMarket.id}`}
                  className="col-span-2 mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:border-[#14B8A6] dark:hover:border-[#14B8A6] hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {featuredMarket.logo !== '/logos/default.png' ? (
                          <Image
                            src={featuredMarket.logo}
                            alt=""
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-orange-600 font-bold text-sm">₿</span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex-1">{truncatedQuestion}</div>
                    </div>
                    {featuredMarket.isActive && (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full shrink-0 ml-2">
                        Live
                      </span>
                    )}
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-[#14B8A6] rounded-full transition-all duration-300 group-hover:bg-[#0D9488]"
                      style={{ width: `${(featuredMarket.priceYes * 100).toFixed(1)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-[#14B8A6] font-bold">YES {formatPriceInCents(featuredMarket.priceYes)}</span>
                    <span className="text-gray-400 font-bold">NO {formatPriceInCents(featuredMarket.priceNo)}</span>
                  </div>
                </Link>
              ) : (
                <div className="col-span-2 mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm text-center py-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No active markets yet</p>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, delay }: { title: string, value: string, icon: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/60 dark:border-gray-700/60 flex flex-col gap-2 group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-2xl sm:text-3xl bg-gray-50 dark:bg-gray-700/50 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">{icon}</span>
        {/* Sparkline placeholder */}
        <svg className="w-10 sm:w-14 h-5 sm:h-8 text-gray-300 dark:text-gray-600 group-hover:text-[#14B8A6] transition-colors duration-300" viewBox="0 0 50 25" fill="none" stroke="currentColor">
          <path d="M0 20 Q10 5 25 15 T50 10" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <div className="text-xl sm:text-3xl font-black text-[#0f0a2e] dark:text-white tracking-tight mb-0.5">{value}</div>
        <div className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{title}</div>
      </div>
    </motion.div>
  );
}
