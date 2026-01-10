'use client';

export const dynamic = 'force-dynamic';


import { useEffect, useState, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import CreateMarketForm from '@/components/CreateMarketForm';
import AdminMarketManager from '@/components/AdminMarketManager';
import MintUsdcForm from '@/components/MintUsdcForm';
import AdminManager from '@/components/AdminManager';
import USDCMinterManager from '@/components/USDCMinterManager';
import AdminOperationsManager from '@/components/AdminOperationsManager';
import ManualResolveMarkets from '@/components/admin/ManualResolveMarkets';
import Header from '@/components/Header';
import { getMarketCount, getMarket, getMarketState, getLpResidualPot } from '@/lib/hooks';
import { isAdmin as checkIsAdmin } from '@/lib/accessControl';
import { formatUnits } from 'viem';
import { positionTokenAbi } from '@/lib/abis';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Plus, Shield, Users, Wallet, Zap, BarChart3, Database, Settings, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Market {
  id: number;
  question: string;
  status: 'active' | 'resolved' | 'expired' | 'scheduled';
  startTime: string; // Changed from bigint to string
  vault: number;
  residual: number;
  yesToken: `0x${string}`;
  noToken: `0x${string}`;
  yesWins: boolean;
  isResolved: boolean;
  winningSupply: string; // Changed from bigint to string
  targetValue: string; // Changed from bigint to string
  comparison: number;
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
            const startTime = resolution?.startTime ? BigInt(resolution.startTime) : 0n;
            const targetValue = resolution?.targetValue ? BigInt(resolution.targetValue) : 0n;
            const comparison = Number(resolution?.comparison ?? 0);
            const now = Math.floor(Date.now() / 1000);
            const isExpired = !isResolved && Number(expiryTimestamp) > 0 && now > Number(expiryTimestamp);
            const isScheduled = Number(startTime) > 0 && now < Number(startTime);

            let status: 'active' | 'resolved' | 'expired' | 'scheduled';
            if (isScheduled) {
              status = 'scheduled';
            } else if (isExpired) {
              status = 'expired';
            } else {
              status = statusNames[Math.min(contractStatus, 2)] as 'active' | 'resolved' | 'expired' | 'scheduled';
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
              winningSupply: winningSupply.toString(),
              startTime: startTime.toString(),
              targetValue: targetValue.toString(),
              comparison,
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
      <div className="min-h-screen text-gray-900 dark:text-white overflow-hidden flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-gray-800/30 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-12 rounded-[32px] max-w-lg w-full text-center shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <Lock className="w-16 h-16 mx-auto mb-6 text-[#14B8A6]/50" />
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 mb-4">Are you Elite?</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg font-light">Connect your wallet to access the control center.</p>
            <div className="w-full h-12 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-sm font-bold tracking-widest uppercase text-gray-500">
              Waiting for Connection...
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen text-gray-900 dark:text-white overflow-hidden flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 p-12 rounded-[32px] max-w-lg w-full text-center shadow-2xl"
          >
            <Shield className="w-16 h-16 mx-auto mb-6 text-red-500" />
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Address <span className="font-mono text-red-500 dark:text-red-400">{address?.slice(0, 6)}...{address?.slice(-4)}</span> is not authorized.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900 dark:text-white font-sans selection:bg-[#14B8A6]/30 transition-colors duration-300">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-[#0f1219] dark:to-[#0f1219]"></div>
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[url('/grid.svg')] opacity-[0.03] invert dark:invert-0"></div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">

        {/* Header Section */}
        <div className="mb-12 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] text-[10px] font-black uppercase tracking-widest mb-4"
            >
              <Shield className="w-3 h-3" /> Root Access Granted
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-500 mb-2">
              Command Center
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-light max-w-2xl">
              Manage markets, resolve disputes, and configure protocol parameters in real-time.
            </p>
            <button
              onClick={async () => {
                if (!address) return;
                const isAdminForce = await checkIsAdmin(address);
                alert(`Role Verification:\n\nCreate/Resolve Role (ADMIN): ${isAdminForce ? '✅ GRANTED' : '❌ MISSING'}\n\nAddress: ${address}\n\nNote: If role is MISSING, you cannot perform admin actions.`);
              }}
              className="mt-4 px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Verify Access
            </button>
          </div>

          <div className="flex gap-4">
            <AdminStat value={markets.length} label="Total Markets" icon={Database} color="text-blue-500 dark:text-blue-400" />
            <AdminStat value={markets.filter(m => m.status === 'active').length} label="Active" icon={Activity} color="text-emerald-500 dark:text-emerald-400" />
            <AdminStat value={markets.filter(m => m.isResolved).length} label="Resolved" icon={Zap} color="text-amber-500 dark:text-amber-400" />
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min">

          {/* Create Market (Span 8) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="md:col-span-8 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-[32px] p-8 relative overflow-hidden shadow-sm dark:shadow-none transition-colors"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#14B8A6]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-[#14B8A6]/10 dark:bg-[#14B8A6]/20 rounded-2xl text-[#14B8A6]">
                  <Plus className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Deploy Market</h2>
              </div>
              <CreateMarketForm />
            </div>
          </motion.div>

          {/* Sidebar Column (Span 4) */}
          <div className="md:col-span-4 flex flex-col gap-6">
            {/* USDC Faucet */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex-1 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-[32px] p-8 relative overflow-hidden shadow-sm dark:shadow-none transition-colors"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl text-blue-500 dark:text-blue-400">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">USDC Faucet</h2>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <MintUsdcForm />
                </div>
              </div>
            </motion.div>

            {/* Minter Access */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-[32px] p-8 relative overflow-hidden shadow-sm dark:shadow-none transition-colors"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl text-amber-500 dark:text-amber-400">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Minter Role</h2>
              </div>
              <USDCMinterManager />
            </motion.div>

            {/* Referral Logs Link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-[32px] p-8 relative overflow-hidden shadow-sm dark:shadow-none transition-colors group cursor-pointer"
              onClick={() => window.location.href = '/admin/referrals'}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-colors" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 rounded-2xl text-purple-500 dark:text-purple-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Referrals</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View tracking logs</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <Database className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* System Operations (Full Width) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="md:col-span-12 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-[32px] p-8 shadow-sm dark:shadow-none transition-colors"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-orange-500/10 dark:bg-orange-500/20 rounded-2xl text-orange-500 dark:text-orange-400">
                <Settings className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Protocol Operations</h2>
            </div>
            <AdminOperationsManager />
          </motion.div>

          {/* Manual Resolve (Span 6) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="md:col-span-6 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-[32px] p-8 shadow-sm dark:shadow-none transition-colors"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl text-emerald-500 dark:text-emerald-400">
                <Zap className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manual Market Resolution</h2>
            </div>
            <ManualResolveMarkets />
          </motion.div>

          {/* Permissions (Span 6) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="md:col-span-6 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-[32px] p-8 shadow-sm dark:shadow-none transition-colors"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 rounded-2xl text-purple-500 dark:text-purple-400">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Permissions</h2>
            </div>
            <AdminManager />
          </motion.div>

          {/* System Ledger (Span 12) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="md:col-span-12 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-[32px] p-8 shadow-sm dark:shadow-none transition-colors"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl text-indigo-500 dark:text-indigo-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Global Market Ledger</h2>
              </div>
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE SYNC
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                <div className="w-10 h-10 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm tracking-widest uppercase">Synchronizing...</p>
              </div>
            ) : (
              <AdminMarketManager markets={markets} />
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}

function AdminStat({ value, label, icon: Icon, color }: { value: number | string, label: string, icon: any, color: string }) {
  return (
    <div className="px-6 py-4 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/5 rounded-2xl min-w-[140px] hover:border-gray-300 dark:hover:border-white/10 transition-colors group shadow-sm dark:shadow-none">
      <div className={cn("mb-2 opacity-70 group-hover:opacity-100 transition-opacity", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">{value}</div>
      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}