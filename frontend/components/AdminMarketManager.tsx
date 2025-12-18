'use client';
import { useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { getAddresses, getNetwork } from '@/lib/contracts';
import { getCoreAbi } from '@/lib/abis';
import { formatUnits, encodeAbiParameters, keccak256, stringToBytes } from 'viem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { CheckCircle, XCircle, DollarSign, Trophy, Activity, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import chainlinkResolverAbiData from '@/lib/abis/ChainlinkResolver.json';
const chainlinkResolverAbi = Array.isArray(chainlinkResolverAbiData) 
  ? chainlinkResolverAbiData 
  : (chainlinkResolverAbiData as any).abi || chainlinkResolverAbiData;

// BSC Chapel Testnet Chainlink feed addresses
const KNOWN_FEEDS: Record<string, string> = {
  'BTC/USD': '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
  'ETH/USD': '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
  'BNB/USD': '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
};

interface Market {
  id: number;
  question: string;
  status: 'active' | 'resolved' | 'expired';
  vault: number;
  residual: number;
  yesWins: boolean;
  isResolved: boolean;
  winningSupply: bigint;
}

export default function AdminMarketManager({ markets }: { markets: Market[] }) {
  const { data: hash, writeContract, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { pushToast } = useToast();
  const publicClient = usePublicClient();
  const addresses = getAddresses();
  const network = getNetwork();
  const coreAbiForNetwork = getCoreAbi(network);

  // This component is for the old monolithic core admin flow.
  // Diamond Testnet uses different admin operations (timelock + resolver.resolve()).

  const handleResolve = (id: number, yesWins: boolean) => {
    writeContract({
      address: addresses.core,
      abi: coreAbiForNetwork,
      functionName: 'resolveMarket',
      args: [BigInt(id), yesWins],
    });
  };

  const handleFinalize = (id: number) => {
    writeContract({
      address: addresses.core,
      abi: coreAbiForNetwork,
      functionName: 'finalizeResidual',
      args: [BigInt(id)],
    });
  };

  const handleRegisterFeedForMarket = async (marketId: number) => {
    try {
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      pushToast({ title: 'Checking Market', description: `Getting feed info for market #${marketId}...`, type: 'info' });

      // Get market resolution to find the priceFeedId
      const resolution = await publicClient.readContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'getMarketResolution',
        args: [BigInt(marketId)],
      }) as any;

      const priceFeedId = resolution.priceFeedId as `0x${string}`;
      
      // Try to find the feed ID string from known feeds
      let feedIdString: string | null = null;
      let feedAddress: string | null = null;
      
      for (const [feedId, addr] of Object.entries(KNOWN_FEEDS)) {
        const hash = keccak256(stringToBytes(feedId));
        if (hash.toLowerCase() === priceFeedId.toLowerCase()) {
          feedIdString = feedId;
          feedAddress = addr;
          break;
        }
      }

      if (!feedIdString || !feedAddress) {
        pushToast({ 
          title: 'Unknown Feed', 
          description: `Feed ID ${priceFeedId.slice(0, 10)}... not found in known feeds. Please register manually.`, 
          type: 'error' 
        });
        return;
      }

      pushToast({ 
        title: 'Registering Feed', 
        description: `Registering ${feedIdString} feed...`, 
        type: 'info' 
      });
      
      // Call setGlobalFeed (0x73330f46)
      const hash = await writeContractAsync({
        address: addresses.chainlinkResolver,
        abi: chainlinkResolverAbi,
        functionName: 'setGlobalFeed',
        args: [priceFeedId, feedAddress as `0x${string}`],
      });

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        pushToast({ title: 'Success', description: `${feedIdString} feed registered! Chainlink will resolve this market automatically.`, type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      console.error('Feed registration error:', e);
      const errorMessage = e.message || 'Failed to register feed';
      let userMessage = errorMessage;
      
      if (errorMessage.includes('not owner')) {
        userMessage = 'You are not the owner of ChainlinkResolver. Only the owner can register feeds.';
      }
      
      pushToast({ 
        title: 'Error', 
        description: userMessage, 
        type: 'error' 
      });
    }
  };

  const handleTriggerChainlinkResolution = async (marketId: number) => {
    try {
      pushToast({ title: 'Checking Market Status', description: `Checking if market #${marketId} needs resolution...`, type: 'info' });
      
      // First check if upkeep is needed
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      const upkeepNeeded = await publicClient.readContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'checkUpkeep',
        args: [BigInt(marketId)],
      }) as [boolean, string];

      if (!upkeepNeeded[0]) {
        pushToast({ 
          title: 'Cannot Resolve', 
          description: `Market #${marketId} does not need resolution. It may already be resolved, not expired, or not a Chainlink market.`, 
          type: 'error' 
        });
        return;
      }

      // Get market resolution to find the priceFeedId
      const resolution = await publicClient.readContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'getMarketResolution',
        args: [BigInt(marketId)],
      }) as any;

      // Check if feed is registered
      const priceFeedId = resolution.priceFeedId as `0x${string}`;
      const feedAddress = await publicClient.readContract({
        address: addresses.chainlinkResolver,
        abi: chainlinkResolverAbi,
        functionName: 'globalFeeds',
        args: [priceFeedId],
      }) as `0x${string}`;

      // Try to find the feed ID string from known feeds
      let feedIdString: string | null = null;
      let knownFeedAddress: string | null = null;
      
      for (const [feedId, addr] of Object.entries(KNOWN_FEEDS)) {
        const hash = keccak256(stringToBytes(feedId));
        if (hash.toLowerCase() === priceFeedId.toLowerCase()) {
          feedIdString = feedId;
          knownFeedAddress = addr;
          break;
        }
      }

      if (!feedIdString || !knownFeedAddress) {
        pushToast({ 
          title: 'Unknown Feed', 
          description: `Feed ID ${priceFeedId.slice(0, 10)}... not found in known feeds. Please register manually.`, 
          type: 'error' 
        });
        return;
      }

      // If feed is not registered, register it first
      if (!feedAddress || feedAddress === '0x0000000000000000000000000000000000000000') {
        pushToast({ title: 'Registering Feed', description: `Registering ${feedIdString} feed for market #${marketId}...`, type: 'info' });
        
        // Call setGlobalFeed (0x73330f46) - this is what MetaMask will show
        const registerHash = await writeContractAsync({
          address: addresses.chainlinkResolver,
          abi: chainlinkResolverAbi,
          functionName: 'setGlobalFeed',
          args: [priceFeedId, knownFeedAddress as `0x${string}`],
        });

        if (registerHash && publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: registerHash });
          pushToast({ title: 'Feed Registered', description: `${feedIdString} feed registered! Now resolving market...`, type: 'success' });
        }
      }

      // Now resolve the market using performUpkeep
      pushToast({ title: 'Resolving Market', description: `Resolving market #${marketId} via Chainlink...`, type: 'info' });
      
      // Encode performData: (marketId, nextBatchStart)
      const performData = encodeAbiParameters(
        [{ type: 'uint256' }, { type: 'uint256' }],
        [BigInt(marketId), BigInt(marketId + 1)]
      );

      const hash = await writeContractAsync({
        address: addresses.chainlinkResolver,
        abi: chainlinkResolverAbi,
        functionName: 'performUpkeep',
        args: [performData],
      });

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        pushToast({ title: 'Success', description: `Market #${marketId} resolved via Chainlink!`, type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      }

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        pushToast({ title: 'Success', description: `Market #${marketId} resolved via Chainlink!`, type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      console.error('Chainlink resolution error:', e);
      const errorMessage = e.message || 'Failed to trigger Chainlink resolution';
      let userMessage = errorMessage;
      
      // Provide more helpful error messages
      if (errorMessage.includes('upkeep not needed')) {
        userMessage = 'Market does not need resolution. It may already be resolved or not expired yet.';
      } else if (errorMessage.includes('feed not registered')) {
        userMessage = 'Price feed not registered. Please register the feed in Admin Manager first.';
      } else if (errorMessage.includes('not chainlink')) {
        userMessage = 'This market is not configured for Chainlink resolution.';
      } else if (errorMessage.includes('paused')) {
        userMessage = 'ChainlinkResolver is paused. Please unpause it first.';
      } else if (errorMessage.includes('price out of bounds')) {
        userMessage = 'Price change is too large. This is a safety check.';
      } else if (errorMessage.includes('not owner')) {
        userMessage = 'You are not the owner of ChainlinkResolver. Only the owner can register feeds.';
      }
      
      pushToast({ 
        title: 'Error', 
        description: userMessage, 
        type: 'error' 
      });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      pushToast({ title: 'Success', description: 'Action confirmed', type: 'success' });
      setTimeout(() => window.location.reload(), 1500);
    }
  }, [isSuccess, pushToast]);

  if (network === 'testnet') return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {markets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700"
        >
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" aria-hidden="true" />
          <p className="text-gray-500 dark:text-gray-400 font-medium" role="status">No markets found</p>
        </motion.div>
      ) : (
        markets.map((market, index) => (
          <motion.div
            key={market.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-[#14B8A6] dark:hover:border-[#14B8A6] transition-all shadow-sm hover:shadow-md"
            role="article"
            aria-label={`Market ${market.id}: ${market.question}`}
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <Badge variant="secondary" className="font-mono">#{market.id}</Badge>
                  <Badge variant={market.isResolved ? "secondary" : "default"}>
                    {market.status}
                  </Badge>
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg leading-tight text-balance">{market.question}</h4>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Vault</div>
                <div className="font-mono font-bold text-xl text-gray-900 dark:text-white">${market.vault.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-700" role="group" aria-label="Market actions">
              {!market.isResolved && market.status !== 'expired' ? (
                <>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(market.id, true)}
                      disabled={isPending || isConfirming}
                      className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Resolve market ${market.id} as Yes wins`}
                    >
                      {isPending || isConfirming ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                      )}
                      Yes Wins
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(market.id, false)}
                      disabled={isPending || isConfirming}
                      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Resolve market ${market.id} as No wins`}
                    >
                      {isPending || isConfirming ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                      )}
                      No Wins
                    </Button>
                  </motion.div>
                </>
              ) : market.isResolved ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" aria-hidden="true" />
                    Winner: <span className={`font-bold ${market.yesWins ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{market.yesWins ? 'YES' : 'NO'}</span>
                  </motion.div>
                  {market.residual > 0 && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="sm"
                        onClick={() => handleFinalize(market.id)}
                        disabled={isPending || isConfirming}
                        variant="outline"
                        className="w-full sm:w-auto hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Finalize market ${market.id} with residual $${market.residual.toFixed(2)}`}
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        ) : (
                          <DollarSign className="w-4 h-4 mr-2" aria-hidden="true" />
                        )}
                        Finalize (${market.residual.toFixed(2)})
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : market.status === 'expired' ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-300 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 px-4 py-2.5 rounded-lg border border-orange-200 dark:border-orange-800"
                  >
                    <Activity className="w-4 h-4 animate-pulse" aria-hidden="true" />
                    Market expired - awaiting Chainlink resolution
                  </motion.div>
                  <div className="flex flex-wrap gap-2">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="sm"
                        onClick={() => handleRegisterFeedForMarket(market.id)}
                        disabled={isPending || isConfirming}
                        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Register price feed for market ${market.id}`}
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" aria-hidden="true" />
                        )}
                        Register Feed
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="sm"
                        onClick={() => handleTriggerChainlinkResolution(market.id)}
                        disabled={isPending || isConfirming}
                        className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Trigger Chainlink resolution for market ${market.id}`}
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" aria-hidden="true" />
                        )}
                        Trigger Resolution
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}