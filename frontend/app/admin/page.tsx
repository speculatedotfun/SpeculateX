'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import CreateMarketForm from '@/components/CreateMarketForm';
import AdminMarketManager from '@/components/AdminMarketManager';
import MintUsdcForm from '@/components/MintUsdcForm';
import AdminManager from '@/components/AdminManager';
import USDCMinterManager from '@/components/USDCMinterManager';
import Header from '@/components/Header';
import { getMarketCount, getMarket, getMarketState, getLpResidualPot, isAdmin as checkIsAdmin } from '@/lib/hooks';
import { formatUnits } from 'viem';
import { positionTokenAbi } from '@/lib/abis';
import { motion } from 'framer-motion';
import { Activity, Plus, Shield, Users, Wallet, Zap, BarChart3, Database } from 'lucide-react';

interface Market {
  id: number;
  question: string;
  status: 'active' | 'resolved' | 'expired';
  vault: number;
  residual: number;
  yesToken: `0x${string}`;
  noToken: `0x${string}`;
  yesWins: boolean;
  isResolved: boolean;
  winningSupply: bigint;
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const loadMarkets = useCallback(async () => {
    try {
      const count = await getMarketCount();
      const marketIds = Array.from({ length: Number(count) }, (_, idx) => idx + 1);

      const marketResults = await Promise.all(
        marketIds.map(async (id) => {
          try {
            const [market, state, residualPot] = await Promise.all([
              getMarket(BigInt(id)),
              getMarketState(BigInt(id)),
              getLpResidualPot(BigInt(id)),
            ]);

            if (!market.exists) return null;

            const statusNames = ['active', 'resolved', 'cancelled'] as const;
            const contractStatus = Number(market.status ?? 0);
            const vaultValue = state?.vault ?? 0n;
            const residualValue = residualPot ?? 0n;
            const resolution = market.resolution;
            const isResolved = Boolean(resolution?.isResolved);
            const yesWins = Boolean(resolution?.yesWins);
            const expiryTimestamp = resolution?.expiryTimestamp ? BigInt(resolution.expiryTimestamp) : 0n;
            const isExpired = !isResolved && expiryTimestamp > 0n && BigInt(Math.floor(Date.now() / 1000)) > expiryTimestamp;

            // Determine status: if expired, use 'expired', otherwise use contract status
            let status: 'active' | 'resolved' | 'expired';
            if (isExpired) {
              status = 'expired';
            } else {
              status = statusNames[Math.min(contractStatus, 2)] as 'active' | 'resolved' | 'expired';
            }

            let winningSupply: bigint = 0n;
            if (isResolved && publicClient) {
              const winnerToken = yesWins ? market.yes : market.no;
              if (winnerToken && winnerToken !== '0x0000000000000000000000000000000000000000') {
                try {
                  winningSupply = await publicClient.readContract({
                    address: winnerToken as `0x${string}`,
                    abi: positionTokenAbi,
                    functionName: 'totalSupply',
                    args: [],
                  }) as bigint;
                } catch (error) {
                  console.error(`Error reading winning supply for market ${id}:`, error);
                }
              }
            }

            return {
              id,
              question: market.question as string,
              status,
              vault: Number(formatUnits(vaultValue, 6)),
              residual: Number(formatUnits(residualValue, 6)),
              yesToken: market.yes as `0x${string}`,
              noToken: market.no as `0x${string}`,
              yesWins,
              isResolved,
              winningSupply,
            } as Market;
          } catch (error) {
            console.error(`Error loading market ${id}:`, error);
            return null;
          }
        })
      );

      setMarkets(marketResults.filter((m): m is Market => m !== null));
    } catch (error) {
      console.error('Error loading markets:', error);
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isConnected || !address) {
        setIsAdmin(false);
        setMarkets([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const adminStatus = await checkIsAdmin(address);
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        setMarkets([]);
        setLoading(false);
        return;
      }

      await loadMarkets();
    };

    checkAdmin();
  }, [isConnected, address, loadMarkets]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
        {/* Enhanced Background Gradient */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.06),transparent_50%)]"></div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2 m-auto h-[500px] w-[500px] rounded-full bg-gradient-to-r from-[#14B8A6] via-purple-500 to-blue-500 opacity-[0.08] dark:opacity-[0.12] blur-[120px]"></div>
        </div>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
            className="bg-gradient-to-br from-white/90 via-white/80 to-gray-50/40 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/50 backdrop-blur-2xl rounded-[32px] p-10 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] border-2 border-white/60 dark:border-gray-700/60 max-w-md w-full text-center ring-1 ring-gray-900/5 dark:ring-white/5"
          >
            <h1 className="text-3xl font-black bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent mb-4">Admin Panel</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">Please connect your wallet to access administrative controls.</p>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl text-sm font-bold border border-blue-200/60 dark:border-blue-800/50 shadow-sm">
              Connect via Header ↗
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
        {/* Enhanced Background Gradient */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.06),transparent_50%)]"></div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2 m-auto h-[500px] w-[500px] rounded-full bg-gradient-to-r from-[#14B8A6] via-purple-500 to-blue-500 opacity-[0.08] dark:opacity-[0.12] blur-[120px]"></div>
        </div>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
            className="bg-gradient-to-br from-white/90 via-white/80 to-gray-50/40 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/50 backdrop-blur-2xl rounded-[32px] p-10 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] border-2 border-white/60 dark:border-gray-700/60 max-w-md w-full text-center ring-1 ring-gray-900/5 dark:ring-white/5"
          >
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200/50 dark:from-red-900/30 dark:to-red-800/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </motion.div>
            <h1 className="text-3xl font-black bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
              Your address <span className="font-mono bg-gradient-to-br from-gray-100 to-gray-200/50 dark:from-gray-700 dark:to-gray-800/50 px-2 py-1 rounded text-sm border border-gray-200 dark:border-gray-600">{address?.slice(0, 6)}...{address?.slice(-4)}</span> is not authorized as an administrator.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden font-sans selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white">

      {/* Enhanced Background Pattern */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.06),transparent_50%)]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 m-auto h-[600px] w-[600px] rounded-full bg-gradient-to-r from-[#14B8A6] via-purple-500 to-blue-500 opacity-[0.08] dark:opacity-[0.12] blur-[120px]"></div>
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">

        {/* Page Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest mb-4">
              <Shield className="w-3 h-3" />
              Administrative Access
            </div>
            <h1 className="text-4xl sm:text-6xl font-black bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent tracking-tighter drop-shadow-sm leading-[0.9]">
              Elite <br /> Dashboard.
            </h1>
          </motion.div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
             <AdminStat value={markets.length.toString()} label="Total Markets" icon={Database} color="text-blue-500" />
             <AdminStat value={markets.filter(m => m.status === 'active').length.toString()} label="Active" icon={Activity} color="text-emerald-500" />
             <AdminStat value={markets.filter(m => m.isResolved).length.toString()} label="Resolved" icon={Zap} color="text-amber-500" />
          </div>
        </div>
        
        {/* --- BENTO GRID START --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 auto-rows-min">
          
          {/* Create Market - Main Action (Span 8) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8 group"
          >
            <div className="h-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl border-2 border-white/60 dark:border-gray-700/60 rounded-[40px] p-8 lg:p-10 shadow-2xl transition-all duration-500 hover:border-[#14B8A6]/40 ring-1 ring-gray-900/5 dark:ring-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <Plus className="w-40 h-40 text-[#14B8A6]" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-8 flex items-center gap-4 tracking-tight">
                <div className="bg-[#14B8A6] p-3 rounded-2xl text-white shadow-lg shadow-[#14B8A6]/20">
                  <Plus className="w-6 h-6" />
                </div>
                Create Market
              </h2>
              <CreateMarketForm />
            </div>
          </motion.div>

          {/* USDC Faucet - Side Action (Span 4) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4"
          >
            <div className="h-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl border-2 border-white/60 dark:border-gray-700/60 rounded-[40px] p-8 shadow-2xl transition-all duration-500 hover:border-blue-500/40 ring-1 ring-gray-900/5 dark:ring-white/5 flex flex-col">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-4 tracking-tight">
                <div className="bg-blue-500 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                  <Wallet className="w-5 h-5" />
                </div>
                USDC Faucet
              </h2>
              <div className="flex-1">
                <MintUsdcForm />
              </div>
            </div>
          </motion.div>

          {/* Admin Management (Span 6) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-6"
          >
            <div className="h-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl border-2 border-white/60 dark:border-gray-700/60 rounded-[40px] p-8 shadow-2xl transition-all duration-500 hover:border-purple-500/40 ring-1 ring-gray-900/5 dark:ring-white/5">
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-4 tracking-tight uppercase tracking-widest">
                <div className="bg-purple-500 p-3 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                  <Users className="w-5 h-5" />
                </div>
                Permissions
              </h2>
              <AdminManager />
            </div>
          </motion.div>

          {/* Minter Permissions (Span 6) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-6"
          >
            <div className="h-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl border-2 border-white/60 dark:border-gray-700/60 rounded-[40px] p-8 shadow-2xl transition-all duration-500 hover:border-amber-500/40 ring-1 ring-gray-900/5 dark:ring-white/5">
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-4 tracking-tight uppercase tracking-widest">
                <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                Minter Access
              </h2>
              <USDCMinterManager />
            </div>
          </motion.div>

          {/* Market Management List (Span 12) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-12"
          >
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl border-2 border-white/60 dark:border-gray-700/60 rounded-[40px] p-8 lg:p-10 shadow-2xl ring-1 ring-gray-900/5 dark:ring-white/5">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4 tracking-tight">
                  <div className="bg-indigo-500 p-3 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  System Ledger
                </h2>
                <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-100 dark:bg-gray-900/50 px-4 py-2 rounded-full border border-gray-200/50 dark:border-gray-700/50">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Real-time synchronization
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-32">
                  <div className={`inline-block rounded-[20px] h-12 w-12 border-4 border-[#14B8A6] border-t-transparent ${prefersReducedMotion ? '' : 'animate-spin'}`}></div>
                  <p className="mt-6 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">Syncing Ledger...</p>
                </div>
              ) : (
                <AdminMarketManager markets={markets} />
              )}
            </div>
          </motion.div>
        </div>
        {/* --- BENTO GRID END --- */}
        
      </main>
    </div>
  );
}

function AdminStat({ value, label, icon: Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3 group hover:border-[#14B8A6]/30 transition-all min-w-[120px]">
      <div className={`${color} opacity-60 group-hover:opacity-100 transition-opacity`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-lg font-black text-gray-900 dark:text-white leading-none mb-1">{value}</div>
        <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter whitespace-nowrap">{label}</div>
      </div>
    </div>
  );
}