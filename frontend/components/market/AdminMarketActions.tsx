'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { getAddresses, getCurrentNetwork, getNetwork } from '@/lib/contracts';
import { getCoreAbi, getChainlinkResolverAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { keccak256, stringToBytes, encodeAbiParameters, decodeErrorResult } from 'viem';
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

      // Helper function to parse Chainlink composite round ID
      // Format: phaseId (upper 16 bits) | aggregatorRoundId (lower 64 bits)
      const parseRoundId = (roundId: bigint) => {
        const phase = Number(roundId >> 64n);
        const aggregatorRound = Number(roundId & 0xFFFFFFFFFFFFFFFFn);
        return { phase, aggregatorRound };
      };

      // Helper function to construct round ID from phase and aggregator round
      const constructRoundId = (phase: number, aggregatorRound: number) => {
        return (BigInt(phase) << 64n) | BigInt(aggregatorRound);
      };

      // Linear search backwards, properly handling phase boundaries
      let found = false;
      for (let i = 0; i < 50; i++) {
        const { phase, aggregatorRound } = parseRoundId(targetRoundId);
        
        // Check if we're at a phase boundary - cannot go back further
        if (aggregatorRound === 0) {
          throw new Error("Cannot resolve at phase boundary. Market may need manual resolution.");
        }

        // Construct previous round ID in the same phase
        const prevRoundId = constructRoundId(phase, aggregatorRound - 1);
        
        try {
          const prev: any = await publicClient.readContract({
            address: oracleAddr as `0x${string}`,
            abi: aggregatorAbi,
            functionName: 'getRoundData',
            args: [prevRoundId],
          });
          
          const prevUpdatedAt = prev[3];
          const prevRoundUpdatedAtNum = Number(prevUpdatedAt);
          const expiryNum = Number(expiry);
          
          console.log(`Checking round ${i}:`, {
            targetRoundId: targetRoundId.toString(),
            prevRoundId: prevRoundId.toString(),
            prevUpdatedAt: prevRoundUpdatedAtNum,
            expiry: expiryNum,
            isBeforeExpiry: prevRoundUpdatedAtNum < expiryNum,
          });
          
          if (prevUpdatedAt < expiry) {
            found = true;
            // Verify the target round is after expiry
            const targetRoundData: any = await publicClient.readContract({
              address: oracleAddr as `0x${string}`,
              abi: aggregatorAbi,
              functionName: 'getRoundData',
              args: [targetRoundId],
            });
            const targetUpdatedAt = Number(targetRoundData[3]);
            console.log('Found first round after expiry:', {
              roundId: targetRoundId.toString(),
              updatedAt: targetUpdatedAt,
              expiry: expiryNum,
              isAfterExpiry: targetUpdatedAt >= expiryNum,
            });
            
            if (targetUpdatedAt < expiryNum) {
              throw new Error(`Selected round (${targetRoundId.toString()}) updatedAt (${targetUpdatedAt}) is before expiry (${expiryNum}). This should not happen.`);
            }
            
            break; // targetRoundId is the first one after expiry
          }
          targetRoundId = prevRoundId;
        } catch (error: any) {
          // If previous round doesn't exist, we might be at phase boundary
          // Try to check if we can go to previous phase
          if (phase > 0) {
            // Try to get the last round of previous phase (this is complex, so we'll error)
            throw new Error(`Cannot find previous round. Market may be at phase boundary or too old. Error: ${error.message}`);
          }
          throw new Error(`Cannot find previous round data. Error: ${error.message}`);
        }
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
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          
          // Check if transaction failed
          if (receipt.status === 'reverted') {
            throw new Error('Transaction reverted. Check the transaction on block explorer for details.');
          }
          
          pushToast({ title: 'Success', description: `Market #${marketId} resolved successfully!`, type: 'success' });
          // Refresh page data
          window.location.reload();
        } catch (txError: any) {
          // If transaction failed, try to decode the error
          throw new Error(`Transaction failed: ${txError.message || 'Unknown error'}. Check block explorer for details.`);
        }
      }
    } catch (e: any) {
      console.error('Error resolving market:', e);
      
      // Try to extract more detailed error information
      let errorMessage = e.message || 'Failed to resolve market';
      
      // Try to decode error from transaction if available
      if (e.data || e.cause?.data) {
        try {
          const errorData = e.data || e.cause?.data;
          if (errorData && publicClient) {
            const decoded = decodeErrorResult({
              abi: resolverAbi,
              data: errorData,
            });
            errorMessage = `Contract Error: ${decoded.errorName}`;
            
            // Map specific errors to user-friendly messages
            const errorMap: Record<string, string> = {
              'PhaseBoundaryRound': 'Cannot resolve at phase boundary. The market may need manual resolution.',
              'MarketNotExpired': 'Market has not expired yet.',
              'NotFirstRoundAfterExpiry': 'Selected round is not the first round after expiry.',
              'Stale': 'Round data is too stale (older than 2 hours).',
              'IncompleteRound': 'Round data is incomplete or previous round is missing.',
              'OracleDecimalsMismatch': 'Oracle decimals have changed since market creation.',
              'RoundTooEarly': 'Selected round occurred before market expiry.',
              'InvalidRoundId': 'Invalid round ID provided.',
              'NotChainlinkMarket': 'Market does not use Chainlink oracle.',
              'FeedMissing': 'Oracle feed address is not set.',
            };
            
            if (errorMap[decoded.errorName]) {
              errorMessage = errorMap[decoded.errorName];
            }
          }
        } catch (decodeError) {
          // If decoding fails, use original error message
          console.error('Failed to decode error:', decodeError);
        }
      }
      
      // Check for common error patterns in message
      if (errorMessage.includes('PhaseBoundaryRound') || errorMessage.includes('phase boundary')) {
        errorMessage = 'Cannot resolve at phase boundary. The market may need manual resolution.';
      } else if (errorMessage.includes('MarketNotExpired')) {
        errorMessage = 'Market has not expired yet.';
      } else if (errorMessage.includes('NotFirstRoundAfterExpiry')) {
        errorMessage = 'Selected round is not the first round after expiry.';
      } else if (errorMessage.includes('Stale')) {
        errorMessage = 'Round data is too stale (older than 2 hours).';
      } else if (errorMessage.includes('IncompleteRound')) {
        errorMessage = 'Round data is incomplete or previous round is missing.';
      } else if (errorMessage.includes('OracleDecimalsMismatch')) {
        errorMessage = 'Oracle decimals have changed since market creation.';
      } else if (errorMessage.includes('PAUSED') || errorMessage.includes('paused')) {
        errorMessage = 'Resolver contract is paused.';
      } else if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
        errorMessage = 'Transaction reverted. Check the transaction on block explorer for the specific error reason.';
      }
      
      pushToast({ title: 'Error', description: errorMessage, type: 'error' });
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

