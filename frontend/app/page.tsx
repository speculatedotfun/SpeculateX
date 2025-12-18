// @ts-nocheck
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { getMarketCount, getMarket, getMarketState, getSpotPriceYesE6, getMarketResolution } from '@/lib/hooks';
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
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Keep original data loading logic ---
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

      const limit = Math.min(count, 20);
      
      for (let i = 1; i <= limit; i++) {
        const marketId = BigInt(i);
        try {
          const [market, state, resolution] = await Promise.all([
            getMarket(marketId),
            getMarketState(marketId),
            getMarketResolution(marketId).catch(() => null),
          ]);
          if (!market.exists) continue;

          liquidity += Number(formatUnits(state.vault, 6));

          if (market.status === 0) {
            live += 1;
          } else if (market.status === 1) {
            resolved += 1;
          } else {
            expired += 1;
          }

          if (!foundFeatured && market.status === 0 && (!resolution || !resolution.isResolved)) {
            try {
              const priceYesE6 = await getSpotPriceYesE6(marketId);
              const priceYes = Number(priceYesE6) / 1e6;
              const priceNo = Math.max(0, Math.min(1, 1 - priceYes));

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

  const truncatedQuestion = featuredMarket 
    ? featuredMarket.question.length > 50 
      ? featuredMarket.question.substring(0, 50) + '...'
      : featuredMarket.question
    : '';

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden lg:overflow-hidden flex flex-col selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white font-sans">
      
      {/* Background Gradient with Parallax */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div
          className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-[#14B8A6] opacity-20 blur-[100px] transition-transform duration-300"
          style={{ transform: `translateY(${scrollY * 0.15}px) scale(${1 + scrollY * 0.0002})` }}
        ></div>
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between">
            <Link href="/" className="flex items-center group flex-shrink-0">
              <div className="relative w-[140px] sm:w-[200px] h-10 sm:h-10 transition-transform duration-300 group-hover:scale-105">
                {/* Light mode logo */}
                <Image
                  src="/Whitelogo.png"
                  alt="SpeculateX Logo"
                  fill
                  sizes="(max-width: 640px) 140px, 200px"
                  priority
                  className="object-contain object-left dark:hidden"
                />
                {/* Dark mode logo */}
                <Image
                  src="/darklogo.png"
                  alt="SpeculateX Logo"
                  fill
                  sizes="(max-width: 640px) 140px, 200px"
                  priority
                  className="object-contain object-left hidden dark:block"
                />
              </div>
            </Link>
            <Link
              href="/markets"
              className="lg:hidden rounded-full bg-[#14B8A6] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#14B8A6]/20"
            >
              Launch App
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center h-full">
          
          {/* --- Left Column: Hero Text (Span 7 cols) --- */}
          <div
            className="lg:col-span-7 text-center lg:text-left space-y-6 lg:space-y-8"
            style={{ transform: `translateY(${scrollY * -0.1}px)` }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Live on BNB Chain</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-[#0f0a2e] dark:text-white leading-[1.0] tracking-tighter mb-6">
                Predict the <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] via-teal-400 to-emerald-400 animate-gradient-x">
                  Future.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Trade on the outcome of real-world events. 
                <span className="block mt-1 text-gray-500 dark:text-gray-500 text-base">Infinite liquidity. Instant settlement. Non-custodial.</span>
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2"
            >
              <Link
                href="/markets"
                className="group relative w-full sm:w-auto overflow-hidden rounded-full bg-[#0f0a2e] dark:bg-white px-8 py-4 text-white dark:text-[#0f0a2e] shadow-xl shadow-[#0f0a2e]/20 transition-all hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                <div className="relative flex items-center justify-center gap-2 font-bold text-lg">
                  Start Trading
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </Link>
              <Link
                href="/docs"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-lg font-bold flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all backdrop-blur-sm"
              >
                Read Docs
              </Link>
            </motion.div>

          </div>

          {/* --- Right Column: Stats & Visuals (Span 5 cols) --- */}
          <div
            className="lg:col-span-5 relative"
            style={{ transform: `translateY(${scrollY * 0.05}px)` }}
          >
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="relative z-10"
            >
              {/* --- UI Upgrade 2: Dashboard Style Container --- */}
              <div className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-2xl border border-white/20 dark:border-gray-700/50 rounded-[32px] p-6 shadow-2xl shadow-purple-500/5 dark:shadow-black/20 ring-1 ring-black/5">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <StatCard 
                    title="Liquidity" 
                    value={liquidityDisplay} 
                    color="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                  />
                  <StatCard 
                    title="Traders" 
                    value={formatNumber(typeof traders === 'number' ? traders : Number(traders) || 0)} 
                    color="bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                  />
                  <StatCard 
                    title="Active Markets" 
                    value={formatNumber(stats.live)} 
                    color="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                  />
                  <StatCard 
                    title="Fees APY" 
                    value="2.0%" 
                    color="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
                  />
                </div>
                
                {/* Featured Market - Trading Ticket Style */}
                <div className="relative">
                   <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-purple-500 rounded-2xl opacity-20 blur"></div>
                   <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Featured Market</span>
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          <span className="text-[10px] font-bold text-gray-500">Ending Soon</span>
                        </div>
                      </div>

                      {loadingFeaturedMarket ? (
                        <div className="space-y-3 animate-pulse">
                          <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg w-full"></div>
                          <div className="flex gap-2">
                             <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/2"></div>
                             <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/2"></div>
                          </div>
                        </div>
                      ) : featuredMarket ? (
                        <Link href={`/markets/${featuredMarket.id}`} className="block group">
                          <div className="flex items-start gap-3 mb-5">
                            <div className="relative w-10 h-10 rounded-full bg-gray-50 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                              {featuredMarket.logo !== '/logos/default.png' ? (
                                <Image
                                  src={featuredMarket.logo}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-lg">📈</span>
                              )}
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white leading-tight group-hover:text-[#14B8A6] transition-colors">
                              {truncatedQuestion}
                            </h3>
                          </div>

                          {/* NEW: Probability Visualization */}
                          <div className="space-y-4">
                            
                            {/* Visual Probability Bar */}
                            <div className="h-4 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden flex relative">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000 ease-out"
                                style={{ width: `${featuredMarket.priceYes * 100}%` }}
                              />
                              {/* Percentage Indicator on Bar */}
                              <div className="absolute inset-0 flex justify-between px-2 items-center text-[9px] font-black uppercase tracking-wider text-black/40 dark:text-white/40 mix-blend-overlay">
                                <span>Yes</span>
                                <span>No</span>
                              </div>
                            </div>

                            {/* Price Cards */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center transition-all group-hover:border-emerald-300 dark:group-hover:border-emerald-500/50">
                                <span className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase">Yes Probability</span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                  {(featuredMarket.priceYes * 100).toFixed(0)}%
                                </span>
                                <span className="text-[10px] text-emerald-600/40 dark:text-emerald-400/40 font-mono mt-0.5">
                                  {formatPriceInCents(featuredMarket.priceYes)}
                                </span>
                              </div>

                              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl p-3 flex flex-col items-center justify-center transition-all group-hover:border-rose-300 dark:group-hover:border-rose-500/50">
                                <span className="text-[10px] font-bold text-rose-600/60 dark:text-rose-400/60 uppercase">No Probability</span>
                                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                                  {(featuredMarket.priceNo * 100).toFixed(0)}%
                                </span>
                                <span className="text-[10px] text-rose-600/40 dark:text-rose-400/40 font-mono mt-0.5">
                                  {formatPriceInCents(featuredMarket.priceNo)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ) : (
                         <div className="text-center py-6 text-gray-400 text-sm">No markets active</div>
                      )}
                   </div>
                </div>

              </div>
              
              {/* Decorative blobs behind the card with parallax */}
              <div
                className="absolute -top-10 -right-10 w-40 h-40 bg-purple-400/30 rounded-full blur-3xl -z-10 animate-pulse transition-transform duration-300"
                style={{ transform: `translate(${scrollY * 0.08}px, ${scrollY * 0.12}px) scale(${1 + scrollY * 0.0003})` }}
              ></div>
              <div
                className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-400/30 rounded-full blur-3xl -z-10 animate-pulse transition-transform duration-300"
                style={{
                  animationDelay: '1s',
                  transform: `translate(${scrollY * -0.08}px, ${scrollY * -0.1}px) scale(${1 + scrollY * 0.0003})`
                }}
              ></div>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}

// --- Stat Card Component with Enhanced Depth ---
function StatCard({ title, value, color }: { title: string, value: string, color: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative group overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50/80 dark:from-gray-800/60 dark:via-gray-800/40 dark:to-gray-800/50 rounded-2xl p-4 border border-gray-200/60 dark:border-gray-700/50 hover:border-[#14B8A6]/30 transition-all shadow-sm hover:shadow-[0_8px_30px_-5px_rgba(20,184,166,0.15)] backdrop-blur-sm ring-1 ring-gray-900/5 dark:ring-white/5"
      role="article"
      aria-label={`${title}: ${value}`}
    >
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10">
        <div className="font-black text-lg sm:text-xl text-gray-900 dark:text-white tracking-tight mb-0.5 group-hover:text-[#14B8A6] transition-colors duration-300">
          {value}
        </div>
        <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {title}
        </div>
      </div>
    </motion.div>
  );
}