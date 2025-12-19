// @ts-nocheck
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
  const [loadingStats, setLoadingStats] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
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
      setLoadingStats(false);
      setLoadingFeaturedMarket(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadingStats(false);
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

  return (
    <div className="min-h-screen w-full bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden flex flex-col selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white font-sans">

      {/* Background Gradient with Parallax */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div
          className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-[#14B8A6] opacity-20 blur-[100px]"
        ></div>
      </div>

      {/* Landing Page Header */}
      <header className="relative z-20 w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <Link href="/" className="flex items-center group flex-shrink-0">
              <div className="relative w-[160px] sm:w-[200px] h-10 transition-transform duration-300 group-hover:scale-105">
                {/* Light mode logo */}
                <Image
                  src="/Whitelogo.png"
                  alt="SpeculateX Logo"
                  fill
                  sizes="(max-width: 640px) 160px, 200px"
                  priority
                  className="object-contain object-left dark:hidden"
                />
                {/* Dark mode logo */}
                <Image
                  src="/darklogo.png"
                  alt="SpeculateX Logo"
                  fill
                  sizes="(max-width: 640px) 160px, 200px"
                  priority
                  className="object-contain object-left hidden dark:block"
                />
              </div>
            </Link>
            <Link
              href="/markets"
              className="group relative inline-flex items-center justify-center rounded-full bg-[#14B8A6] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#14B8A6]/25 hover:bg-[#0D9488] hover:shadow-xl hover:shadow-[#14B8A6]/30 transition-all duration-300 active:scale-95"
            >
              <span className="mr-2">Launch App</span>
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* --- Left Column: Hero Text (Span 7 cols) --- */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6 lg:space-y-8">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Live on BNB Chain</span>
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.2 }}
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
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
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
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.4, duration: prefersReducedMotion ? 0 : 0.6 }}
              className="relative z-10"
            >
              {/* --- BENTO GRID START --- */}
              <div className="grid grid-cols-2 gap-4">

                {/* Liquidity - Large Vertical Card */}
                <div className="row-span-2">
                  {loadingStats ? (
                    <StatCardSkeleton className="h-full min-h-[200px]" />
                  ) : (
                    <StatCard
                      title="LIQUIDITY ACROSS MARKETS"
                      value={liquidityDisplay}
                      className="h-full min-h-[200px]"
                    />
                  )}
                </div>

                {/* Traders - Small Card */}
                <div>
                  {loadingStats ? (
                    <StatCardSkeleton />
                  ) : (
                    <StatCard
                      title="Traders"
                      value={formatNumber(typeof traders === 'number' ? traders : Number(traders) || 0)}
                    />
                  )}
                </div>

                {/* Active Markets - Small Card */}
                <div>
                  {loadingStats ? (
                    <StatCardSkeleton />
                  ) : (
                    <StatCard
                      title="ACTIVE MARKETS"
                      value={formatNumber(stats.live)}
                    />
                  )}
                </div>

                {/* Featured Market - Large Horizontal Card */}
                <div className="col-span-2 relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-purple-500 rounded-3xl opacity-10 blur group-hover:opacity-20 transition-opacity"></div>
                  <div className="relative bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-2xl border border-white/20 dark:border-gray-700/50 rounded-3xl p-6 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Featured Opportunity</span>
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                    </div>

                    {loadingFeaturedMarket ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-lg w-3/4"></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
                          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
                        </div>
                      </div>
                    ) : featuredMarket ? (
                      <Link href={`/markets/${featuredMarket.id}`} className="block">
                        <h3 className="font-bold text-gray-900 dark:text-white leading-tight mb-4 text-lg group-hover:text-[#14B8A6] transition-colors line-clamp-2">
                          {featuredMarket.question}
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100/50 dark:border-emerald-500/20 rounded-2xl p-3">
                            <span className="text-[9px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase block mb-1">Yes</span>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                              {(featuredMarket.priceYes * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="bg-rose-50/50 dark:bg-rose-500/10 border border-rose-100/50 dark:border-rose-500/20 rounded-2xl p-3">
                            <span className="text-[9px] font-bold text-rose-600/60 dark:text-rose-400/60 uppercase block mb-1">No</span>
                            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                              {(featuredMarket.priceNo * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center justify-center text-gray-400 text-sm italic py-8">No active markets</div>
                    )}
                  </div>
                </div>
              </div>
              {/* --- BENTO GRID END --- */}

              {/* Decorative blobs behind the grid */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-400/30 rounded-full blur-3xl -z-10"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-400/30 rounded-full blur-3xl -z-10"></div>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}

// --- Stat Card Skeleton for Loading State ---
function StatCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-2xl border border-white/20 dark:border-gray-700/50 rounded-3xl p-6 shadow-xl ring-1 ring-black/5 animate-pulse flex flex-col justify-center ${className}`}>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3"></div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
    </div>
  );
}

// --- Stat Card Component with Enhanced Depth ---
function StatCard({ title, value, className = "" }: { title: string, value: string, className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative group overflow-hidden bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-2xl border border-white/20 dark:border-gray-700/50 rounded-3xl p-6 transition-all shadow-xl ring-1 ring-black/5 flex flex-col justify-center ${className}`}
      role="article"
      aria-label={`${title}: ${value}`}
    >
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10">
        <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
          {title}
        </div>
        <div className="font-black text-3xl sm:text-4xl text-gray-900 dark:text-white tracking-tighter group-hover:text-[#14B8A6] transition-colors duration-300">
          {value}
        </div>
      </div>
    </motion.div>
  );
}