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
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.06),transparent_50%)]"></div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-gradient-to-r from-[#14B8A6] via-purple-500 to-blue-500 opacity-[0.08] dark:opacity-[0.12] blur-[120px]"></div>
        </div>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
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
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.06),transparent_50%)]"></div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-gradient-to-r from-[#14B8A6] via-purple-500 to-blue-500 opacity-[0.08] dark:opacity-[0.12] blur-[120px]"></div>
        </div>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-white/90 via-white/80 to-gray-50/40 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/50 backdrop-blur-2xl rounded-[32px] p-10 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] border-2 border-white/60 dark:border-gray-700/60 max-w-md w-full text-center ring-1 ring-gray-900/5 dark:ring-white/5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
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
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden font-sans">

      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.06),transparent_50%)]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[600px] w-[600px] rounded-full bg-gradient-to-r from-[#14B8A6] via-purple-500 to-blue-500 opacity-[0.08] dark:opacity-[0.12] blur-[120px]"></div>
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent tracking-tighter mb-4 drop-shadow-sm">
              Admin Dashboard
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">Manage markets, permissions, and system parameters.</p>
          </motion.div>
        </div>
        
        {/* USDC Minting Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -2 }}
          className="mb-10"
        >
          <div className="bg-gradient-to-br from-white/90 via-white/80 to-gray-50/40 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/50 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] border-2 border-white/60 dark:border-gray-700/60 ring-1 ring-gray-900/5 dark:ring-white/5 hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.6)] transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-br from-blue-100 to-blue-200/50 dark:from-blue-900/30 dark:to-blue-800/20 text-blue-600 dark:text-blue-400 p-2 rounded-xl shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              USDC Faucet
            </h2>
            <MintUsdcForm />
          </div>
        </motion.div>

        {/* Create Market Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -2 }}
          className="mb-10"
        >
          <div className="bg-gradient-to-br from-white/90 via-white/80 to-gray-50/40 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/50 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] border-2 border-white/60 dark:border-gray-700/60 ring-1 ring-gray-900/5 dark:ring-white/5 hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.6)] transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-br from-[#14B8A6]/10 to-[#14B8A6]/5 text-[#14B8A6] p-2 rounded-xl shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              Create New Market
            </h2>
            <CreateMarketForm />
          </div>
        </motion.div>

        {/* Management Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -2 }}
            className="bg-gradient-to-br from-white/90 via-white/80 to-gray-50/40 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/50 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] border-2 border-white/60 dark:border-gray-700/60 ring-1 ring-gray-900/5 dark:ring-white/5 hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.6)] transition-all duration-300"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-br from-purple-100 to-purple-200/50 dark:from-purple-900/30 dark:to-purple-800/20 text-purple-600 dark:text-purple-400 p-2 rounded-xl shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
              Admin Management
            </h2>
            <AdminManager />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ y: -2 }}
            className="bg-gradient-to-br from-white/90 via-white/80 to-gray-50/40 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/50 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] border-2 border-white/60 dark:border-gray-700/60 ring-1 ring-gray-900/5 dark:ring-white/5 hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.6)] transition-all duration-300"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-br from-amber-100 to-amber-200/50 dark:from-amber-900/30 dark:to-amber-800/20 text-amber-600 dark:text-amber-400 p-2 rounded-xl shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              Minter Permissions
            </h2>
            <USDCMinterManager />
          </motion.div>
        </div>

        {/* Market Management List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-white/90 via-white/80 to-gray-50/40 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-900/50 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] border-2 border-white/60 dark:border-gray-700/60 ring-1 ring-gray-900/5 dark:ring-white/5"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="bg-gradient-to-br from-indigo-100 to-indigo-200/50 dark:from-indigo-900/30 dark:to-indigo-800/20 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </span>
            Manage Markets
          </h2>
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#14B8A6] border-t-transparent"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Loading market data...</p>
            </div>
          ) : (
            <AdminMarketManager markets={markets} />
          )}
        </motion.div>
        
      </main>
    </div>
  );
}