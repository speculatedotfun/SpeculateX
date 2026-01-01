'use client';
import { useEffect, useState, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { getAddresses, getNetwork } from '@/lib/contracts';
import { getCoreAbi } from '@/lib/abis';
import { formatUnits, encodeAbiParameters, keccak256, stringToBytes } from 'viem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { CheckCircle, XCircle, DollarSign, Trophy, Activity, Zap, Loader2, Search, Filter, ArrowUpDown } from 'lucide-react';
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
  status: 'active' | 'resolved' | 'expired' | 'scheduled';
  startTime: bigint;
  vault: number;
  residual: number;
  yesWins: boolean;
  isResolved: boolean;
  winningSupply: bigint;
}

type SortField = 'id' | 'vault';
type SortOrder = 'asc' | 'desc';

export default function AdminMarketManager({ markets }: { markets: Market[] }) {
  const { data: hash, writeContract, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { pushToast } = useToast();
  const publicClient = usePublicClient();
  const addresses = getAddresses();
  const network = getNetwork();
  const coreAbiForNetwork = getCoreAbi(network);

  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'expired' | 'scheduled'>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter & Sort
  const filteredMarkets = useMemo(() => {
    let res = markets.filter(m => {
      if (filter !== 'all' && m.status !== filter) return false;
      if (search && !m.question.toLowerCase().includes(search.toLowerCase()) && !m.id.toString().includes(search)) return false;
      return true;
    });

    return res.sort((a, b) => {
      const aVal = sortField === 'id' ? a.id : a.vault;
      const bVal = sortField === 'id' ? b.id : b.vault;
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [markets, filter, search, sortField, sortOrder]);

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

  // ... (Keep existing Chainlink logic helpers) ...
  const handleRegisterFeedForMarket = async (marketId: number) => {
    try {
      if (!publicClient) throw new Error('Public client not available');
      pushToast({ title: 'Checking Market', description: `Getting feed info for market #${marketId}...`, type: 'info' });
      const resolution = await publicClient.readContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'getMarketResolution',
        args: [BigInt(marketId)],
      }) as any;
      const priceFeedId = resolution.priceFeedId as `0x${string}`;
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
        pushToast({ title: 'Unknown Feed', description: `Feed ID ${priceFeedId.slice(0, 10)}... not found.`, type: 'error' });
        return;
      }
      const hash = await writeContractAsync({
        address: addresses.chainlinkResolver,
        abi: chainlinkResolverAbi,
        functionName: 'setGlobalFeed',
        args: [priceFeedId, feedAddress as `0x${string}`],
      });
      if (hash) {
        pushToast({ title: 'Success', description: `${feedIdString} feed registered!`, type: 'success' });
      }
    } catch (e: any) {
      console.error(e);
      pushToast({ title: 'Error', description: e.message || 'Failed to register feed', type: 'error' });
    }
  };

  const handleTriggerChainlinkResolution = async (marketId: number) => {
    try {
      pushToast({ title: 'Resolving...', description: `Resolving market #${marketId}...`, type: 'info' });
      const performData = encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }], [BigInt(marketId), BigInt(marketId + 1)]);
      const hash = await writeContractAsync({
        address: addresses.chainlinkResolver,
        abi: chainlinkResolverAbi,
        functionName: 'performUpkeep',
        args: [performData],
      });
      if (hash) pushToast({ title: 'Success', description: `Resolution triggered!`, type: 'success' });
    } catch (e: any) {
      console.error(e);
      pushToast({ title: 'Error', description: e.message || 'Failed to trigger resolution', type: 'error' });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      pushToast({ title: 'Confirmed', description: 'Transaction successful.', type: 'success' });
      setTimeout(() => window.location.reload(), 2000);
    }
  }, [isSuccess, pushToast]);

  if (network === 'testnet') return null;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 p-1 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-white/5">
          {['all', 'active', 'resolved', 'expired', 'scheduled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f
                ? 'bg-[#14B8A6] text-white shadow-lg'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-[#14B8A6] text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Data Grid */}
      <div className="min-h-[400px] overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-gray-900/20 backdrop-blur-sm shadow-sm dark:shadow-none">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
              <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => { setSortField('id'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                <div className="flex items-center gap-2">ID <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Question</th>
              <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => { setSortField('vault'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                <div className="flex items-center gap-2">Vault <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredMarkets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500 dark:text-gray-500">
                    No markets found
                  </td>
                </tr>
              ) : (
                filteredMarkets.map((market) => (
                  <motion.tr
                    key={market.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4 font-mono text-gray-500 dark:text-gray-400 text-sm">#{market.id}</td>
                    <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-200 max-w-md">{market.question}</td>
                    <td className="p-4">
                      <Badge variant={market.status === 'active' ? 'default' : market.status === 'resolved' ? 'secondary' : 'outline'} className="uppercase text-[10px]">
                        {market.status}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-[#14B8A6]">${market.vault.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        {market.status === 'active' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-400/10" onClick={() => handleResolve(market.id, true)} disabled={isPending}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/10" onClick={() => handleResolve(market.id, false)} disabled={isPending}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {market.status === 'resolved' && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${market.yesWins ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {market.yesWins ? 'YES WON' : 'NO WON'}
                            </span>
                            {market.residual > 0 && (
                              <Button size="xs" variant="outline" className="h-7 text-[10px] border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleFinalize(market.id)}>
                                Claim ${market.residual.toFixed(0)}
                              </Button>
                            )}
                          </div>
                        )}
                        {market.status === 'expired' && (
                          <Button size="sm" className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white" onClick={() => handleTriggerChainlinkResolution(market.id)}>
                            Resolve
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}