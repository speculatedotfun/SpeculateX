'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { keccak256, stringToBytes } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Shield, UserPlus, X, Link, Database } from 'lucide-react';
import chainlinkResolverAbiData from '@/lib/abis/ChainlinkResolver.json';
const chainlinkResolverAbi = Array.isArray(chainlinkResolverAbiData) 
  ? chainlinkResolverAbiData 
  : (chainlinkResolverAbiData as any).abi || chainlinkResolverAbiData;

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
      checkIsAdmin(address).then(setIsAdmin);
    }
  }, [address]);

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

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div className="text-sm text-purple-900 dark:text-purple-100">
            <p className="font-bold">Super Admin Access</p>
            <p className="opacity-80 leading-relaxed">Admins can create markets, resolve disputes, manage liquidity, and grant admin privileges to others.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">Grant Admin Role</label>
           <div className="flex gap-3">
             <Input
               value={newAdminAddress}
               onChange={(e) => setNewAdminAddress(e.target.value)}
               placeholder="0x..."
               className="font-mono"
             />
             <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]">
               <UserPlus className="w-4 h-4 mr-2" /> Add
             </Button>
           </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">Register Chainlink Resolver</label>
          <div className="flex gap-3">
            <Input
              value={chainlinkResolverAddress}
              onChange={(e) => setChainlinkResolverAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono"
            />
            <Button onClick={handleSetChainlinkResolver} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
              <Link className="w-4 h-4 mr-2" /> Register
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">Register Price Feeds</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Markets need their price feeds registered in ChainlinkResolver to be auto-resolved. Register feeds here.
          </p>
          
          {/* Quick register buttons for known feeds */}
          <div className="flex flex-wrap gap-2 mb-3">
            {KNOWN_FEEDS.map((feed) => (
              <Button
                key={feed.id}
                onClick={() => handleRegisterFeed(feed.id, feed.address)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Database className="w-3 h-3 mr-1" />
                {feed.id}
              </Button>
            ))}
          </div>

          {/* Manual feed registration */}
          <div className="space-y-2">
            <Input
              value={selectedFeed}
              onChange={(e) => setSelectedFeed(e.target.value)}
              placeholder="Feed ID (e.g., BTC/USD, ETH/USD)"
              className="font-mono text-sm"
            />
            <div className="flex gap-3">
              <Input
                value={feedAddress}
                onChange={(e) => setFeedAddress(e.target.value)}
                placeholder="Chainlink feed address (0x...)"
                className="font-mono"
              />
              <Button onClick={() => handleRegisterFeed()} className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]">
                <Database className="w-4 h-4 mr-2" /> Register
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Current Admins</h4>
          {currentAdmins.map((admin) => (
             <div key={admin} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                   {admin.slice(2, 4)}
                 </div>
                 <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                   {admin.slice(0, 6)}...{admin.slice(-4)}
                 </span>
               </div>
               <button className="text-gray-400 hover:text-red-500 transition-colors p-1">
                 <X className="w-4 h-4" />
               </button>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}