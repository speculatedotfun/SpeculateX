'use client';

export const dynamic = 'force-dynamic';

// Import BigInt serializer first
import '@/lib/bigint-serializer';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { getMarketCount, getMarket, getMarketState, getSpotPriceYesE6, getMarketResolution } from '@/lib/hooks';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { getAssetLogo } from '@/lib/marketUtils';
import Header from '@/components/Header';
import { ArrowRight, ShieldCheck, TrendingUp, Activity, Users, Zap, Flame, Clock } from 'lucide-react';

export default function Home() {
  const [marketCount, setMarketCount] = useState<number>(0);
  const [stats, setStats] = useState({
    liquidity: 0,
    live: 0,
    resolved: 0,
    expired: 0,
  });
  const [featuredMarket, setFeaturedMarket] = useState<FeaturedMarketData | null>(null);
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
      logo: "/logos/BTC_ethereum.png",
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

      const limit = Math.min(Number(count), 20);

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
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full pt-24 min-h-screen">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center min-h-[calc(100vh-200px)]">

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
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                  </div>
                </Link>

                {/* Optional secondary CTA or info */}
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 backdrop-blur-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Audited & Secure</span>
                </div>
              </motion.div>

              {/* Stats - moved below hero text for better landing flow */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="pt-8 border-t border-gray-200 dark:border-white/10 max-w-2xl"
              >
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Total Volume</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                      <Counter value={liquidityDisplay} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Live Markets</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                      <Counter value={stats.live.toString()} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Total Traders</div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                      <Counter value={formatNumber(typeof traders === 'number' ? traders : Number(traders) || 0)} />
                    </div>
                  </div>
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
                >
                  {/* Featured Market - Spanning Top */}
                  <LandingMarketCard
                    market={featuredMarket!}
                    loading={loadingFeaturedMarket}
                  />

                </motion.div>
              </motion.div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer / Powered By */}
      <footer className="w-full py-8 text-center relative z-10 pointer-events-none">
        <div className="inline-flex items-center gap-6 px-6 py-3 rounded-full bg-white/30 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/5 pointer-events-auto hover:bg-white/40 transition-colors">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Powered By</span>
          <div className="flex items-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
            <div className="h-5 w-5 bg-yellow-500 rounded-full" title="BNB Chain" />
            <div className="h-5 w-5 bg-blue-500 rounded-full" title="Chainlink" />
            <div className="h-5 w-5 bg-purple-500 rounded-full" title="The Graph" />
          </div>
        </div>
      </footer>
    </div>
  );
}