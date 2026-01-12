'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';

import { Wallet, TrendingUp, History, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, AlertCircle, Trophy, Check, X, RefreshCw, Search, PieChart, Sparkles, ArrowRight, User, Users, Copy, ExternalLink, Share2, PiggyBank, AlertTriangle, Info } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

import Header from '@/components/Header';
import { ReferralCopyButton } from '@/components/ReferralCopyButton';
import { UsernameInput } from '@/components/UsernameInput';
import { Button } from '@/components/ui';
import MintUsdcForm from '@/components/MintUsdcForm';
import { useUserPortfolio, type PortfolioPosition, type PortfolioTrade } from '@/lib/hooks/useUserPortfolio';
import { useNicknames, getDisplayName } from '@/lib/hooks/useNicknames';
import { EmptyState } from '@/components/ui/EmptyState';
import { coreAbi, positionTokenAbi } from '@/lib/abis';
import { addresses } from '@/lib/contracts';
import { useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { getMarketResolution } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/market/Sparkline';
import { NicknameManager } from '@/components/NicknameManager';
import Image from 'next/image';
import { useMarketsListOptimized } from '@/lib/hooks/useMarketsListOptimized';

// Helper: Get market logo based on question
const getMarketLogo = (question?: string | null): string => {
  const normalized = typeof question === 'string' ? question : question != null ? String(question) : '';
  const q = normalized.toLowerCase();
  if (q.includes('btc') || q.includes('bitcoin')) return '/logos/BTC_ethereum.png';
  if (q.includes('eth') || q.includes('ethereum')) return '/logos/ETH_ethereum.png';
  if (q.includes('sol') || q.includes('solana')) return '/logos/SOL_solana.png';
  if (q.includes('bnb') || q.includes('binance')) return '/logos/BNB_bsc.png';
  return '/logos/default.png';
};


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
};

type PortfolioTab = 'positions' | 'history' | 'claims' | 'faucet';

export default function PortfolioPage() {
  const { isConnected, address, chain } = useAccount();
  const { nicknames, fetchUsernamesBulk } = useNicknames();
  const { data, isLoading, refetch, isRefetching } = useUserPortfolio();
  const [activeTab, setActiveTab] = useState<PortfolioTab | 'referrals'>('positions');
  const [referralData, setReferralData] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  // Fetch referrals when tab is active
  useEffect(() => {
    if (activeTab === 'referrals' && address) {
      setLoadingReferrals(true);
      fetch(`/api/referrals?referrer=${address}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setReferralData(data);
            // Fetch usernames in bulk
            const uniqueUsers = Array.from(new Set(data.map((r: any) => r.user.toLowerCase())));
            fetchUsernamesBulk(uniqueUsers);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingReferrals(false));
    }
  }, [activeTab, address, fetchUsernamesBulk]);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const positions = data?.positions || [];
  const trades = data?.trades || [];
  const redemptions = data?.redemptions || [];

  const activeValue = positions
    .filter(p => p.status === 'Active')
    .reduce((acc, pos) => acc + pos.value, 0);

  const activePositionsCount = positions.filter(p => p.status === 'Active').length;
  const resolvedPositionsCount = positions.filter(p => p.status === 'Resolved').length;
  const totalClaimed = redemptions.reduce((acc, r) => acc + r.amount, 0);

  const redeemedMarketIds = new Set(redemptions.map(r => r.marketId));

  const claimablePositions = positions.filter(p => {
    const isResolved = p.status === 'Resolved';
    const hasWon = p.won === true;
    const hasBalance = p.balance > 0.000001;
    const notRedeemed = !redeemedMarketIds.has(p.marketId);

    return isResolved && hasWon && hasBalance && notRedeemed;
  });

  const claimableValue = claimablePositions.reduce((acc, p) => acc + (p.value || 0), 0);
  const totalNetWorth = activeValue + claimableValue + totalClaimed;
  const openExposure = activeValue;

  // --- PnL (realized) + Best Market (unrealized) ---
  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff24h = nowSec - 24 * 60 * 60;
  const cutoff7d = nowSec - 7 * 24 * 60 * 60;

  const { realized24h, basis24h, realized7d, basis7d, avgCostByKey } = useMemo(() => {
    type PosState = { tokens: number; costSum: number }; // costSum in USD
    const state = new Map<string, PosState>();

    let realized24hAcc = 0;
    let basis24hAcc = 0;
    let realized7dAcc = 0;
    let basis7dAcc = 0;

    const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);

    for (const t of sorted) {
      const side = (t.side || '').toUpperCase();
      if (side !== 'YES' && side !== 'NO') continue;

      const action = (t.action || '').toLowerCase();
      const qty = Number(t.tokenAmount || 0);
      const price = Number(t.price || 0); // USD per token
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) continue;

      const key = `${t.marketId}-${side}`;
      const st = state.get(key) ?? { tokens: 0, costSum: 0 };

      if (action === 'buy') {
        // avg cost basis (USD)
        st.costSum += qty * price;
        st.tokens += qty;
        state.set(key, st);
        continue;
      }

      if (action === 'sell') {
        if (st.tokens <= 0) continue;
        const sellQty = Math.min(qty, st.tokens);
        const avgCost = st.tokens > 0 ? st.costSum / st.tokens : 0;

        const pnl = (price - avgCost) * sellQty;
        const basis = avgCost * sellQty;

        if (t.timestamp >= cutoff24h) {
          realized24hAcc += pnl;
          basis24hAcc += basis;
        }
        if (t.timestamp >= cutoff7d) {
          realized7dAcc += pnl;
          basis7dAcc += basis;
        }

        st.tokens -= sellQty;
        st.costSum -= avgCost * sellQty;
        if (st.tokens <= 0) {
          st.tokens = 0;
          st.costSum = 0;
        }
        state.set(key, st);
      }
    }

    const avgCostByKeyLocal = new Map<string, number>();
    for (const [k, st] of state.entries()) {
      avgCostByKeyLocal.set(k, st.tokens > 0 ? st.costSum / st.tokens : 0);
    }

    return {
      realized24h: realized24hAcc,
      basis24h: basis24hAcc,
      realized7d: realized7dAcc,
      basis7d: basis7dAcc,
      avgCostByKey: avgCostByKeyLocal,
    };
  }, [trades, cutoff24h, cutoff7d]);

  const pnl24h = realized24h;
  const pnlPercent24h = basis24h > 0 ? (realized24h / basis24h) * 100 : 0;
  const pnl7d = realized7d;
  const pnlPercent7d = basis7d > 0 ? (realized7d / basis7d) * 100 : 0;

  const bestMarket = useMemo(() => {
    const actives = positions.filter(p => p.status === 'Active');
    if (actives.length === 0) return null;

    let best: { marketId: number; question: string; pnl: number; pnlPct: number } | null = null;

    for (const p of actives) {
      const key = `${p.marketId}-${p.side}`;
      const avgCost = avgCostByKey.get(key) ?? 0;
      const qty = Number(p.balance || 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      const invested = avgCost * qty;
      const pnl = (p.currentPrice - avgCost) * qty;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

      if (!best || pnlPct > best.pnlPct) {
        best = { marketId: p.marketId, question: p.question, pnl, pnlPct };
      }
    }

    return best;
  }, [positions, avgCostByKey]);

  const lostPositions = positions.filter(p =>
    p.status === 'Resolved' && !p.won
  );

  const claimedPositions: PortfolioPosition[] = redemptions.map(r => ({
    marketId: r.marketId,
    question: r.question,
    side: r.yesWins ? 'YES' : 'NO',
    balance: 0,
    currentPrice: 1,
    value: r.amount,
    status: 'Resolved',
    won: true,
    marketResolved: true,
    yesWins: r.yesWins ?? undefined
  }));

  // Chart Data
  const allocationData = [
    { name: 'Active', value: positions.filter(p => p.status === 'Active').reduce((acc, p) => acc + (p.value || 0), 0), color: '#3B82F6' },
    { name: 'Winnings', value: claimablePositions.reduce((acc, p) => acc + (p.value || 0), 0), color: '#10B981' },
    { name: 'Claimed', value: totalClaimed || 0, color: '#F59E0B' },
  ].filter(d => d.value > 0.01); // Filter out dust/zero values

  if (!isConnected) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col font-sans">
        {/* Dynamic Background */}
        <div className="fixed inset-0 pointer-events-none -z-10 bg-gray-50 dark:bg-[#0B1121]">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] invert dark:invert-0" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#14B8A6]/5 rounded-full blur-[120px] mix-blend-screen" />
        </div>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-[#14B8A6]/20 blur-3xl rounded-full group-hover:bg-[#14B8A6]/30 transition-colors" />
            <div className={`w-32 h-32 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-[40px] shadow-2xl flex items-center justify-center relative border border-white/20 dark:border-white/10 ${prefersReducedMotion ? '' : 'group-hover:-translate-y-2 transition-transform duration-500'}`}>
              <Wallet className="w-16 h-16 text-[#14B8A6]" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-500 mb-6 tracking-tighter">Your Vault</h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-lg leading-relaxed font-light">
            Access your positions, track seamless performance, and manage your prediction empire.
          </p>
          <div className="flex items-center gap-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-6 py-3 rounded-2xl text-sm font-bold border border-blue-500/20 backdrop-blur-sm">
            <ArrowUpRight className="w-4 h-4" />
            Connect wallet in top right to enter
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative font-sans selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white">

      {/* Background Gradient - Match Markets */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#FAF9FF] dark:bg-[#0f1219]">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[bottom_1px_center]"></div>
        <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-teal-400/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <Header />

      <main className="flex-1 relative z-10 mx-auto max-w-[1440px] w-full px-6 py-6">

        {/* Dashboard Header - Match Markets */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Portfolio
          </h1>
        </div>

        {/* Top Cards - Professional Design */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Main Portfolio Card - Premium Design */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            {/* Hero Section */}
            <div className="px-6 py-5 relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl" />

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left: Net Worth */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Net Worth</span>
                  </div>
                  <div className="text-4xl font-black tabular-nums text-gray-900 dark:text-white tracking-tight">
                    {isLoading ? '$0.00' : formatCurrency(totalNetWorth)}
                  </div>
                </div>

                {/* Right: Quick Stats Panel */}
                <div className="bg-gray-50 dark:bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 min-w-[240px]">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">24h PnL</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(pnl24h)}</span>
                        <span className={cn(
                          "text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full",
                          pnlPercent24h >= 0
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                        )}>{pnlPercent24h >= 0 ? '+' : ''}{pnlPercent24h.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">7d PnL</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(pnl7d)}</span>
                        <span className={cn(
                          "text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full",
                          pnlPercent7d >= 0
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                        )}>{pnlPercent7d >= 0 ? '+' : ''}{pnlPercent7d.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-gray-700" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Best Market</span>
                      {bestMarket ? (
                        <Link
                          href={`/markets/${bestMarket.marketId}`}
                          className="text-sm font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 transition-colors"
                          title={bestMarket.question}
                        >
                          #{bestMarket.marketId}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-gray-400">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Open Exposure</span>
                      <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(openExposure)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Stats Grid */}
            <div className="bg-white dark:bg-gray-900 border-x border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Active Value</span>
                  </div>
                  <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(activeValue)}</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Realized Gains</span>
                  </div>
                  <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">+{formatCurrency(totalClaimed)}</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Positions</span>
                  </div>
                  <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{positions.length}</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Win Rate</span>
                  </div>
                  <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                    {resolvedPositionsCount > 0 ? Math.round((claimablePositions.length + claimedPositions.length) / resolvedPositionsCount * 100) : 0}%
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Allocation Card - Professional Design */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Portfolio Allocation</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Asset distribution overview</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(totalNetWorth)}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Total Value</div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-start gap-6">
                {/* Donut Chart */}
                <div className="relative w-[120px] h-[120px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <defs>
                        <linearGradient id="activeGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                        <linearGradient id="pendingGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#6366F1" />
                          <stop offset="100%" stopColor="#818CF8" />
                        </linearGradient>
                        <linearGradient id="unusedGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#D1D5DB" />
                          <stop offset="100%" stopColor="#E5E7EB" />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={
                          allocationData.length > 0 && totalNetWorth > 0
                            ? allocationData
                            : [{ name: 'Available', value: 100, color: '#E5E7EB' }]
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={56}
                        paddingAngle={allocationData.length > 1 ? 3 : 0}
                        dataKey="value"
                        stroke="none"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {allocationData.length > 0 && totalNetWorth > 0
                          ? allocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} className="drop-shadow-sm" />
                          ))
                          : <Cell fill="url(#unusedGrad)" />}
                      </Pie>
                    </RechartsPie>
                  </ResponsiveContainer>

                  {/* Center Stats */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
                      {allocationData.length > 0 && totalNetWorth > 0
                        ? `${Math.round((activeValue / totalNetWorth) * 100)}%`
                        : '0%'}
                    </span>
                    <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">
                      Invested
                    </span>
                  </div>
                </div>

                {/* Legend & Breakdown */}
                <div className="flex-1 space-y-3">
                  {allocationData.length > 0 && totalNetWorth > 0 ? (
                    <>
                      {allocationData.map((d, idx) => {
                        const pct = Math.round((d.value / totalNetWorth) * 100);
                        return (
                          <div key={d.name} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full shadow-sm"
                                  style={{ backgroundColor: d.color }}
                                />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{d.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                                  {formatCurrency(d.value)}
                                </span>
                                <span className="text-[10px] font-semibold tabular-nums text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                  {pct}%
                                </span>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: d.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <div className="group">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active Markets</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">$0.00</span>
                            <span className="text-[10px] font-semibold tabular-nums text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">0%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full w-0 bg-emerald-500 rounded-full" />
                        </div>
                      </div>
                      <div className="group">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 shadow-sm" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Available Balance</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">{formatCurrency(totalNetWorth || 0)}</span>
                            <span className="text-[10px] font-semibold tabular-nums text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">100%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full bg-gray-300 dark:bg-gray-600 rounded-full"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Tabs & Content */}
        <div className="min-h-[600px]">
          {/* Tabs Row (match Markets underline tabs) + Controls */}
          <div className="flex items-center justify-between gap-4 mb-6">
            {/* Left: Underline Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {([
                { id: 'positions', label: 'Positions', count: positions.length },
                { id: 'claims', label: 'Claims', count: claimablePositions.length },
                { id: 'history', label: 'History', count: trades.length },
                { id: 'referrals', label: 'Referrals', count: referralData.length },
                { id: 'faucet', label: 'Faucet', count: 0 },
              ] as const)
                .filter(tab => {
                  if (tab.id === 'faucet' && chain?.id === 56) return false;
                  return true;
                })
                .map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as PortfolioTab)}
                      className={cn(
                        "relative px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                        isActive
                          ? "text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white"
                          : "text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"
                      )}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={cn(
                          "ml-1.5 text-xs tabular-nums",
                          isActive ? "text-slate-700 dark:text-gray-200" : "text-slate-400 dark:text-gray-500"
                        )}>
                          ({tab.count})
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>

            {/* Right: Sort / Filter Pills */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <select
                  aria-label="Sort"
                  className="h-9 pl-3 pr-8 rounded-full bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition-colors appearance-none cursor-pointer"
                  defaultValue="recent"
                >
                  <option value="recent">Most Recent</option>
                  <option value="value">Highest Value</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
              </div>
              <button
                type="button"
                className="h-9 px-4 rounded-full bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition-colors flex items-center gap-2"
              >
                <span className="text-gray-400">≡</span>
                <span>Filter</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {activeTab === 'positions' && (
                <motion.div
                  key="positions"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {isLoading ? (
                    <LoadingState prefersReducedMotion={prefersReducedMotion} />
                  ) : positions.length === 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Empty Vault Message */}
                      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your Vault is Empty</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
                          You have no active positions. The markets await your predictions.
                        </p>
                        <div className="flex items-center gap-3">
                          <Link href="/markets">
                            <button className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20">
                              Explore Markets
                            </button>
                          </Link>
                          <button className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-semibold text-sm flex items-center gap-2 hover:border-gray-300 transition-all">
                            <Wallet className="w-4 h-4" />
                            Deposit
                          </button>
                        </div>
                        <Link href="#" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-4">
                          Learn how it works →
                        </Link>
                      </div>

                      {/* Right: Suggested Markets */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Suggested Markets</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {/* Suggested Markets from Hook */}
                          <SuggestedMarketsList />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Active Section */}
                      {positions.filter(p => p.status === 'Active').length > 0 && (
                        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                          {/* Section Header */}
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Active Positions</span>
                            <span className="text-[10px] text-gray-400">({positions.filter(p => p.status === 'Active').length})</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50/50 dark:bg-gray-800/10">
                                <tr>
                                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Market</th>
                                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Price</th>
                                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Balance</th>
                                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Value</th>
                                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">P&L</th>
                                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {positions.filter(p => p.status === 'Active').map((position) => (
                                  <PositionRow
                                    key={`${position.marketId}-${position.side}`}
                                    position={position}
                                    trades={trades}
                                    onClaimSuccess={() => refetch()}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Resolved Section */}
                      {positions.filter(p => p.status === 'Resolved').length > 0 && (
                        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Resolved</span>
                            <span className="text-[10px] text-gray-400">({positions.filter(p => p.status === 'Resolved').length})</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50/50 dark:bg-gray-800/10">
                                <tr>
                                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Market</th>
                                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Final Price</th>
                                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Balance</th>
                                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Value</th>
                                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">P&L</th>
                                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {positions.filter(p => p.status === 'Resolved').map((position) => (
                                  <PositionRow
                                    key={`${position.marketId}-${position.side}`}
                                    position={position}
                                    trades={trades}
                                    onClaimSuccess={() => refetch()}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'claims' && (
                <motion.div
                  key="claims"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-12"
                >
                  {isLoading ? (
                    <LoadingState prefersReducedMotion={prefersReducedMotion} />
                  ) : (
                    <>
                      {/* Claimable */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                          Unclaimed Winnings
                        </h3>
                        {claimablePositions.length === 0 ? (
                          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
                            <Trophy className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-base font-medium text-gray-500 dark:text-gray-400">All winnings have been claimed.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {claimablePositions.map((position) => (
                              <PositionCard
                                key={`claim-${position.marketId}-${position.side}`}
                                position={position}
                                trades={trades}
                                onClaimSuccess={() => refetch()}
                                isRedeemed={false}
                                prefersReducedMotion={prefersReducedMotion}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* History of Claims */}
                      {claimedPositions.length > 0 && (
                        <div className="border-t border-gray-200/50 dark:border-white/5 pt-8">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Redeemed History</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60 hover:opacity-100 transition-opacity">
                            {claimedPositions.map((position) => (
                              <PositionCard
                                key={`claimed-${position.marketId}-${position.side}`}
                                position={position}
                                trades={trades}
                                onClaimSuccess={() => { }}
                                isRedeemed={true}
                                prefersReducedMotion={prefersReducedMotion}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {isLoading ? (
                    <LoadingState prefersReducedMotion={prefersReducedMotion} />
                  ) : trades.length === 0 ? (
                    <EmptyState
                      title="No history"
                      description="Your trading journey begins with a single step."
                      actionLink="/markets"
                      actionText="Start Trading"
                    />
                  ) : (
                    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                            <tr>
                              <th className="px-4 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                              <th className="px-4 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Market</th>
                              <th className="px-4 py-3 text-right text-[9px] font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                              <th className="px-4 py-3 text-right text-[9px] font-bold text-gray-400 uppercase tracking-widest">Price</th>
                              <th className="px-4 py-3 text-right text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                              <th className="px-4 py-3 text-right text-[9px] font-bold text-gray-400 uppercase tracking-widest">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {trades.map((trade) => (
                              <tr key={trade.id} className="group hover:bg-white dark:hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3">
                                  <span className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide",
                                    trade.action === 'buy'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                  )}>
                                    {trade.action === 'buy' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {trade.action} {trade.side}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <Link href={`/markets/${trade.marketId}`} className="font-bold text-gray-900 dark:text-white hover:text-[#14B8A6] transition-colors line-clamp-1 max-w-[300px] text-sm">
                                    {trade.question}
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums text-sm">{formatNumber(trade.tokenAmount)}</td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums text-sm">{formatCurrency(trade.price)}</td>
                                <td className="px-4 py-3 text-right font-black tabular-nums text-sm">{formatCurrency(trade.usdcAmount)}</td>
                                <td className="px-4 py-3 text-right text-xs text-gray-400 font-mono">
                                  {new Date(trade.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'faucet' && (
                <motion.div
                  key="faucet"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center py-12"
                >
                  <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Wallet className="w-8 h-8" />
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-center text-gray-900 dark:text-white mb-2">Need Test Funds?</h3>
                    <p className="text-sm text-gray-500 text-center mb-8">Mint USDC to start trading on the testnet.</p>
                    <MintUsdcForm />
                  </div>
                </motion.div>
              )}

              {/* Referrals Tab */}
              {activeTab === 'referrals' && (
                <motion.div
                  key="referrals"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Hero Card - Referral Link */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#14B8A6]/20 via-[#14B8A6]/5 to-transparent border border-[#14B8A6]/20 backdrop-blur-xl">
                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#14B8A6]/30 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 p-6 md:p-8">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        {/* Left: Title & Description */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center shadow-lg shadow-[#14B8A6]/30">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-gray-900 dark:text-white">Referral Program</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Earn points for every trade your friends make</p>
                            </div>
                          </div>
                        </div>

                        {/* Right: Copy Button */}
                        <ReferralCopyButton />
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Referrals</div>
                          <div className="text-2xl font-black text-gray-900 dark:text-white">{referralData.length}</div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Volume</div>
                          <div className="text-2xl font-black text-[#14B8A6]">
                            ${referralData.reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Referral Points</div>
                          <div className="text-2xl font-black text-emerald-500">
                            {Math.floor(referralData.reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0)).toLocaleString()} PTS
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Points Ratio</div>
                          <div className="text-2xl font-black text-purple-500">1:1</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Referrals List */}
                  <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-[#14B8A6]" />
                        Referral Activity
                      </h4>
                      <span className="text-xs text-gray-400">{referralData.length} trades</span>
                    </div>

                    {/* List */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                      {loadingReferrals ? (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                          Loading referrals...
                        </div>
                      ) : referralData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#14B8A6]/20 to-purple-500/20 flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-[#14B8A6]" />
                          </div>
                          <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No referrals yet</h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                            Share your referral link with friends and start earning rewards when they trade!
                          </p>
                        </div>
                      ) : (
                        referralData.map((row: any, i: number) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              {/* Avatar */}
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14B8A6] to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                {row.user?.slice(2, 4)?.toUpperCase()}
                              </div>
                              {/* Details */}
                              <div>
                                <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                                  {row.user?.slice(0, 6)}...{row.user?.slice(-4)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(row.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>

                            {/* Amount & Link */}
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-bold text-gray-900 dark:text-white tabular-nums">
                                  ${Number(row.amount).toLocaleString('en-US')}
                                </div>
                                <div className="text-xs text-emerald-500 font-medium">
                                  +{Math.floor(Number(row.amount)).toLocaleString()} Points
                                </div>
                              </div>
                              <a
                                href={`https://testnet.bscscan.com/tx/${row.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-gray-400 hover:text-[#14B8A6] hover:bg-[#14B8A6]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isNicknameModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsNicknameModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set Your Nickname</h2>
                <button
                  onClick={() => setIsNicknameModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <NicknameManager onClose={() => setIsNicknameModalOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Position Row Component (Table Style) ---
// --- Position Row Component (Table Style) ---
function PositionRow({ position, trades = [], onClaimSuccess, isRedeemed = false }: { position: PortfolioPosition, trades?: PortfolioTrade[], onClaimSuccess: () => void, isRedeemed?: boolean }) {
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSelling, setIsSelling] = useState(false);

  // Resolution data is now pre-fetched by the portfolio hook
  const actualIsResolved = position.marketResolved || position.status === 'Resolved';
  const actualYesWins = position.yesWins;
  const actualIsWinner = actualIsResolved && (
    (actualYesWins === true && position.side === 'YES') ||
    (actualYesWins === false && position.side === 'NO')
  );

  const isWinner = actualIsWinner !== undefined ? actualIsWinner : (position.won ?? false);
  const canRedeem = actualIsResolved && isWinner && position.balance > 0.000001 && !isRedeemed;
  const isLost = actualIsResolved && !isWinner;
  const isClaimed = isRedeemed || (position.status === 'Resolved' && isWinner && position.balance <= 0.000001);
  const showClaimed = isClaimed && isWinner;
  const showLost = position.status === 'Resolved' && !isWinner;

  // Calculate average purchase price
  const positionTrades = trades.filter(t =>
    t.marketId === position.marketId &&
    t.side === position.side &&
    t.action === 'buy'
  );

  let avgPurchasePrice = 0;
  let totalInvested = 0;
  if (positionTrades.length > 0) {
    let totalTokens = 0;
    let weightedPriceSum = 0;
    positionTrades.forEach(trade => {
      totalTokens += trade.tokenAmount;
      weightedPriceSum += trade.tokenAmount * trade.price;
      totalInvested += trade.usdcAmount;
    });
    if (totalTokens > 0) {
      avgPurchasePrice = weightedPriceSum / totalTokens;
    }
  }

  const profitLoss = position.value - totalInvested;
  const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const isProfit = profitLoss >= 0;

  const handleClaim = async () => {
    try {
      setIsClaiming(true);
      const hash = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'redeem',
        args: [BigInt(position.marketId), position.side === 'YES'],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        onClaimSuccess();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleSell = async () => {
    window.location.href = `/markets/${position.marketId}?mode=sell&side=${position.side.toLowerCase()}`;
  };

  return (
    <tr className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={cn(
            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
            position.side === 'YES'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
          )}>
            {position.side}
          </span>
          <div className="flex-1 min-w-0">
            <Link href={`/markets/${position.marketId}`} className="font-medium text-[13px] text-gray-800 dark:text-white hover:text-teal-500 transition-colors line-clamp-1">
              {position.question}
            </Link>
            <div className="text-[10px] text-gray-400 mt-0.5">Market #{position.marketId}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {!canRedeem && !showLost && !showClaimed && avgPurchasePrice > 0 ? (
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 line-through">
              {(avgPurchasePrice * 100).toFixed(1)}¢
            </span>
            <span className="text-[13px] font-semibold tabular-nums text-gray-900 dark:text-white">
              {(position.currentPrice * 100).toFixed(1)}¢
            </span>
          </div>
        ) : (
          <span className="text-[13px] font-semibold tabular-nums text-gray-900 dark:text-white">
            {(position.currentPrice * 100).toFixed(1)}¢
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-[13px] font-medium tabular-nums text-gray-600 dark:text-gray-300">
        {formatNumber(position.balance)}
      </td>
      <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums text-gray-900 dark:text-white">
        {formatCurrency(position.value)}
      </td>
      <td className="px-4 py-3 text-right">
        {showLost ? (
          <div className="text-[13px] font-medium tabular-nums text-gray-400 inline-flex flex-col items-end">
            <span>Lost</span>
          </div>
        ) : showClaimed ? (
          <div className="text-[13px] font-medium tabular-nums text-emerald-500 inline-flex flex-col items-end">
            <span>Won</span>
          </div>
        ) : totalInvested > 0 ? (
          <div className={cn(
            "text-[13px] font-semibold tabular-nums inline-flex flex-col items-end",
            isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
          )}>
            <span>{isProfit ? '+' : ''}{formatCurrency(profitLoss)}</span>
            <span className="text-[10px] opacity-70">
              {isProfit ? '+' : ''}{profitLossPercent.toFixed(1)}%
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-300">--</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {canRedeem ? (
            <Button
              onClick={handleClaim}
              disabled={isClaiming || isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 text-xs h-8 px-4 active:scale-95 transition-all"
            >
              {isClaiming || isPending ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                'Claim Win'
              )}
            </Button>
          ) : showLost ? (
            <span className="text-[11px] text-gray-400 font-medium">Resolved</span>
          ) : showClaimed ? (
            <span className="text-[11px] text-emerald-500 font-medium">Claimed</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                onClick={handleSell}
                disabled={isSelling}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border-0 font-semibold rounded-lg text-[11px] h-7 px-3 active:scale-95 transition-all"
              >
                Sell
              </Button>
              <Link href={`/markets/${position.marketId}`}>
                <Button variant="ghost" size="sm" className="rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 h-7 w-7 p-0">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// --- Sub-Components ---

function LoadingState({ prefersReducedMotion = false }: { prefersReducedMotion?: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 ${prefersReducedMotion ? '' : 'animate-pulse'}`} />
      ))}
    </div>
  );
}

function PositionCard({ position, trades = [], onClaimSuccess, isRedeemed = false, prefersReducedMotion = false }: { position: PortfolioPosition, trades?: PortfolioTrade[], onClaimSuccess: () => void, isRedeemed?: boolean, prefersReducedMotion?: boolean }) {
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const [isClaiming, setIsClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: resolutionData } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'getMarketResolution',
    args: [BigInt(position.marketId)],
    query: { enabled: position.status === 'Resolved' || position.marketResolved },
  }) as any;

  const actualIsResolved = resolutionData?.isResolved ?? position.marketResolved ?? (position.status === 'Resolved');
  const actualYesWins = resolutionData?.yesWins ?? position.yesWins;
  const actualIsWinner = actualIsResolved && (
    (actualYesWins === true && position.side === 'YES') ||
    (actualYesWins === false && position.side === 'NO')
  );

  const isWinner = actualIsWinner !== undefined ? actualIsWinner : (position.won ?? false);
  const canRedeem = actualIsResolved && isWinner && position.balance > 0.000001 && !isRedeemed;
  const isLost = actualIsResolved && !isWinner;

  const handleClaim = async () => {
    try {
      setIsClaiming(true);
      const hash = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'redeem',
        args: [BigInt(position.marketId), position.side === 'YES'],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        onClaimSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Transaction failed. Check console.");
    } finally {
      setIsClaiming(false);
    }
  };

  const isClaimed = isRedeemed || (position.status === 'Resolved' && isWinner && position.balance <= 0.000001);
  const showClaimed = isClaimed && isWinner;
  const showLost = position.status === 'Resolved' && !isWinner;

  // Calculate average purchase price from trades
  const positionTrades = trades.filter(t =>
    t.marketId === position.marketId &&
    t.side === position.side &&
    t.action === 'buy'
  );

  let avgPurchasePrice = 0;
  let totalInvested = 0;
  if (positionTrades.length > 0) {
    // Calculate weighted average price
    let totalTokens = 0;
    let weightedPriceSum = 0;
    positionTrades.forEach(trade => {
      totalTokens += trade.tokenAmount;
      weightedPriceSum += trade.tokenAmount * trade.price;
      totalInvested += trade.usdcAmount;
    });
    if (totalTokens > 0) {
      avgPurchasePrice = weightedPriceSum / totalTokens;
    }
  }

  // Calculate profit/loss
  const currentValue = position.value;
  const profitLoss = currentValue - totalInvested;
  const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const isProfit = profitLoss >= 0;

  // Handle sell
  const [isSelling, setIsSelling] = useState(false);
  const handleSell = async () => {
    try {
      setIsSelling(true);
      // Navigate to market page with sell mode
      window.location.href = `/markets/${position.marketId}?mode=sell&side=${position.side.toLowerCase()}`;
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSelling(false);
    }
  };

  return (
    <div className={cn(
      "relative rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 group overflow-hidden border shadow-sm hover:shadow-md",
      canRedeem
        ? "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800"
        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-teal-500/50 dark:hover:border-teal-500/50"
    )}>
      {canRedeem && (
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5 relative z-10">
        <div className="flex gap-2">
          <span className={cn(
            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm",
            position.side === 'YES'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'
          )}>
            {position.side}
          </span>
          {canRedeem && (
            <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-sm flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Win
            </span>
          )}
          {showLost && (
            <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 border border-gray-200">
              Lost
            </span>
          )}
          {showClaimed && (
            <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
              Redeemed
            </span>
          )}
        </div>
        {/* Price Indicator */}
        {!canRedeem && !showLost && !showClaimed && (
          <div className="text-xs font-bold text-gray-400 font-mono bg-white/50 px-2 py-1 rounded-lg border border-white/10">
            {formatCurrency(position.currentPrice)}
          </div>
        )}
      </div>

      <div className="relative z-10 mb-6 flex-1">
        <Link href={`/markets/${position.marketId}`} className="group-hover:text-teal-500 transition-colors">
          <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight line-clamp-2 mb-2">{position.question}</h3>
        </Link>
        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-4">Market #{position.marketId}</div>

        {/* Price Display: Avg → Now */}
        {!canRedeem && !showLost && !showClaimed && avgPurchasePrice > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-white/40 dark:bg-black/20 rounded-xl border border-white/10">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              Avg: {(avgPurchasePrice * 100).toFixed(2)}¢
            </span>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
              Now: {(position.currentPrice * 100).toFixed(2)}¢
            </span>
          </div>
        )}
      </div>

      {/* Stats Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent mb-5 relative z-10" />

      <div className="space-y-4 relative z-10">
        {/* Value and P/L */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Value</div>
            <div className={cn(
              "text-2xl font-black tracking-tight tabular-nums",
              canRedeem ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
            )}>
              {formatCurrency(position.value)}
            </div>
          </div>
          {!canRedeem && !showLost && !showClaimed && totalInvested > 0 && (
            <div className="text-right">
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Return</div>
              <div className={cn(
                "text-sm font-bold flex items-center gap-1 justify-end",
                isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                {isProfit ? '+' : ''}{formatCurrency(profitLoss)}
                <span className="text-[10px] opacity-70 bg-gray-100 dark:bg-black/20 px-1.5 py-0.5 rounded-md ml-1">
                  {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Balance */}
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          {formatNumber(position.balance)} shares
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {canRedeem ? (
            <Button
              onClick={handleClaim}
              disabled={isClaiming || isPending}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm h-11"
            >
              {isClaiming || isPending ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>Claim Win <ArrowRight className="w-4 h-4 ml-1.5" /></>
              )}
            </Button>
          ) : (
            !showLost && !showClaimed && (
              <>
                <Button
                  onClick={handleSell}
                  disabled={isSelling}
                  className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-100 font-bold rounded-xl shadow-sm active:scale-95 transition-all text-xs h-10"
                >
                  {isSelling ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Sell Position'
                  )}
                </Button>
                <Link href={`/markets/${position.marketId}`} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl border-gray-200 dark:border-gray-700 font-bold hover:border-teal-500 hover:text-teal-600 text-xs h-10 bg-transparent">
                    Trade More
                  </Button>
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Suggested Markets List Component
function SuggestedMarketsList() {
  const { data: markets = [], isLoading } = useMarketsListOptimized();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const activeMarkets = markets.filter(m => m.status === 'LIVE TRADING');

  if (!activeMarkets || activeMarkets.length === 0) {
    return null;
  }

  return (
    <>
      {activeMarkets.slice(0, 2).map(market => {
        const logoUrl = getMarketLogo(market.question);

        return (
          <div key={market.id} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden group hover:border-teal-500/30 transition-all">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                  <Image
                    src={logoUrl}
                    alt="Market Logo"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Live</span>
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Auto</span>
                </span>
              </div>

              <Link href={`/markets/${market.id}`} className="block group-hover:text-teal-500 transition-colors">
                <h3 className="text-[13px] font-medium text-gray-800 dark:text-white leading-snug mb-3 line-clamp-2">
                  {market.question}
                </h3>
              </Link>

              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                YES {(market.yesPrice * 100).toFixed(1)}¢
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/markets/${market.id}?side=yes`} className="flex-1">
                  <button className="w-full py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                    YES {(market.yesPrice * 100).toFixed(1)}¢
                  </button>
                </Link>
                <Link href={`/markets/${market.id}?side=no`} className="flex-1">
                  <button className="w-full py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
                    NO {(market.noPrice * 100).toFixed(1)}¢
                  </button>
                </Link>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>Vol: <span className="text-gray-600 dark:text-gray-300">{formatCurrency(market.volume)}</span></span>
                <span>All Time</span>
              </div>
              <Link href={`/markets/${market.id}`}>
                <button className="px-4 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
                  Trade
                </button>
              </Link>
            </div>
          </div>
        );
      })}
    </>
  );
}