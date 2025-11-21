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
    <div className="h-screen w-full bg-[#FAF9FF] relative overflow-hidden flex flex-col selection:bg-[#14B8A6]/20 selection:text-[#0f0a2e]">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-br from-[#14B8A6]/10 to-[#0D9488]/10 rounded-full blur-3xl"
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
          className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-purple-100 to-blue-100 rounded-full blur-3xl"
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
              className="object-contain object-left"
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

      <main className="flex-1 flex flex-col justify-center relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center h-full max-h-[800px]">
          
          {/* Left Column: Hero Text */}
          <div className="text-center lg:text-left space-y-8 mt-16 lg:mt-0">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Live on BNB Chain</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#0f0a2e] leading-[1.1] tracking-tight mb-6">
                Be the <br/>
                <span className="bg-gradient-to-r from-[#14B8A6] to-[#0D9488] bg-clip-text text-transparent">Market.</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Trade your convictions on crypto, politics, and sports. 
                Infinite liquidity powered by bonding curves.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
            >
              <Link
                href="/markets"
                className="group w-full sm:w-auto h-14 px-8 rounded-full bg-[#0f0a2e] text-white text-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-900 transition-all shadow-xl shadow-gray-900/20"
              >
                Start Trading
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href="https://docs.speculatex.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto h-14 px-8 rounded-full bg-white border-2 border-gray-200 text-gray-700 text-lg font-bold flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                Read Docs
              </a>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-4 flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-2 text-sm font-semibold text-gray-400"
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
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/20 to-purple-500/20 rounded-[40px] blur-2xl transform rotate-6"></div>
            <div className="relative bg-white/60 backdrop-blur-xl border border-white/50 rounded-[32px] p-8 shadow-2xl grid grid-cols-2 gap-4">
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
                <div className="col-span-2 mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : featuredMarket ? (
                <Link 
                  href={`/markets/${featuredMarket.id}`}
                  className="col-span-2 mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#14B8A6] hover:shadow-md transition-all group cursor-pointer"
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
                      <div className="text-sm font-bold text-gray-900 truncate flex-1">{truncatedQuestion}</div>
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
                <div className="col-span-2 mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center py-6">
                  <p className="text-sm text-gray-500">No active markets yet</p>
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
      className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 flex flex-col gap-1"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-2xl">{icon}</span>
        {/* Sparkline placeholder */}
        <svg className="w-12 h-6 text-gray-200" viewBox="0 0 50 25" fill="none" stroke="currentColor">
          <path d="M0 20 Q10 5 25 15 T50 10" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</div>
    </motion.div>
  );
}
