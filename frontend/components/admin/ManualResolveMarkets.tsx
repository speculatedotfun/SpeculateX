'use client';

import { useState } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { getChainlinkResolver } from '@/lib/contracts';
import { Zap, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const chainlinkResolverAbi = [
  {
    inputs: [{ internalType: 'bytes', name: 'checkData', type: 'bytes' }],
    name: 'checkUpkeep',
    outputs: [
      { internalType: 'bool', name: 'upkeepNeeded', type: 'bool' },
      { internalType: 'bytes', name: 'performData', type: 'bytes' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes', name: 'performData', type: 'bytes' }],
    name: 'performUpkeep',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

export default function ManualResolveMarkets() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isChecking, setIsChecking] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
    marketsResolved?: number[];
  } | null>(null);

  const checkExpiredMarkets = async () => {
    if (!publicClient) return;

    setIsChecking(true);
    setResult(null);

    try {
      const resolver = getChainlinkResolver();

      // Call checkUpkeep with empty data to scan all markets
      const result = await publicClient.readContract({
        address: resolver,
        abi: chainlinkResolverAbi,
        functionName: 'checkUpkeep',
        args: ['0x'],
      });

      const [upkeepNeeded, performData] = result;

      if (!upkeepNeeded || performData === '0x' || performData === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        setResult({
          type: 'info',
          message: 'No expired markets found that need resolution.',
        });
      } else {
        // Decode market ID from performData
        const marketId = BigInt(performData);
        setResult({
          type: 'info',
          message: `Found market #${marketId} that needs resolution. Click "Resolve All" to process.`,
        });
      }
    } catch (error: any) {
      console.error('Error checking markets:', error);
      setResult({
        type: 'error',
        message: `Error checking markets: ${error.message || 'Unknown error'}`,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const resolveAllMarkets = async () => {
    if (!walletClient || !publicClient) {
      setResult({
        type: 'error',
        message: 'Wallet not connected',
      });
      return;
    }

    setIsResolving(true);
    setResult(null);
    const resolvedMarkets: number[] = [];

    try {
      const resolver = getChainlinkResolver();
      let iterations = 0;
      const maxIterations = 50; // Safety limit

      while (iterations < maxIterations) {
        // Check if there are any markets to resolve
        const checkResult = await publicClient.readContract({
          address: resolver,
          abi: chainlinkResolverAbi,
          functionName: 'checkUpkeep',
          args: ['0x'],
        });

        const [upkeepNeeded, performData] = checkResult;

        if (!upkeepNeeded || performData === '0x' || performData === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          // No more markets to resolve
          break;
        }

        // Decode market ID
        const marketId = Number(BigInt(performData));

        // Resolve the market
        const hash = await walletClient.writeContract({
          address: resolver,
          abi: chainlinkResolverAbi,
          functionName: 'performUpkeep',
          args: [performData],
        });

        // Wait for transaction
        await publicClient.waitForTransactionReceipt({ hash });

        resolvedMarkets.push(marketId);
        iterations++;
      }

      if (resolvedMarkets.length === 0) {
        setResult({
          type: 'info',
          message: 'No expired markets found.',
        });
      } else {
        setResult({
          type: 'success',
          message: `Successfully resolved ${resolvedMarkets.length} market${resolvedMarkets.length > 1 ? 's' : ''}!`,
          marketsResolved: resolvedMarkets,
        });
      }
    } catch (error: any) {
      console.error('Error resolving markets:', error);
      setResult({
        type: 'error',
        message: `Error: ${error.message || 'Transaction failed'}`,
        marketsResolved: resolvedMarkets.length > 0 ? resolvedMarkets : undefined,
      });
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={checkExpiredMarkets}
          disabled={isChecking || isResolving}
          className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg font-semibold text-xs text-gray-700 dark:text-gray-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Check Expired'}
        </button>

        <button
          onClick={resolveAllMarkets}
          disabled={isResolving || isChecking}
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#14B8A6] to-emerald-600 hover:from-[#0FA193] hover:to-emerald-700 rounded-lg font-semibold text-xs text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Zap className={`w-3.5 h-3.5 ${isResolving ? 'animate-pulse' : ''}`} />
          {isResolving ? 'Resolving...' : 'Resolve All'}
        </button>
      </div>

      {/* Result Message */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-lg border text-xs ${result.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : result.type === 'error'
                  ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}
          >
            <div className="flex items-center gap-2">
              {result.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <p className="font-medium">{result.message}</p>
            </div>
            {result.marketsResolved && result.marketsResolved.length > 0 && (
              <p className="text-[10px] mt-1 ml-6 opacity-70">
                Markets: {result.marketsResolved.join(', ')}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Info */}
      <details className="group">
        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          How it works
        </summary>
        <ul className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5 ml-4 list-disc">
          <li>Markets resolved using first Chainlink price after expiry</li>
          <li>TWAP fallback used if update is late (&gt;5min)</li>
          <li>Each transaction resolves one market</li>
        </ul>
      </details>
    </div>
  );
}
