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
  status: 'active' | 'resolved';
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

            const statusNames = ['active', 'resolved'] as const;
            const statusIndex = Math.min(Number(market.status ?? 0), 1);
            const vaultValue = state?.vault ?? 0n;
            const residualValue = residualPot ?? 0n;
            const resolution = market.resolution;
            const isResolved = Boolean(resolution?.isResolved);
            const yesWins = Boolean(resolution?.yesWins);

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
              status: statusNames[statusIndex],
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
        {/* Background Gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
        </div>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[32px] p-10 shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-md w-full text-center">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Admin Panel</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">Please connect your wallet to access administrative controls.</p>
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl text-sm font-bold border border-blue-100 dark:border-blue-800/50">
              Connect via Header ↗
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
        {/* Background Gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
        </div>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[32px] p-10 shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
              Your address <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span> is not authorized as an administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden font-sans">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
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
            <h1 className="text-4xl sm:text-5xl font-black text-[#0f0a2e] dark:text-white tracking-tighter mb-4">
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
          className="mb-10"
        >
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-white/20 dark:border-gray-700/50">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-xl">
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
          className="mb-10"
        >
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-white/20 dark:border-gray-700/50">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-[#14B8A6]/10 text-[#14B8A6] p-2 rounded-xl">
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
            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-white/20 dark:border-gray-700/50"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2 rounded-xl">
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
            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-white/20 dark:border-gray-700/50"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
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
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-white/20 dark:border-gray-700/50"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl">
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