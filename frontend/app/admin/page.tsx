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
import { addresses } from '@/lib/contracts';
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
      <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-br from-[#14B8A6]/10 to-purple-400/10 dark:from-[#14B8A6]/5 dark:to-purple-400/5 rounded-full blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-[#14B8A6]/10 dark:from-blue-400/5 dark:to-[#14B8A6]/5 rounded-full blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
        <Header />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Admin Panel</h1>
            <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to access the admin panel</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-br from-[#14B8A6]/10 to-purple-400/10 dark:from-[#14B8A6]/5 dark:to-purple-400/5 rounded-full blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-[#14B8A6]/10 dark:from-blue-400/5 dark:to-[#14B8A6]/5 rounded-full blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
        <Header />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-red-200 dark:border-red-900">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Admin Panel</h1>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-400 font-semibold">Access Denied</p>
              <p className="text-red-600 dark:text-red-300 text-sm mt-2">Only administrators can access this page. Your address ({address?.slice(0, 6)}...{address?.slice(-4)}) is not authorized.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-br from-[#14B8A6]/10 to-purple-400/10 dark:from-[#14B8A6]/5 dark:to-purple-400/5 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-[#14B8A6]/10 dark:from-blue-400/5 dark:to-[#14B8A6]/5 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Admin Panel</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage markets, admins, and system settings</p>
        </div>
        
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">USDC Minting</h2>
            <MintUsdcForm />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Create Market</h2>
            <CreateMarketForm />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Admin Management</h2>
            <AdminManager />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">USDC Minter Management</h2>
            <USDCMinterManager />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#14B8A6]"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Loading markets...</p>
              </div>
            ) : (
              <AdminMarketManager markets={markets} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
