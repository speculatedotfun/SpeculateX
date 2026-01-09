'use client';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { getAddresses, getCurrentNetwork, getNetwork } from '@/lib/contracts';
import { getCoreAbi, getChainlinkResolverAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/accessControl';
import { keccak256, stringToBytes, decodeErrorResult } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Shield, UserPlus, X, Link, Database, Loader2, CheckCircle2, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CRYPTO_ASSETS } from '@/lib/assets';
const chainlinkResolverAbi = getChainlinkResolverAbi(getNetwork());


export default function AdminManager() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [chainlinkResolverAddress, setChainlinkResolverAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdmins, setCurrentAdmins] = useState<string[]>([]);
  const [selectedFeed, setSelectedFeed] = useState('');
  const [feedAddress, setFeedAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validAddress, setValidAddress] = useState(false);
  const [validResolverAddress, setValidResolverAddress] = useState(false);
  const [validFeedAddress, setValidFeedAddress] = useState(false);
  const [currentResolver, setCurrentResolver] = useState<string | null>(null);
  const [isCheckingResolver, setIsCheckingResolver] = useState(false);
  const [markets, setMarkets] = useState<Array<{ id: number; question: string; expiryTimestamp: string; isResolved: boolean; expired: boolean }>>([]);

  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [resolvingMarketId, setResolvingMarketId] = useState<number | null>(null);

  // Contracts hooks... (same logic as before)
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const MARKET_CREATOR_ROLE = keccak256(stringToBytes('MARKET_CREATOR_ROLE'));

  const { writeContractAsync: addAdminAsync } = useWriteContract();
  const { writeContract: removeAdmin } = useWriteContract();
  const { writeContractAsync: setChainlinkResolverAsync } = useWriteContract();
  const { writeContractAsync: setGlobalFeedAsync } = useWriteContract();
  const { writeContractAsync: resolveMarketAsync } = useWriteContract();

  // Check current resolver address
  const addresses = getAddresses();
  const { data: resolverAddress, refetch: refetchResolver } = useReadContract({
    address: addresses.core,
    abi: getCoreAbi(getCurrentNetwork()),
    functionName: 'chainlinkResolver',
    args: [],
    query: { enabled: !!addresses.core },
  });

  // Use shared assets directory


  // Load initial admin (check if current user is admin)
  useEffect(() => {
    if (address) {
      setIsLoading(true);
      checkIsAdmin(address).then((result) => {
        setIsAdmin(result);
        setIsLoading(false);
      });
    }
  }, [address]);

  // Real-time address validation
  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(newAdminAddress);
    setValidAddress(isValid);
  }, [newAdminAddress]);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(chainlinkResolverAddress);
    setValidResolverAddress(isValid);
  }, [chainlinkResolverAddress]);

  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(feedAddress);
    setValidFeedAddress(isValid);
  }, [feedAddress]);

  // Update current resolver when data changes
  useEffect(() => {
    if (resolverAddress) {
      const resolver = resolverAddress as `0x${string}`;
      setCurrentResolver(resolver);
      if (resolver !== '0x0000000000000000000000000000000000000000') {
        setChainlinkResolverAddress(resolver);
      }
    } else if (resolverAddress === '0x0000000000000000000000000000000000000000') {
      setCurrentResolver(null);
    }
  }, [resolverAddress]);

  // Load markets that can be resolved
  const loadResolvableMarkets = async () => {
    if (!publicClient || !addresses.core || !currentResolver || currentResolver === '0x0000000000000000000000000000000000000000') {
      setMarkets([]);
      return;
    }

    try {
      setLoadingMarkets(true);
      const { getMarketCount, getMarket } = await import('@/lib/hooks');
      const count = await getMarketCount();
      const now = Math.floor(Date.now() / 1000);

      const marketList: Array<{ id: number; question: string; expiryTimestamp: string; isResolved: boolean; expired: boolean }> = [];


      // Check up to 50 markets (to avoid too many calls)
      const maxMarkets = Number(count) > 50 ? 50 : Number(count);
      for (let i = 1; i <= maxMarkets; i++) {
        try {
          const market = await getMarket(BigInt(i));
          if (market && market.resolution) {
            const expiry = Number(market.resolution.expiryTimestamp);
            const isResolved = market.resolution.isResolved;
            const expired = expiry > 0 && expiry < now;

            // Only show markets that are expired but not resolved, and have Chainlink oracle
            if (expired && !isResolved && market.resolution.oracleType === 1) {
              marketList.push({
                id: i,
                question: market.question || `Market #${i}`,
                expiryTimestamp: market.resolution.expiryTimestamp.toString(),
                isResolved: false,
                expired: true,
              });
            }
          }
        } catch (e) {
          // Market doesn't exist or error reading, skip
          continue;
        }
      }

      setMarkets(marketList);
    } catch (e) {
      console.error('Error loading markets:', e);
      pushToast({ title: 'Error', description: 'Failed to load markets', type: 'error' });
    } finally {
      setLoadingMarkets(false);
    }
  };

  // Load markets when resolver is available
  useEffect(() => {
    if (currentResolver && currentResolver !== '0x0000000000000000000000000000000000000000' && isAdmin && publicClient) {
      loadResolvableMarkets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResolver, isAdmin, publicClient]);

  // Handle manual market resolution
  const handleResolveMarket = async (marketId: number) => {
    const pc = publicClient;
    if (!pc) {
      pushToast({ title: 'Error', description: 'Public client not initialized', type: 'error' });
      return;
    }
    if (!currentResolver || currentResolver === '0x0000000000000000000000000000000000000000') {
      pushToast({ title: 'Error', description: 'Chainlink resolver not registered', type: 'error' });
      return;
    }

    try {
      setResolvingMarketId(marketId);
      pushToast({ title: 'Searching Oracle', description: `Finding correct round for market #${marketId}...`, type: 'info' });

      // 1. Get market resolution config to find expiry and oracle address
      const { getMarket } = await import('@/lib/hooks');
      const market = await getMarket(BigInt(marketId));
      if (!market || !market.resolution) throw new Error("Market data not found");

      const expiry = BigInt(market.resolution.expiryTimestamp);
      const oracleAddr = market.resolution.oracleAddress;

      // 2. Find the first round after expiry
      // We'll use a simple search: start from latest and go back
      const aggregatorAbi = [
        { type: 'function', name: 'latestRoundData', inputs: [], outputs: [{ name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' }, { name: 'startedAt', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' }, { name: 'answeredInRound', type: 'uint80' }], stateMutability: 'view' },
        { type: 'function', name: 'getRoundData', inputs: [{ name: '_roundId', type: 'uint80' }], outputs: [{ name: 'roundId', type: 'uint80' }, { name: 'answer', type: 'int256' }, { name: 'startedAt', type: 'uint256' }, { name: 'updatedAt', type: 'uint256' }, { name: 'answeredInRound', type: 'uint80' }], stateMutability: 'view' }
      ] as const;

      const latest: any = await pc.readContract({
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
      pushToast({ title: 'Searching', description: 'Verifying historical price rounds...', type: 'info' });

      let found = false;
      for (let i = 0; i < 50; i++) { // Max 50 steps back
        const { phase, aggregatorRound } = parseRoundId(targetRoundId);

        // Check if we're at a phase boundary - cannot go back further
        if (aggregatorRound === 0) {
          throw new Error("Cannot resolve at phase boundary. Market may need manual resolution.");
        }

        // Construct previous round ID in the same phase
        const prevRoundId = constructRoundId(phase, aggregatorRound - 1);

        try {
          const prev: any = await pc.readContract({
            address: oracleAddr as `0x${string}`,
            abi: aggregatorAbi,
            functionName: 'getRoundData',
            args: [prevRoundId],
          });

          const prevUpdatedAt = prev[3];
          if (prevUpdatedAt < expiry) {
            found = true;
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

      if (!found) throw new Error("Could not find the exact transition round within 50 updates. Market might be too old.");

      // 3. Resolve with the found roundId
      pushToast({ title: 'Resolving Market', description: `Executing resolve with round ${targetRoundId.toString()}...`, type: 'info' });

      const hash = await resolveMarketAsync({
        address: currentResolver as `0x${string}`,
        abi: getChainlinkResolverAbi(getNetwork()),
        functionName: 'resolve',
        args: [BigInt(marketId), targetRoundId],
      });

      if (hash && pc) {
        try {
          const receipt = await pc.waitForTransactionReceipt({ hash });

          // Check if transaction failed
          if (receipt.status === 'reverted') {
            throw new Error('Transaction reverted. Check the transaction on block explorer for details.');
          }

          pushToast({ title: 'Success', description: `Market #${marketId} resolved deterministically!`, type: 'success' });
          await loadResolvableMarkets();
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
          if (errorData && pc) {
            const decoded = decodeErrorResult({
              abi: getChainlinkResolverAbi(getNetwork()),
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
      setResolvingMarketId(null);
    }
  };

  const handleAdd = async () => {
    if (!newAdminAddress || !publicClient) return;
    try {
      const addresses = getAddresses();

      // Grant DEFAULT_ADMIN_ROLE
      pushToast({ title: 'Granting Admin Role', description: 'Please confirm the transaction...', type: 'info' });
      const adminHash = await addAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'grantRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, newAdminAddress as `0x${string}`],
      });

      if (adminHash) {
        await publicClient.waitForTransactionReceipt({ hash: adminHash });
        pushToast({ title: 'Admin Role Granted', description: 'Now granting market creator role...', type: 'success' });
      }

      // Grant MARKET_CREATOR_ROLE
      const creatorHash = await addAdminAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'grantRole',
        args: [MARKET_CREATOR_ROLE as `0x${string}`, newAdminAddress as `0x${string}`],
      });

      if (creatorHash) {
        await publicClient.waitForTransactionReceipt({ hash: creatorHash });
        pushToast({ title: 'Success', description: 'Admin and market creator roles granted successfully!', type: 'success' });
        setNewAdminAddress(''); // Clear the input
      }
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message || 'Failed to grant roles', type: 'error' });
    }
  };

  const handleSetChainlinkResolver = async () => {
    if (!chainlinkResolverAddress || !publicClient) return;

    try {
      setIsCheckingResolver(true);
      const addresses = getAddresses();
      const network = getNetwork();

      if (network === 'testnet') {
        const minTimelockDelay = await publicClient.readContract({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'minTimelockDelay',
          args: [],
        }) as bigint;

        if (minTimelockDelay === 0n) {
          const OP_SET_RESOLVER = keccak256(stringToBytes('OP_SET_RESOLVER'));
          const resolverAddr = chainlinkResolverAddress as `0x${string}`;

          pushToast({ title: 'Scheduling Resolver', description: 'Scheduling resolver registration...', type: 'info' });

          const { encodeAbiParameters } = await import('viem');
          const encodedData = encodeAbiParameters(
            [{ type: 'address' }],
            [chainlinkResolverAddress as `0x${string}`]
          );

          const opId = await setChainlinkResolverAsync({
            address: addresses.core,
            abi: getCoreAbi(getCurrentNetwork()),
            functionName: 'scheduleOp',
            args: [OP_SET_RESOLVER, encodedData],
          });

          if (opId) {
            await publicClient.waitForTransactionReceipt({ hash: opId });
            pushToast({ title: 'Executing Resolver', description: 'Executing resolver registration...', type: 'info' });

            const executeHash = await setChainlinkResolverAsync({
              address: addresses.core,
              abi: getCoreAbi(getCurrentNetwork()),
              functionName: 'executeSetResolver',
              args: [opId, resolverAddr],
            });

            if (executeHash) {
              await publicClient.waitForTransactionReceipt({ hash: executeHash });
              pushToast({ title: 'Success', description: 'Chainlink resolver registered successfully', type: 'success' });
              refetchResolver();
            }
          }
        } else {
          pushToast({
            title: 'Timelock Required',
            description: `Testnet has a ${Number(minTimelockDelay)}s timelock. Please use contracts/script/ExecuteAfterDelay.s.sol after the delay.`,
            type: 'error',
          });
        }
      } else {
        const hash = await setChainlinkResolverAsync({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'setChainlinkResolver',
          args: [chainlinkResolverAddress as `0x${string}`],
        });
        if (hash) {
          pushToast({ title: 'Success', description: 'Chainlink resolver registration submitted', type: 'success' });
          refetchResolver();
        }
      }
    } catch (e: any) {
      console.error('Error setting resolver:', e);
      pushToast({ title: 'Error', description: e.message || 'Failed to set Chainlink resolver', type: 'error' });
    } finally {
      setIsCheckingResolver(false);
    }
  };

  const handleRegisterFeed = async (feedId?: string, feedAddr?: string) => {
    const feed = feedId || selectedFeed;
    const addr = feedAddr || feedAddress;

    if (!feed || !addr) {
      pushToast({ title: 'Error', description: 'Please select a feed and provide an address', type: 'error' });
      return;
    }

    try {
      const addresses = getAddresses();
      const feedIdHash = keccak256(stringToBytes(feed));

      pushToast({ title: 'Registering Feed', description: `Registering ${feed}...`, type: 'info' });

      const hash = await setGlobalFeedAsync({
        address: addresses.chainlinkResolver,
        abi: chainlinkResolverAbi,
        functionName: 'setGlobalFeed',
        args: [feedIdHash, addr as `0x${string}`],
      });

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        pushToast({ title: 'Success', description: `${feed} feed registered successfully!`, type: 'success' });
        setSelectedFeed('');
        setFeedAddress('');
      }
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message || 'Failed to register feed', type: 'error' });
    }
  };


  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-12"
      >
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" aria-hidden="true" />
        <span className="ml-3 text-sm font-medium text-gray-500" role="status">Checking admin access...</span>
      </motion.div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">

      {/* 1. Grant Admin Role */}
      <div className="space-y-2">
        <label htmlFor="admin-address" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">Grant Admin Role</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="admin-address"
              value={newAdminAddress}
              onChange={(e) => setNewAdminAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-purple-500"
              aria-label="New admin Ethereum address"
            />
            <AnimatePresence>
              {validAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button onClick={handleAdd} disabled={!validAddress} className="bg-purple-600 hover:bg-purple-700 text-white min-w-[100px]">
            <UserPlus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
        {newAdminAddress.length > 0 && !validAddress && (
          <p className="text-xs text-red-500 dark:text-red-400 ml-1">Invalid Ethereum address format</p>
        )}
      </div>

      {/* 2. Chainlink Resolver */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <label htmlFor="resolver-address" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
          Chainlink Resolver
          {currentResolver && currentResolver !== '0x0000000000000000000000000000000000000000' && (
            <span className="ml-2 text-green-600 dark:text-green-400 text-[10px] normal-case font-mono">
              (Current: {currentResolver.slice(0, 6)}...{currentResolver.slice(-4)})
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="resolver-address"
              value={chainlinkResolverAddress}
              onChange={(e) => setChainlinkResolverAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono pr-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-blue-500"
            />
            <AnimatePresence>
              {validResolverAddress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={handleSetChainlinkResolver}
            disabled={!validResolverAddress || isCheckingResolver}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
          >
            {isCheckingResolver ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
            Set
          </Button>
        </div>
      </div>

      {/* 3. Manual Resolution */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
            Manual Resolution (Expired)
          </label>
          <Button
            onClick={loadResolvableMarkets}
            disabled={loadingMarkets || !currentResolver || currentResolver === '0x0000000000000000000000000000000000000000'}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {loadingMarkets ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock className="w-3 h-3 mr-1" />}
            Refresh
          </Button>
        </div>

        {!currentResolver || currentResolver === '0x0000000000000000000000000000000000000000' ? (
          <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200">
            Resolver not registered.
          </div>
        ) : markets.length === 0 ? (
          <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No expired markets found.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {markets.map((market) => {
              const isResolving = resolvingMarketId === market.id;
              return (
                <div key={market.id} className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 rounded-lg p-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{market.id}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate max-w-[200px]">{market.question}</span>
                    </div>
                    <div className="text-[10px] text-red-500 dark:text-red-400 mt-1">
                      Expired: {new Date(Number(market.expiryTimestamp) * 1000).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleResolveMarket(market.id)}
                    disabled={isResolving}
                    size="sm"
                    className="bg-[#14B8A6] hover:bg-[#0D9488] text-white shrink-0 h-8 text-xs"
                  >
                    {isResolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}