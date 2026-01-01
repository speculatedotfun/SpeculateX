'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import { getMarketCount, getMarket, getMarketState, getSpotPriceYesE6, getMarketResolution } from '@/lib/hooks';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { getAssetLogo } from '@/lib/marketUtils';
import Header from '@/components/Header';

interface FeaturedMarket {
  id: number;
  question: string;
  priceYes: number;
  priceNo: number;
  logo: string;
  isActive: boolean;
  isDemo?: boolean;
}

// Simple Counter Component
function Counter({ value }: { value: string | number }) {
  // Simple check if it's a formatted string like $1.2M or just a number
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      key={value}
      transition={{ duration: 0.5 }}
    >
      {value}
    </motion.span>
  );
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

  // Parallax Logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX / width) - 0.5;
    const y = (clientY / height) - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const springConfig = { damping: 25, stiffness: 120 };
  const moveX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-20, 20]), springConfig);
  const moveY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-20, 20]), springConfig);
  const moveXReverse = useSpring(useTransform(mouseX, [-0.5, 0.5], [15, -15]), springConfig);
  const moveYReverse = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);

  // Card Tilt Logic (More pronounced)
  const tiltX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
  const tiltY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);


  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const setDemoMarket = useCallback(() => {
    setFeaturedMarket({
      id: 0,
      question: "Will Bitcoin hit $100k by 2025?",
      priceYes: 0.65,
      priceNo: 0.35,
      logo: "/bitcoin.png",
      isActive: true,
      isDemo: true
    });
    setLoadingFeaturedMarket(false);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const countBn = await getMarketCount();
      const count = Number(countBn);
      setMarketCount(count);

      if (count === 0) {
        setStats({ liquidity: 0, live: 0, resolved: 0, expired: 0 });
        setLoadingStats(false);
        setDemoMarket();
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
          if (market.exists) {
            liquidity += Number(formatUnits(state.vault, 6));

            const now = Math.floor(Date.now() / 1000);
            const startTime = resolution?.startTime || 0n;
            // Check if market is actually live (started)
            const isStarted = startTime === 0n || Number(startTime) <= now;

            // Contract enum: MarketStatus { Active=0, Resolved=1, Cancelled=2 }
            if (market.status === 0 && isStarted) {
              live += 1;
            } else if (market.status === 1) {
              resolved += 1;
            } else if (market.status === 2) {
              // Cancelled
              expired += 1;
            } else {
              // Scheduled (not started yet)
              expired += 1;
            }

            if (!foundFeatured && market.status === 0 && isStarted && (!resolution || !resolution.isResolved)) {
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
          }
        } catch (error) {
          console.error(`Error loading market ${i}:`, error);
        }
      }

      setStats({ liquidity, live, resolved, expired });
      setLoadingStats(false);

      if (!foundFeatured) {
        setDemoMarket();
      } else {
        setLoadingFeaturedMarket(false);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setLoadingStats(false);
      setDemoMarket();
    }
  }, [setDemoMarket]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { data: traders = 0 } = useQuery({
    queryKey: ['uniqueTraders-home'],
    staleTime: 30_000,
    queryFn: async () => {
      try {
        const data = await fetchSubgraph<{
          globalState: { uniqueTraders: number } | null;
        }>(
          `query UniqueTraders($id: ID!) { globalState(id: $id) { uniqueTraders } }`,
          { id: 'global' },
        );
        return Number(data.globalState?.uniqueTraders ?? 0);
      } catch (error) {
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
    <div
      className="min-h-screen w-full relative flex flex-col font-sans overflow-x-hidden selection:bg-teal-500/30"
      onMouseMove={handleMouseMove}
    >

      {/* Enhanced Background: Mesh + Grid + Parallax Blobs + Spotlight */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[bottom_1px_center]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FAF9FF] dark:to-[#0f1219]"></div>

        {/* Animated Orbs */}
        <motion.div style={{ x: moveXReverse, y: moveYReverse }} className="absolute -left-[10%] -top-[10%] -z-10 h-[600px] w-[600px] rounded-full bg-teal-400/20 blur-[120px] animate-blob" />
        <motion.div style={{ x: moveX, y: moveY }} className="absolute top-[20%] -right-[10%] -z-10 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[100px] animate-blob animation-delay-2000" />
        <motion.div style={{ x: moveXReverse, y: moveY }} className="absolute -bottom-[10%] left-[20%] -z-10 h-[600px] w-[600px] rounded-full bg-blue-500/20 blur-[130px] animate-blob animation-delay-4000" />
      </div>

      <Header />

      {/* Main Content */}
      <main className="flex-1 flex items-center relative z-10 w-full pb-12 lg:pb-0 pt-8 lg:pt-0">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

            {/* Left Column: Hero Text */}
            <div className="lg:col-span-7 space-y-10 relative z-20">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-teal-500/20 shadow-[0_0_30px_-10px_rgba(20,184,166,0.2)] cursor-default select-none group hover:border-teal-500/40 transition-colors"
                role="status"
              >
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.6)]"></span>
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Live on BNB Chain</span>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              >
                <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-black text-[#0f0a2e] dark:text-white leading-[0.9] tracking-tighter mb-8 relative">
                  Predict the <br />
                  <span className="relative inline-block">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-cyan-500 to-purple-500 animate-gradient-x relative z-10">
                      Future.
                    </span>
                    {/* Glow behind text */}
                    <span className="absolute inset-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-purple-500 blur-3xl opacity-30 -z-10 animate-pulse">
                      Future.
                    </span>
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed font-medium">
                  The <span className="text-gray-900 dark:text-white font-bold decoration-teal-500/50 underline decoration-4 underline-offset-4 decoration-skip-ink-none">next-gen</span> prediction market protocol. Infinite liquidity, instant settlement, and fully non-custodial.
                </p>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                className="flex flex-wrap items-center gap-6"
              >
                <Link
                  href="/markets"
                  className="group relative px-12 py-6 rounded-full bg-[#0f0a2e] dark:bg-white text-white dark:text-[#0f0a2e] shadow-2xl shadow-teal-500/20 hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto overflow-hidden ring-4 ring-transparent hover:ring-teal-500/20"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="relative flex items-center justify-center gap-3 font-bold text-xl tracking-tight">
                    Start Trading
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </Link>

                <div className="hidden sm:flex items-center gap-3 text-sm font-bold text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md px-4 py-3 rounded-full border border-gray-200 dark:border-gray-700/50">
                  <div className="flex -space-x-3">
                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0f172a] bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center text-xs shadow-sm">🦄</div>
                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0f172a] bg-gradient-to-br from-blue-300 to-indigo-400 flex items-center justify-center text-xs shadow-sm">🦍</div>
                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0f172a] bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300 font-black tracking-tighter shadow-sm">+2k</div>
                  </div>
                  <span>Active Traders</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="pt-12 opacity-60 hover:opacity-100 transition-opacity duration-500"
              >
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 grayscale hover:grayscale-0 transition-all duration-500">
                  <span className="font-bold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#F3BA2F] shadow-[0_0_8px_#F3BA2F]"></div>
                    BNB Chain
                  </span>
                  <span className="font-bold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#375BD2] shadow-[0_0_8px_#375BD2]"></div>
                    Chainlink
                  </span>
                  <span className="font-bold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#6F4CFF] shadow-[0_0_8px_#6F4CFF]"></div>
                    The Graph
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Visuals with Advanced Parallax & Tilt */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end h-[600px] items-center perspective-1000">
              <motion.div
                style={{
                  x: moveX,
                  y: moveY,
                  rotateX: tiltX,
                  rotateY: tiltY
                }}
                initial={prefersReducedMotion ? false : { opacity: 0, x: 100, rotateY: 30 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ delay: 0.4, duration: 1, type: "spring", bounce: 0.4 }}
                className="w-full max-w-lg relative z-10"
              >
                {/* Floating Elements */}
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="grid grid-cols-2 gap-6"
                >
                  {/* Featured Market - Spanning Top */}
                  <div className="col-span-2">
                    <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl rounded-[32px] p-8 relative group overflow-hidden transition-all duration-500 shadow-2xl border border-white/20 dark:border-white/5 hover:border-teal-500/30">
                      {/* Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity blur-2xl duration-700" />

                      <div className="flex items-center justify-between mb-8 relative z-10">
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.5)]"></span>
                          {featuredMarket?.isDemo ? "Demo Market" : "Trending Now"}
                        </span>
                        <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center gap-1.5 backdrop-blur-md">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                          </span>
                          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Live</span>
                        </div>
                      </div>

                      {loadingFeaturedMarket ? (
                        <div className="space-y-4 animate-pulse">
                          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                          </div>
                        </div>
                      ) : featuredMarket ? (
                        <Link href={featuredMarket.isDemo ? "/markets" : `/markets/${featuredMarket.id}`} className="block relative z-10">
                          <h3 className="font-black text-2xl lg:text-3xl text-gray-900 dark:text-white leading-[1.1] mb-8 line-clamp-3 group-hover:text-teal-500 transition-colors duration-300">
                            {featuredMarket.question}
                          </h3>

                          <div className="relative pt-6 border-t border-gray-100 dark:border-white/5">
                            <div className="absolute -top-3 left-0 right-0 flex justify-center">
                              <span className="bg-white dark:bg-[#0f1219] px-3 py-0.5 rounded-full text-[10px] font-bold text-gray-400 border border-gray-100 dark:border-gray-800 uppercase tracking-widest shadow-sm">Current Odds</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-4 text-center group/yes hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors relative overflow-hidden">
                                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/yes:opacity-100 transition-opacity" />
                                <span className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase block mb-1 group-hover/yes:scale-110 transition-transform">Yes</span>
                                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 text-shadow-sm tracking-tighter">
                                  {(featuredMarket.priceYes * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-4 text-center group/no hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors relative overflow-hidden">
                                <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover/no:opacity-100 transition-opacity" />
                                <span className="text-[10px] font-bold text-rose-600/60 dark:text-rose-400/60 uppercase block mb-1 group-hover/no:scale-110 transition-transform">No</span>
                                <span className="text-4xl font-black text-rose-600 dark:text-rose-400 text-shadow-sm tracking-tighter">
                                  {(featuredMarket.priceNo * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="py-8 text-center text-gray-400 italic">No markets active</div>
                      )}
                    </div>
                  </div>

                  {/* Left Stat: Liquidity */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-[28px] p-6 flex flex-col justify-center text-center hover:scale-105 hover:-translate-y-2 transition-all duration-300 shadow-xl border border-white/20 dark:border-white/5 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-teal-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-hover:text-teal-500 transition-colors">Total Liquidity</span>
                    {loadingStats ? (
                      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse" />
                    ) : (
                      <span className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                        <Counter value={liquidityDisplay} />
                      </span>
                    )}
                  </motion.div>

                  {/* Right Stat: Traders */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-[28px] p-6 flex flex-col justify-center text-center hover:scale-105 hover:-translate-y-2 transition-all duration-300 shadow-xl border border-white/20 dark:border-white/5 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-hover:text-purple-500 transition-colors">Active Traders</span>
                    {loadingStats ? (
                      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse" />
                    ) : (
                      <span className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                        <Counter value={formatNumber(typeof traders === 'number' ? traders : Number(traders) || 0)} />
                      </span>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}