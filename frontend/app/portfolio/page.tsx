'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  Wallet,
  TrendingUp,
  History,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trophy,
  Check,
  X,
  RefreshCw,
  Search,
  PieChart,
  Sparkles,
  ArrowRight,
  User
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

import Header from '@/components/Header';
import { Button } from '@/components/ui';
import MintUsdcForm from '@/components/MintUsdcForm';
import { useUserPortfolio, type PortfolioPosition, type PortfolioTrade } from '@/lib/hooks/useUserPortfolio';
import { EmptyState } from '@/components/ui/EmptyState';
import { useConfetti } from '@/lib/ConfettiContext';
import { coreAbi, positionTokenAbi } from '@/lib/abis';
import { addresses } from '@/lib/contracts';
import { useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { getMarketResolution } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/market/Sparkline';
import { NicknameManager } from '@/components/NicknameManager';


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
  const { isConnected } = useAccount();
  const { data, isLoading, refetch, isRefetching } = useUserPortfolio();
  const [activeTab, setActiveTab] = useState<PortfolioTab>('positions');
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

  const totalValue = positions.reduce((acc, pos) => acc + pos.value, 0);
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
    { name: 'Active', value: positions.filter(p => p.status === 'Active').reduce((acc, p) => acc + p.value, 0), color: '#3B82F6' },
    { name: 'Winnings', value: claimablePositions.reduce((acc, p) => acc + p.value, 0), color: '#10B981' },
    { name: 'Claimed', value: totalClaimed, color: '#F59E0B' },
  ].filter(d => d.value > 0);

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
    <div className="min-h-screen relative overflow-x-hidden font-sans selection:bg-[#14B8A6]/30">

      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-gray-50 dark:bg-[#0B1121]">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] invert dark:invert-0" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#14B8A6]/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pb-32">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4 shadow-sm">
              <Wallet className="w-3 h-3 text-[#14B8A6]" /> Portfolio Overview
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-500 tracking-tighter mb-2">
              My Portfolio
            </h1>
          </motion.div>

          <div className="flex flex-wrap items-center gap-4">
            <motion.button
              onClick={() => setIsNicknameModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 pl-4 pr-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-teal-100 dark:bg-teal-900/20 rounded-xl">
                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] font-bold uppercase opacity-80 mb-0.5">Profile</span>
                <span className="text-sm font-black">Set Nickname</span>
              </div>
            </motion.button>

            {claimablePositions.length > 0 && (
              <motion.button
                onClick={() => setActiveTab('claims')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white pl-4 pr-5 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-500/20"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-xl backdrop-blur-md">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col items-start leading-none relative z-10">
                  <span className="text-[9px] font-bold uppercase opacity-80 mb-0.5">Ready to Claim</span>
                  <span className="text-sm font-black">{claimablePositions.length} Wins Available</span>
                </div>
              </motion.button>
            )}

            <button
              onClick={async () => {
                setIsManualRefreshing(true);
                await refetch();
                setIsManualRefreshing(false);
              }}
              disabled={isRefetching || isManualRefreshing}
              className="w-12 h-12 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-white dark:hover:bg-gray-800 transition-all disabled:opacity-50 backdrop-blur-xl"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${(isRefetching || isManualRefreshing) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">

          {/* Main Value Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 bg-gradient-to-br from-[#14B8A6] to-[#0D9488] rounded-[40px] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-[#14B8A6]/20 flex flex-col justify-between min-h-[300px]"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest opacity-70 mb-1">Total Net Worth</h2>
                  <div className="text-5xl md:text-7xl font-black tracking-tighter tabular-nums text-white">
                    {isLoading ? "..." : formatCurrency(totalValue + totalClaimed)}
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Active Value</div>
                <div className="text-xl font-bold">{formatCurrency(totalValue)}</div>
              </div>
              <div className="bg-black/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Realized Gains</div>
                <div className="text-xl font-bold text-emerald-300">+{formatCurrency(totalClaimed)}</div>
              </div>
              <div className="bg-black/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Positions</div>
                <div className="text-xl font-bold">{positions.length}</div>
              </div>
              <div className="bg-black/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-[10px] font-bold uppercase opacity-60 mb-1">Win Rate</div>
                <div className="text-xl font-bold">{resolvedPositionsCount > 0 ? Math.round((claimablePositions.length + claimedPositions.length) / resolvedPositionsCount * 100) : 0}%</div>
              </div>
            </div>
          </motion.div>

          {/* Allocation Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[40px] p-8 flex flex-col items-center justify-center relative shadow-xl"
          >
            <h3 className="absolute top-8 left-8 text-sm font-bold text-gray-400 uppercase tracking-widest">Allocation</h3>

            {allocationData.length > 0 ? (
              <div className="w-full h-[200px] mt-8 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </RechartsPie>
                </ResponsiveContainer>
                {/* Centered Total */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                  <span className="text-xs font-bold text-gray-400 uppercase">Total</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] opacity-30 mt-8">
                <PieChart className="w-16 h-16 mb-2" />
                <div className="text-sm font-bold">No Data</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 w-full mt-4">
              {allocationData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="font-medium text-gray-500 dark:text-gray-400">{d.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">{Math.round((d.value / (totalValue + totalClaimed)) * 100)}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>


        {/* Tabs & Content */}
        <div className="min-h-[600px]">
          {/* Custom Tab Switcher */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {(['positions', 'claims', 'history', 'faucet'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-3 rounded-2xl text-sm font-bold transition-all relative whitespace-nowrap border",
                  activeTab === tab
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-lg shadow-gray-900/20 dark:shadow-white/10"
                    : "bg-white/50 dark:bg-gray-900/50 text-gray-500 hover:text-gray-900 dark:hover:text-white border-transparent hover:bg-white dark:hover:bg-gray-800"
                )}
              >
                {tab === 'positions' && <PieChart className="w-4 h-4 inline-block mr-2 -mt-0.5" />}
                {tab === 'history' && <History className="w-4 h-4 inline-block mr-2 -mt-0.5" />}
                {tab === 'faucet' && <Wallet className="w-4 h-4 inline-block mr-2 -mt-0.5" />}

                {tab.charAt(0).toUpperCase() + tab.slice(1)}

                {tab === 'claims' && claimablePositions.length > 0 && (
                  <span className="ml-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
                    {claimablePositions.length}
                  </span>
                )}
              </button>
            ))}
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
                  className="space-y-12"
                >
                  {isLoading ? (
                    <LoadingState prefersReducedMotion={prefersReducedMotion} />
                  ) : positions.length === 0 ? (
                    <EmptyState
                      title="Vault Empty"
                      description="You have no active positions. The markets await your prediction."
                      actionLink="/markets"
                      actionText="Find Markets"
                    />
                  ) : (
                    <>
                      {/* Active Section */}
                      {positions.filter(p => p.status === 'Active').length > 0 && (
                        <div>
                          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <span className="w-2 h-8 bg-blue-500 rounded-full" />
                            Active Positions
                          </h3>
                          <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-[40px] border border-white/20 dark:border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                                  <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Position</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shares</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Value</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">P/L</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                  {positions.filter(p => p.status === 'Active').map((position) => (
                                    <PositionRow
                                      key={`${position.marketId}-${position.side}`}
                                      position={position}
                                      trades={trades}
                                      onClaimSuccess={() => refetch()}
                                      isRedeemed={redeemedMarketIds.has(position.marketId)}
                                    />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Resolved Section */}
                      {positions.filter(p => p.status === 'Resolved').length > 0 && (
                        <div>
                          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 mt-4 flex items-center gap-2">
                            <span className="w-2 h-8 bg-purple-500 rounded-full" />
                            Resolved
                          </h3>
                          <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-[40px] border border-white/20 dark:border-white/5 overflow-hidden opacity-90">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                                  <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Position</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Shares</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Value</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">P/L</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                  {positions.filter(p => p.status === 'Resolved').map((position) => (
                                    <PositionRow
                                      key={`${position.marketId}-${position.side}`}
                                      position={position}
                                      trades={trades}
                                      onClaimSuccess={() => refetch()}
                                      isRedeemed={redeemedMarketIds.has(position.marketId)}
                                    />
                                  ))}
                                </tbody>
                              </table>
                            </div>
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
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                          <span className="w-2 h-8 bg-emerald-500 rounded-full" />
                          Unclaimed Winnings
                        </h3>
                        {claimablePositions.length === 0 ? (
                          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-[32px] p-12 text-center border border-dashed border-gray-300 dark:border-gray-700">
                            <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">All winnings have been claimed.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        <div className="border-t border-gray-200/50 dark:border-white/5 pt-12">
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Redeemed History</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity">
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
                    <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-[40px] border border-white/20 dark:border-white/5 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                            <tr>
                              <th className="px-8 py-6 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                              <th className="px-8 py-6 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Market</th>
                              <th className="px-8 py-6 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                              <th className="px-8 py-6 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</th>
                              <th className="px-8 py-6 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                              <th className="px-8 py-6 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {trades.map((trade) => (
                              <tr key={trade.id} className="group hover:bg-white dark:hover:bg-white/5 transition-colors">
                                <td className="px-8 py-5">
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
                                <td className="px-8 py-5">
                                  <Link href={`/markets/${trade.marketId}`} className="font-bold text-gray-900 dark:text-white hover:text-[#14B8A6] transition-colors line-clamp-1 max-w-[300px]">
                                    {trade.question}
                                  </Link>
                                </td>
                                <td className="px-8 py-5 text-right font-medium tabular-nums">{formatNumber(trade.tokenAmount)}</td>
                                <td className="px-8 py-5 text-right font-medium tabular-nums">{formatCurrency(trade.price)}</td>
                                <td className="px-8 py-5 text-right font-black tabular-nums">{formatCurrency(trade.usdcAmount)}</td>
                                <td className="px-8 py-5 text-right text-xs text-gray-400 font-mono">
                                  {new Date(trade.timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                  <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-[32px] p-2 shadow-xl border border-gray-100 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-[28px] p-8">
                      <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Wallet className="w-8 h-8" />
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-center text-gray-900 dark:text-white mb-2">Need Test Funds?</h3>
                      <p className="text-sm text-gray-500 text-center mb-8">Mint USDC to start trading on the testnet.</p>
                      <MintUsdcForm />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>

      {/* Nickname Modal */}
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
function PositionRow({ position, trades = [], onClaimSuccess, isRedeemed = false }: { position: PortfolioPosition, trades?: PortfolioTrade[], onClaimSuccess: () => void, isRedeemed?: boolean }) {
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const { trigger: triggerConfetti } = useConfetti();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSelling, setIsSelling] = useState(false);

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
        triggerConfetti();
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
    <tr className="group hover:bg-white dark:hover:bg-white/5 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
            position.side === 'YES'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'
          )}>
            {position.side}
          </span>
          <div className="flex-1 min-w-0">
            <Link href={`/markets/${position.marketId}`} className="font-bold text-gray-900 dark:text-white hover:text-[#14B8A6] transition-colors line-clamp-1">
              {position.question}
            </Link>
            <div className="text-xs text-gray-400 font-medium mt-0.5">Market #{position.marketId}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {!canRedeem && !showLost && !showClaimed && avgPurchasePrice > 0 ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                {(avgPurchasePrice * 100).toFixed(2)}¢
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Now</span>
              <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                {(position.currentPrice * 100).toFixed(2)}¢
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Now</span>
            <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
              {(position.currentPrice * 100).toFixed(2)}¢
            </span>
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-right font-medium tabular-nums text-gray-900 dark:text-white">
        {formatNumber(position.balance)}
      </td>
      <td className="px-6 py-4 text-right font-black tabular-nums text-gray-900 dark:text-white">
        {formatCurrency(position.value)}
      </td>
      <td className="px-6 py-4 text-right">
        {!canRedeem && !showLost && !showClaimed && totalInvested > 0 ? (
          <div className={cn(
            "text-sm font-bold tabular-nums",
            isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}>
            {isProfit ? '+' : ''}{formatCurrency(profitLoss)}
            <div className="text-xs opacity-80">
              ({isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%)
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          {canRedeem ? (
            <Button
              onClick={handleClaim}
              disabled={isClaiming || isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 text-xs h-8 px-4"
            >
              {isClaiming || isPending ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                'Claim'
              )}
            </Button>
          ) : (
            !showLost && !showClaimed && (
              <>
                <Button
                  onClick={handleSell}
                  disabled={isSelling}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 text-xs h-8 px-4"
                >
                  Sell
                </Button>
                <Link href={`/markets/${position.marketId}`}>
                  <Button variant="outline" size="sm" className="rounded-lg border-gray-200 dark:border-gray-700 font-bold hover:border-[#14B8A6] hover:text-[#14B8A6] text-xs h-8 px-4">
                    Trade
                  </Button>
                </Link>
              </>
            )
          )}
        </div>
      </td>
    </tr>
  );
}

// --- Sub-Components ---

function LoadingState({ prefersReducedMotion = false }: { prefersReducedMotion?: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`h-64 bg-gray-100 dark:bg-gray-800 rounded-[40px] ${prefersReducedMotion ? '' : 'animate-pulse'}`} />
      ))}
    </div>
  );
}

function PositionCard({ position, trades = [], onClaimSuccess, isRedeemed = false, prefersReducedMotion = false }: { position: PortfolioPosition, trades?: PortfolioTrade[], onClaimSuccess: () => void, isRedeemed?: boolean, prefersReducedMotion?: boolean }) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const { trigger: triggerConfetti } = useConfetti();
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
        triggerConfetti();
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
      "relative rounded-[32px] p-6 flex flex-col justify-between transition-all duration-300 group overflow-hidden border backdrop-blur-xl",
      canRedeem
        ? "bg-white dark:bg-gray-800 border-emerald-500/30 shadow-[0_10px_40px_rgba(16,185,129,0.15)] hover:shadow-[0_10px_40px_rgba(16,185,129,0.25)]"
        : "bg-white/60 dark:bg-gray-800/40 border-white/20 dark:border-white/5 hover:border-[#14B8A6]/30 hover:-translate-y-1 shadow-lg"
    )}>
      {canRedeem && (
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex gap-2">
          <span className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
            position.side === 'YES'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'
          )}>
            {position.side}
          </span>
          {canRedeem && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Win
            </span>
          )}
          {showLost && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 border border-gray-200">
              Lost
            </span>
          )}
          {showClaimed && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
              Redeemed
            </span>
          )}
        </div>
        {/* Price Indicator */}
        {!canRedeem && !showLost && !showClaimed && (
          <div className="text-xs font-bold text-gray-400 font-mono">
            {formatCurrency(position.currentPrice)}
          </div>
        )}
      </div>

      <div className="relative z-10 mb-4 flex-1">
        <Link href={`/markets/${position.marketId}`} className="group-hover:text-[#14B8A6] transition-colors">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 mb-1">{position.question}</h3>
        </Link>
        <div className="text-xs text-gray-400 font-medium mb-3">Market #{position.marketId}</div>

        {/* Price Display: Avg → Now */}
        {!canRedeem && !showLost && !showClaimed && avgPurchasePrice > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
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
      <div className="w-full h-px bg-gray-100 dark:bg-white/5 mb-4 relative z-10" />

      <div className="space-y-3 relative z-10">
        {/* Value and P/L */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Value</div>
            <div className={cn(
              "text-2xl font-black tracking-tight",
              canRedeem ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"
            )}>
              {formatCurrency(position.value)}
            </div>
            {!canRedeem && !showLost && !showClaimed && totalInvested > 0 && (
              <div className={cn(
                "text-xs font-bold mt-1",
                isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                {isProfit ? '+' : ''}{formatCurrency(profitLoss)} ({isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%)
              </div>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="text-[10px] text-gray-400 font-medium">
          {formatNumber(position.balance)} {position.side === 'YES' ? 'Yes' : 'No'} shares
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {canRedeem ? (
            <Button
              onClick={handleClaim}
              disabled={isClaiming || isPending}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs h-10"
            >
              {isClaiming || isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>Claim <ArrowRight className="w-3 h-3 ml-1" /></>
              )}
            </Button>
          ) : (
            !showLost && !showClaimed && (
              <>
                <Button
                  onClick={handleSell}
                  disabled={isSelling}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs h-10"
                >
                  {isSelling ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Sell'
                  )}
                </Button>
                <Link href={`/markets/${position.marketId}`} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl border-gray-200 dark:border-gray-700 font-bold hover:border-[#14B8A6] hover:text-[#14B8A6] text-xs h-10">
                    Trade
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