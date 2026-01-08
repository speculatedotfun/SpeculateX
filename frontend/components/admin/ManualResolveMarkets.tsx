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
    <div className="space-y-6">
      {/* Description */}
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
        <p>
          Manually resolve expired markets that haven&apos;t been processed by Chainlink Automation yet.
        </p>
        <p className="text-xs">
          The resolver will automatically find and resolve all eligible expired markets using the latest Chainlink price feed data.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={checkExpiredMarkets}
          disabled={isChecking || isResolving}
          className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {isChecking ? 'Checking...' : 'Check Expired Markets'}
        </button>

        <button
          onClick={resolveAllMarkets}
          disabled={isResolving || isChecking}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-[#14B8A6] to-emerald-600 hover:from-[#0FA193] hover:to-emerald-700 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#14B8A6]/20"
        >
          <Zap className={`w-4 h-4 ${isResolving ? 'animate-pulse' : ''}`} />
          {isResolving ? 'Resolving...' : 'Resolve All Expired'}
        </button>
      </div>

      {/* Result Message */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border ${
              result.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : result.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {result.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{result.message}</p>
                {result.marketsResolved && result.marketsResolved.length > 0 && (
                  <p className="text-xs mt-2 opacity-80">
                    Markets resolved: {result.marketsResolved.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Box */}
      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-3 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">How it works:</p>
            <ul className="list-disc list-inside space-y-1 opacity-80">
              <li>Markets are resolved using the first Chainlink price update after expiry</li>
              <li>If the first update is late (&gt;5min), TWAP fallback is used for accuracy</li>
              <li>Each transaction resolves one market at a time</li>
              <li>The process continues until all expired markets are resolved</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
