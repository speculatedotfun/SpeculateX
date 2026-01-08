'use client';

export const dynamic = 'force-dynamic';

// Import BigInt serializer first
import '@/lib/bigint-serializer';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import { getMarketCount } from '@/lib/hooks';
import { useMarketsListOptimized } from '@/lib/hooks/useMarketsListOptimized'; // NEW
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { getAssetLogo } from '@/lib/marketUtils';
import { ThemeToggle } from '@/components/ThemeToggle';
import NetworkSelector from '@/components/NetworkSelector';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowRight, ShieldCheck, TrendingUp, Activity, Users, Zap, Flame, Clock, User, LogOut, Copy, Check, X } from 'lucide-react';
import { Counter } from '@/components/Counter';
import { LandingMarketCard } from '@/components/LandingMarketCard';
import { useNicknames, getDisplayName } from '@/lib/hooks/useNicknames';
import { useDisconnect } from 'wagmi';
import { NicknameManager } from '@/components/NicknameManager';
import { hapticFeedback } from '@/lib/haptics';

interface FeaturedMarketData {
  id: number;
  question: string;
  priceYes: number;
  priceNo: number;
  logo: string;
  isActive: boolean;
  isDemo?: boolean;
}

// --- Sub-component for account button with nickname support ---
function HeaderAccountButton({ account, openAccountModal }: { account: any, openAccountModal: () => void }) {
  const { nicknames } = useNicknames();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayName = account.address ? getDisplayName(account.address, nicknames) : account.displayName;
  const hasNickname = account.address && nicknames[account.address.toLowerCase()];

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const handleCopyAddress = () => {
    if (account.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="group relative rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 p-[1px]">
          <button
            onClick={() => setIsModalOpen(true)}
            type="button"
            className="relative flex items-center gap-3 rounded-full bg-white dark:bg-gray-900 px-1 py-1 pr-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            {/* Avatar */}
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#14B8A6] to-cyan-500 flex items-center justify-center text-white shadow-md">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {/* Online Dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="flex flex-col items-start leading-none gap-0.5">
              <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500 uppercase tracking-wider">
                {account.displayBalance ? account.displayBalance : 'Connected'}
              </span>
              <span className={`text-xs font-bold text-gray-900 dark:text-gray-100 ${hasNickname ? '' : 'font-mono'}`}>
                {displayName}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Account Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
            onClick={() => setIsModalOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {/* Account Info */}
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Display Name
                    </div>
                    <div className={`text-base font-bold text-gray-900 dark:text-white ${hasNickname ? '' : 'font-mono'}`}>
                      {displayName}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Address
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg flex-1">
                        {account.address}
                      </div>
                      <button
                        onClick={handleCopyAddress}
                        className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Balance */}
                  {account.displayBalance && (
                    <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800">
                      <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Balance
                      </div>
                      <div className="text-lg font-black text-teal-600 dark:text-teal-400">
                        {account.displayBalance}
                      </div>
                    </div>
                  )}

                  {/* Nickname Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Set Nickname
                    </h3>
                    <NicknameManager onClose={() => setIsModalOpen(false)} />
                  </div>

                  {/* Disconnect Button */}
                  <button
                    onClick={() => {
                      disconnect();
                      setIsModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold transition-colors border border-red-200 dark:border-red-800"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect Wallet
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openConnectModal,
        openChainModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={() => {
                      hapticFeedback('medium');
                      openConnectModal();
                    }}
                    type="button"
                    className="group relative inline-flex items-center justify-center rounded-full bg-[#14B8A6] dark:bg-[#14B8A6] px-3 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#14B8A6]/25 dark:shadow-[#14B8A6]/30 hover:bg-[#0D9488] dark:hover:bg-[#0D9488] hover:shadow-xl hover:shadow-[#14B8A6]/30 dark:hover:shadow-[#14B8A6]/40 transition-all duration-300 active:scale-95"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25 transition-all active:scale-95"
                  >
                    Wrong Network
                  </button>
                );
              }

              return <HeaderAccountButton account={account} openAccountModal={openAccountModal} />;
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

export default function Home() {
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

  // Data Fetching
  const { data: markets = [], isPending: loadingMarkets } = useMarketsListOptimized();

  // Derived Stats & Featured Market
  const { stats, featuredMarket, loadingStats, loadingFeaturedMarket } = useMemo(() => {
    if (loadingMarkets) {
      return {
        stats: { liquidity: 0, live: 0, resolved: 0, expired: 0 },
        featuredMarket: null,
        loadingStats: true,
        loadingFeaturedMarket: true
      };
    }

    let liquidity = 0;
    let live = 0;
    let resolved = 0;
    let expired = 0;
    let featured: FeaturedMarketData | null = null;

    for (const market of markets) {
      // Accumulate Vol/Liq
      // Note: market.volume is derived from vault/liquidity in the hook
      liquidity += Number(market.totalPairsUSDC || 0n) / 1e6; // Assuming totalPairsUSDC is bigint from hook

      // Status Counts
      if (market.status === 'LIVE TRADING') live++;
      else if (market.status === 'RESOLVED') resolved++;
      else if (market.status === 'EXPIRED') expired++;

      // Select Featured: First LIVE market we find (Newest)
      if (!featured && market.status === 'LIVE TRADING') {
        const logo = getAssetLogo(market.question);
        featured = {
          id: market.id,
          question: market.question,
          priceYes: market.yesPrice,
          priceNo: market.noPrice,
          logo: logo,
          isActive: true
        };
      }
    }

    // Fallback if no live market found
    if (!featured) {
      featured = {
        id: 0,
        question: "Will Bitcoin hit $100k by 2025?",
        priceYes: 0.65,
        priceNo: 0.35,
        logo: "/logos/BTC_ethereum.png",
        isActive: true,
        isDemo: true
      };
    }

    return {
      stats: { liquidity, live, resolved, expired },
      featuredMarket: featured,
      loadingStats: false,
      loadingFeaturedMarket: false
    };
  }, [markets, loadingMarkets]);

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

      {/* Floating Header */}
      <header className="sticky top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="pointer-events-auto group relative z-20 flex items-center flex-shrink-0">
              <div className="relative w-[140px] sm:w-[200px] h-10 sm:h-10 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/Whitelogo.png"
                  alt="SpeculateX Logo"
                  fill
                  sizes="(max-width: 640px) 140px, 200px"
                  priority
                  className="object-contain object-left dark:hidden"
                />
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

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
              <div className="hidden sm:block">
                <NetworkSelector />
              </div>
              <ThemeToggle />
              <CustomConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start pt-8 lg:justify-center lg:pt-0 relative z-10 w-full min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">

            {/* Left Column: Hero Text */}
            <div className="lg:col-span-7 space-y-2 sm:space-y-4 relative z-20">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-teal-500/20 shadow-[0_0_30px_-10px_rgba(20,184,166,0.2)] cursor-default select-none group hover:border-teal-500/40 transition-colors"
                role="status"
              >
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.6)]"></span>
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Live on BNB Chain</span>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              >
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-[#0f0a2e] dark:text-white leading-[0.9] tracking-tighter mb-4 sm:mb-6 relative">
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
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed font-medium">
                  The <span className="text-gray-900 dark:text-white font-bold decoration-teal-500/50 underline decoration-4 underline-offset-4 decoration-skip-ink-none">next-gen</span> prediction market protocol. Infinite liquidity, instant settlement, and fully non-custodial.
                </p>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                className="flex flex-wrap items-center gap-4"
              >
                <Link
                  href="/markets"
                  className="group relative px-10 py-5 rounded-full bg-[#0f0a2e] dark:bg-white text-white dark:text-[#0f0a2e] shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto overflow-hidden ring-4 ring-transparent hover:ring-teal-500/30"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="relative flex items-center justify-center gap-3 font-bold text-lg tracking-tight">
                    Start Trading
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                  </div>
                </Link>

                {/* Optional secondary CTA or info */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 backdrop-blur-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Audited & Secure</span>
                </div>
              </motion.div>

              {/* Stats - moved below hero text for better landing flow */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="pt-6 border-t border-gray-200 dark:border-white/10 max-w-2xl"
              >
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Total Volume</div>
                    <div className="text-xl font-black text-gray-900 dark:text-white font-mono">
                      <Counter value={liquidityDisplay} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Live Markets</div>
                    <div className="text-xl font-black text-gray-900 dark:text-white font-mono">
                      <Counter value={stats.live.toString()} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Total Traders</div>
                    <div className="text-xl font-black text-gray-900 dark:text-white font-mono">
                      <Counter value={formatNumber(typeof traders === 'number' ? traders : Number(traders) || 0)} />
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* Right Column: Visuals with Advanced Parallax & Tilt */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end h-[500px] items-center perspective-1000">
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
      {/* Footer / Powered By */}
      <footer className="w-full py-8 text-center relative z-10 pointer-events-none mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-8">

          {/* Socials & Links - Pointer Events Auto to make them clickable */}
          <div className="flex flex-wrap items-center justify-center gap-6 pointer-events-auto">
            <a href="https://x.com/SpeculateX" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-colors backdrop-blur-md text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:scale-110 duration-200">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            <a href="https://t.me/SpeculateX" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/40 dark:bg-white/5 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors backdrop-blur-md text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:scale-110 duration-200">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            </a>
            <div className="w-px h-6 bg-gray-300 dark:bg-white/10 mx-2"></div>
            <Link href="/docs" className="text-sm font-semibold text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 transition-colors">Documentation</Link>
            <Link href="/terms" className="text-sm font-semibold text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 transition-colors">Terms</Link>
            <Link href="/risk-disclosure" className="text-sm font-semibold text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 transition-colors">Risks</Link>
          </div>

          {/* Powered By Badge */}
          <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-white/30 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/5 pointer-events-auto hover:bg-white/40 transition-colors">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Powered By</span>
            <div className="flex items-center gap-3 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
              <div className="h-4 w-4 bg-yellow-500 rounded-full" title="BNB Chain" />
              <div className="h-4 w-4 bg-blue-500 rounded-full" title="Chainlink" />
              <div className="h-4 w-4 bg-purple-500 rounded-full" title="The Graph" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}