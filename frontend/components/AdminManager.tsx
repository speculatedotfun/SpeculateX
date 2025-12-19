'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { getAddresses, getCurrentNetwork, getNetwork } from '@/lib/contracts';
import { getCoreAbi, getChainlinkResolverAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { keccak256, stringToBytes } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Shield, UserPlus, X, Link, Database, Loader2, CheckCircle2, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [markets, setMarkets] = useState<Array<{ id: number; question: string; expiryTimestamp: bigint; isResolved: boolean; expired: boolean }>>([]);
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

  // BSC Chapel Testnet Chainlink feed addresses
  const KNOWN_FEEDS = [
    { id: 'BTC/USD', address: '0x5741306c21795FdCBb9b265Ea0255F499DFe515C' },
    { id: 'ETH/USD', address: '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7' },
    { id: 'BNB/USD', address: '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526' },
  ];

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
      
      const marketList: Array<{ id: number; question: string; expiryTimestamp: bigint; isResolved: boolean; expired: boolean }> = [];
      
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
                expiryTimestamp: market.resolution.expiryTimestamp,
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
        { type: 'function', name: 'latestRoundData', inputs: [], outputs: [{name:'roundId',type:'uint80'},{name:'answer',type:'int256'},{name:'startedAt',type:'uint256'},{name:'updatedAt',type:'uint256'},{name:'answeredInRound',type:'uint80'}], stateMutability: 'view' },
        { type: 'function', name: 'getRoundData', inputs: [{name:'_roundId',type:'uint80'}], outputs: [{name:'roundId',type:'uint80'},{name:'answer',type:'int256'},{name:'startedAt',type:'uint256'},{name:'updatedAt',type:'uint256'},{name:'answeredInRound',type:'uint80'}], stateMutability: 'view' }
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

      // Linear search backwards (usually only a few steps needed for recent markets)
      pushToast({ title: 'Searching', description: 'Verifying historical price rounds...', type: 'info' });
      
      let found = false;
      for (let i = 0; i < 50; i++) { // Max 50 steps back
        const prev: any = await pc.readContract({
          address: oracleAddr as `0x${string}`,
          abi: aggregatorAbi,
          functionName: 'getRoundData',
          args: [targetRoundId - 1n],
        });
        
        const prevUpdatedAt = prev[3];
        if (prevUpdatedAt < expiry) {
          found = true;
          break; // targetRoundId is the first one after expiry
        }
        targetRoundId -= 1n;
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
        await pc.waitForTransactionReceipt({ hash });
        pushToast({ title: 'Success', description: `Market #${marketId} resolved deterministically!`, type: 'success' });
        await loadResolvableMarkets();
      }
    } catch (e: any) {
      console.error('Error resolving market:', e);
      const errorMsg = e.message || 'Failed to resolve market';
      pushToast({ title: 'Error', description: errorMsg, type: 'error' });
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
        // Testnet: Check if timelock is 0, if so we can schedule and execute immediately
        const minTimelockDelay = await publicClient.readContract({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'minTimelockDelay',
          args: [],
        }) as bigint;

        if (minTimelockDelay === 0n) {
          // Timelock is 0, so we can schedule and execute in one flow
          const OP_SET_RESOLVER = keccak256(stringToBytes('OP_SET_RESOLVER'));
          const resolverAddr = chainlinkResolverAddress as `0x${string}`;
          
          pushToast({ title: 'Scheduling Resolver', description: 'Scheduling resolver registration...', type: 'info' });
          
          // Schedule the operation (encode the address)
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

          // Wait for transaction
          if (opId) {
            await publicClient.waitForTransactionReceipt({ hash: opId });
            
            // Execute immediately (timelock is 0)
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
        // Mainnet: Direct setter (if it exists)
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
    if (getNetwork() === 'testnet') {
      pushToast({
        title: 'Not supported on Testnet',
        description: 'New Testnet resolver has no feed registry. Each market stores the Chainlink feed address directly.',
        type: 'error',
      });
      return;
    }
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
        <span className="ml-3 text-sm font-medium text-gray-600 dark:text-gray-400" role="status">Checking admin access...</span>
      </motion.div>
    );
  }

  if (!isAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-5 shadow-sm"
        role="region"
        aria-label="Admin access information"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
          </div>
          <div className="text-sm text-purple-900 dark:text-purple-100">
            <p className="font-bold mb-1">Super Admin Access</p>
            <p className="opacity-80 leading-relaxed">Admins can create markets, resolve disputes, manage liquidity, and grant admin privileges to others.</p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
           <label htmlFor="admin-address" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">Grant Admin Role</label>
           <div className="flex gap-3">
             <div className="relative flex-1">
               <Input
                 id="admin-address"
                 value={newAdminAddress}
                 onChange={(e) => setNewAdminAddress(e.target.value)}
                 placeholder="0x..."
                 className="font-mono pr-10"
                 aria-label="New admin Ethereum address"
                 aria-invalid={newAdminAddress.length > 0 && !validAddress}
                 aria-describedby={newAdminAddress.length > 0 && !validAddress ? "admin-address-error" : undefined}
               />
               <AnimatePresence>
                 {validAddress && (
                   <motion.div
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0, opacity: 0 }}
                     className="absolute right-3 top-1/2 -translate-y-1/2"
                   >
                     <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
             <Button onClick={handleAdd} disabled={!validAddress} className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Grant admin and market creator roles">
               <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" /> Add
             </Button>
           </div>
           {newAdminAddress.length > 0 && !validAddress && (
             <motion.p
               initial={{ opacity: 0, y: -5 }}
               animate={{ opacity: 1, y: 0 }}
               id="admin-address-error"
               className="text-xs text-red-600 dark:text-red-400 mt-1.5 ml-1"
               role="alert"
             >
               Invalid Ethereum address format
             </motion.p>
           )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label htmlFor="resolver-address" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">
            Register Chainlink Resolver
            {currentResolver && currentResolver !== '0x0000000000000000000000000000000000000000' && (
              <span className="ml-2 text-green-600 dark:text-green-400 text-[10px] normal-case font-normal">
                (Currently: {currentResolver.slice(0, 6)}...{currentResolver.slice(-4)})
              </span>
            )}
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                id="resolver-address"
                value={chainlinkResolverAddress}
                onChange={(e) => setChainlinkResolverAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono pr-10"
                aria-label="Chainlink resolver contract address"
                aria-invalid={chainlinkResolverAddress.length > 0 && !validResolverAddress}
                aria-describedby={chainlinkResolverAddress.length > 0 && !validResolverAddress ? "resolver-address-error" : undefined}
              />
              <AnimatePresence>
                {validResolverAddress && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button 
              onClick={handleSetChainlinkResolver} 
              disabled={!validResolverAddress || isCheckingResolver} 
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed" 
              aria-label="Register Chainlink resolver contract"
            >
              {isCheckingResolver ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> Setting...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" aria-hidden="true" /> Register
                </>
              )}
            </Button>
          </div>
          {chainlinkResolverAddress.length > 0 && !validResolverAddress && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              id="resolver-address-error"
              className="text-xs text-red-600 dark:text-red-400 mt-1.5 ml-1"
              role="alert"
            >
              Invalid Ethereum address format
            </motion.p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 block">
              Manual Market Resolution
            </label>
            <Button
              onClick={loadResolvableMarkets}
              disabled={loadingMarkets || !currentResolver || currentResolver === '0x0000000000000000000000000000000000000000'}
              variant="outline"
              size="sm"
              className="text-xs"
              aria-label="Refresh markets list"
            >
              {loadingMarkets ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" aria-hidden="true" />
              ) : (
                <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
              )}
              Refresh
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
            Manually resolve expired Chainlink markets. Markets must be expired and not yet resolved.
          </p>

          {!currentResolver || currentResolver === '0x0000000000000000000000000000000000000000' ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200">
              Chainlink resolver not registered. Please register it above first.
            </div>
          ) : loadingMarkets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" aria-hidden="true" />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading markets...</span>
            </div>
          ) : markets.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No expired markets ready for resolution.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {markets.map((market, index) => {
                const expiryDate = new Date(Number(market.expiryTimestamp) * 1000);
                const isResolving = resolvingMarketId === market.id;
                
                return (
                  <motion.div
                    key={market.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">#{market.id}</span>
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">Expired</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={market.question}>
                        {market.question}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Expired: {expiryDate.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleResolveMarket(market.id)}
                      disabled={isResolving}
                      size="sm"
                      className="bg-[#14B8A6] hover:bg-[#0D9488] text-white shrink-0 disabled:opacity-50"
                      aria-label={`Resolve market #${market.id}`}
                    >
                      {isResolving ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" aria-hidden="true" />
                          Resolving...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1" aria-hidden="true" />
                          Resolve
                        </>
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700"
        >
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Current Admins</h4>
          {currentAdmins.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No admins listed</p>
          ) : (
            <div className="space-y-2" role="list" aria-label="Current administrators">
              {currentAdmins.map((admin, index) => (
                <motion.div
                  key={admin}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                  role="listitem"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm" aria-hidden="true">
                      {admin.slice(2, 4).toUpperCase()}
                    </div>
                    <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                      {admin.slice(0, 6)}...{admin.slice(-4)}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label={`Remove admin ${admin}`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}