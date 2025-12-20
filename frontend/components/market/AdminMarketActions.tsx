'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { getAddresses, getCurrentNetwork, getNetwork } from '@/lib/contracts';
import { getCoreAbi, getChainlinkResolverAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { keccak256, stringToBytes, encodeAbiParameters } from 'viem';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { 
  AlertTriangle, Loader2, Zap, X, Clock, Shield, 
  ChevronDown, ChevronUp, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminMarketActionsProps {
  marketId: number;
  marketStatus: 'active' | 'resolved' | 'cancelled' | 'expired';
  isResolved: boolean;
  expiryTimestamp: bigint;
  oracleType: number;
  oracleAddress?: string;
}

export function AdminMarketActions({
  marketId,
  marketStatus,
  isResolved,
  expiryTimestamp,
  oracleType,
  oracleAddress,
}: AdminMarketActionsProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const addresses = getAddresses();
  const coreAbi = getCoreAbi(getCurrentNetwork());
  const resolverAbi = getChainlinkResolverAbi(getNetwork());
  const { writeContractAsync } = useWriteContract();

  const OP_CANCEL_MARKET = keccak256(stringToBytes('OP_CANCEL_MARKET'));

  useEffect(() => {
    if (address) {
      checkIsAdmin(address).then((result) => {
        setIsAdmin(result);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [address]);

  const handleResolveMarket = async () => {
    if (!publicClient || !addresses.chainlinkResolver || oracleType !== 1 || !oracleAddress) {
      pushToast({ 
        title: 'Error', 
        description: 'Market must use Chainlink oracle to resolve automatically', 
        type: 'error' 
      });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (Number(expiryTimestamp) > now) {
      pushToast({ 
        title: 'Error', 
        description: 'Market has not expired yet', 
        type: 'error' 
      });
      return;
    }

    try {
      setResolving(true);
      pushToast({ title: 'Searching Oracle', description: `Finding correct round for market #${marketId}...`, type: 'info' });

      // Get market data
      const { getMarket } = await import('@/lib/hooks');
      const market = await getMarket(BigInt(marketId));
      if (!market || !market.resolution) throw new Error("Market data not found");

      const expiry = BigInt(market.resolution.expiryTimestamp);
      const oracleAddr = market.resolution.oracleAddress;

      // Find first round after expiry
      const aggregatorAbi = [
        { type: 'function', name: 'latestRoundData', inputs: [], outputs: [
          {name:'roundId',type:'uint80'},{name:'answer',type:'int256'},{name:'startedAt',type:'uint256'},{name:'updatedAt',type:'uint256'},{name:'answeredInRound',type:'uint80'}
        ], stateMutability: 'view' },
        { type: 'function', name: 'getRoundData', inputs: [{name:'_roundId',type:'uint80'}], outputs: [
          {name:'roundId',type:'uint80'},{name:'answer',type:'int256'},{name:'startedAt',type:'uint256'},{name:'updatedAt',type:'uint256'},{name:'answeredInRound',type:'uint80'}
        ], stateMutability: 'view' }
      ] as const;

      const latest: any = await publicClient.readContract({
        address: oracleAddr as `0x${string}`,
        abi: aggregatorAbi,
        functionName: 'latestRoundData',
      });

      let targetRoundId = latest[0];
      let currentUpdatedAt = latest[3];

      if (currentUpdatedAt < expiry) {
        throw new Error("Oracle hasn't updated since market expiry yet");
      }

      // Linear search backwards
      let found = false;
      for (let i = 0; i < 50; i++) {
        const prev: any = await publicClient.readContract({
          address: oracleAddr as `0x${string}`,
          abi: aggregatorAbi,
          functionName: 'getRoundData',
          args: [targetRoundId - 1n],
        });
        
        const prevUpdatedAt = prev[3];
        if (prevUpdatedAt < expiry) {
          found = true;
          break;
        }
        targetRoundId -= 1n;
      }

      if (!found) throw new Error("Could not find the exact transition round within 50 updates");

      // Resolve
      pushToast({ title: 'Resolving Market', description: `Executing resolve with round ${targetRoundId.toString()}...`, type: 'info' });
      
      const hash = await writeContractAsync({
        address: addresses.chainlinkResolver,
        abi: resolverAbi,
        functionName: 'resolve',
        args: [BigInt(marketId), targetRoundId],
      });

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        pushToast({ title: 'Success', description: `Market #${marketId} resolved successfully!`, type: 'success' });
        // Refresh page data
        window.location.reload();
      }
    } catch (e: any) {
      console.error('Error resolving market:', e);
      pushToast({ title: 'Error', description: e.message || 'Failed to resolve market', type: 'error' });
    } finally {
      setResolving(false);
    }
  };

  const handleScheduleCancel = async () => {
    if (!publicClient) return;

    try {
      setCancelling(true);
      const data = encodeAbiParameters([{ type: 'uint256' }], [BigInt(marketId)]);
      
      const opId = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'scheduleOp',
        args: [OP_CANCEL_MARKET, data],
      });

      if (opId) {
        await publicClient.waitForTransactionReceipt({ hash: opId });
        pushToast({ 
          title: 'Success', 
          description: 'Market cancellation scheduled. Execute after timelock expires.', 
          type: 'success' 
        });
      }
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message || 'Failed to schedule cancellation', type: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const isExpired = !isResolved && expiryTimestamp > 0n && BigInt(Math.floor(Date.now() / 1000)) > expiryTimestamp;
  const canResolve = isExpired && !isResolved && oracleType === 1 && marketStatus === 'active';
  const canCancel = marketStatus === 'active' && !isResolved;

  if (!canResolve && !canCancel) return null;

  return (
    <div className="border border-amber-200 dark:border-amber-800/50 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">Admin Actions</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 space-y-3 border-t border-amber-200 dark:border-amber-800/50">
              {canResolve && (
                <Button
                  onClick={handleResolveMarket}
                  disabled={resolving}
                  className="w-full bg-[#14B8A6] hover:bg-[#0D9488] text-white"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Resolve Market
                    </>
                  )}
                </Button>
              )}
              
              {canCancel && (
                <div className="space-y-2">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Warning:</strong> Cancelling will refund all positions at 50% value. This action is timelocked.
                  </div>
                  <Button
                    onClick={handleScheduleCancel}
                    disabled={cancelling}
                    variant="destructive"
                    className="w-full"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Schedule Cancellation
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

