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
import { Shield, UserPlus, X, Link, Database, Loader2, CheckCircle2 } from 'lucide-react';
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

  // Contracts hooks... (same logic as before)
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const MARKET_CREATOR_ROLE = keccak256(stringToBytes('MARKET_CREATOR_ROLE'));

  const { writeContractAsync: addAdminAsync } = useWriteContract();
  const { writeContract: removeAdmin } = useWriteContract();
  const { writeContract: setChainlinkResolver } = useWriteContract();
  const { writeContractAsync: setGlobalFeedAsync } = useWriteContract();

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
    if (!chainlinkResolverAddress) return;
    // Diamond Testnet uses timelocked executeSetResolver; no direct setter.
    if (getNetwork() === 'testnet') {
      pushToast({
        title: 'Not supported on Testnet',
        description: 'Testnet Diamond uses a 24h timelock. Use contracts/script/ExecuteAfterDelay.s.sol to activate resolver + facets.',
        type: 'error',
      });
      return;
    }
    try {
      const addresses = getAddresses();
      await setChainlinkResolver({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'setChainlinkResolver',
        args: [chainlinkResolverAddress as `0x${string}`],
      });
      pushToast({ title: 'Success', description: 'Chainlink resolver registration submitted', type: 'success' });
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message, type: 'error' });
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
          <label htmlFor="resolver-address" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">Register Chainlink Resolver</label>
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
            <Button onClick={handleSetChainlinkResolver} disabled={!validResolverAddress} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Register Chainlink resolver contract">
              <Link className="w-4 h-4 mr-2" aria-hidden="true" /> Register
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
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">Register Price Feeds</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
            Markets need their price feeds registered in ChainlinkResolver to be auto-resolved. Register feeds here.
          </p>

          {/* Quick register buttons for known feeds */}
          <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Quick feed registration">
            {KNOWN_FEEDS.map((feed, index) => (
              <motion.div
                key={feed.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <Button
                  onClick={() => handleRegisterFeed(feed.id, feed.address)}
                  variant="outline"
                  size="sm"
                  className="text-xs hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  aria-label={`Register ${feed.id} price feed`}
                >
                  <Database className="w-3 h-3 mr-1" aria-hidden="true" />
                  {feed.id}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Manual feed registration */}
          <div className="space-y-2">
            <Input
              id="feed-id"
              value={selectedFeed}
              onChange={(e) => setSelectedFeed(e.target.value)}
              placeholder="Feed ID (e.g., BTC/USD, ETH/USD)"
              className="font-mono text-sm"
              aria-label="Custom price feed ID"
            />
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  id="feed-address"
                  value={feedAddress}
                  onChange={(e) => setFeedAddress(e.target.value)}
                  placeholder="Chainlink feed address (0x...)"
                  className="font-mono pr-10"
                  aria-label="Custom price feed contract address"
                  aria-invalid={feedAddress.length > 0 && !validFeedAddress}
                  aria-describedby={feedAddress.length > 0 && !validFeedAddress ? "feed-address-error" : undefined}
                />
                <AnimatePresence>
                  {validFeedAddress && (
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
              <Button onClick={() => handleRegisterFeed()} disabled={!selectedFeed || !validFeedAddress} className="bg-green-600 hover:bg-green-700 text-white min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Register custom price feed">
                <Database className="w-4 h-4 mr-2" aria-hidden="true" /> Register
              </Button>
            </div>
            {feedAddress.length > 0 && !validFeedAddress && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                id="feed-address-error"
                className="text-xs text-red-600 dark:text-red-400 mt-1.5 ml-1"
                role="alert"
              >
                Invalid Ethereum address format
              </motion.p>
            )}
          </div>
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