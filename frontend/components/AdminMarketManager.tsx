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
import { CRYPTO_ASSETS } from '@/lib/assets';

const chainlinkResolverAbi = Array.isArray(chainlinkResolverAbiData)
  ? chainlinkResolverAbiData
  : (chainlinkResolverAbiData as any).abi || chainlinkResolverAbiData;


interface Market {
  id: number;
  question: string;
  status: 'active' | 'resolved' | 'expired' | 'scheduled';
  startTime: string;
  vault: number;
  residual: number;
  yesWins: boolean;
  isResolved: boolean;
  winningSupply: string;
  targetValue: string;
  comparison: number;
}


type SortField = 'id' | 'vault' | 'status' | 'startTime';

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
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [markets, filter, search, sortField, sortOrder]);

  const handleResolve = (market: Market, yesWins: boolean) => {
    // 0: >, 1: <, 2: >=, 3: <=, 4: ==
    let price: bigint;

    // Logic to force YES to win:
    // If > (0): price = target + 1
    // If < (1): price = target - 1
    // If >= (2): price = target
    // If <= (3): price = target
    // If == (4): price = target

    // Logic to force NO to win:
    // If > (0): price = target
    // If < (1): price = target
    // If >= (2): price = target - 1
    // If <= (3): price = target + 1
    // If == (4): price = target + 1

    const targetValue = BigInt(market.targetValue);
    const comparison = market.comparison;

    if (yesWins) {
      switch (comparison) {
        case 0: price = targetValue + 1n; break;
        case 1: price = targetValue - 1n; break;
        case 2: price = targetValue; break;
        case 3: price = targetValue; break;
        case 4: price = targetValue; break;
        default: price = targetValue + 1n;
      }
    } else {
      switch (comparison) {
        case 0: price = targetValue; break; // target is NOT > target
        case 1: price = targetValue; break; // target is NOT < target
        case 2: price = targetValue - 1n; break;
        case 3: price = targetValue + 1n; break;
        case 4: price = targetValue + 1n; break;
        default: price = targetValue;
      }
    }


    writeContract({
      address: addresses.core,
      abi: coreAbiForNetwork,
      functionName: 'resolveMarketWithPrice',
      args: [BigInt(market.id), price],
    });
  };

  const handleFinalize = (id: number) => {
    // Note: Residual is automatically finalized when market is resolved
    // This function is kept for backwards compatibility but does nothing
    // The residual is already finalized in _finalizeMarket() when resolveMarketWithPrice() is called
    pushToast({
      title: 'Info',
      description: 'Residual is automatically finalized when market is resolved. No action needed.',
      type: 'info'
    });
  };

  // ... (Keep existing Chainlink logic helpers) ...
  const handleRegisterFeedForMarket = async (marketId: number) => {
    try {
      if (!publicClient) throw new Error('Public client not available');
      pushToast({ title: 'Checking Market', description: `Getting feed info for market #${marketId}...`, type: 'info' });

      // 1. Get market resolution info to find priceFeedId
      const resolution = await publicClient.readContract({
        address: addresses.core,
        abi: coreAbiForNetwork,
        functionName: 'getMarketResolution',
        args: [BigInt(marketId)],
      }) as any;

      const priceFeedId = resolution.priceFeedId as `0x${string}`;
      let selectedAsset = null;
      let feedAddress: string | undefined = undefined;

      // 2. Look up the asset in our known list
      for (const asset of CRYPTO_ASSETS) {
        const hash = keccak256(stringToBytes(asset.feedId));
        if (hash.toLowerCase() === priceFeedId.toLowerCase()) {
          selectedAsset = asset;
          feedAddress = network === 'testnet' ? asset.testnetFeed : asset.mainnetFeed;
          break;
        }
      }

      if (!selectedAsset || !feedAddress) {
        pushToast({ title: 'Unknown Feed', description: `Feed ID ${priceFeedId.slice(0, 10)}... not found in our directory.`, type: 'error' });
        return;
      }

      // 3. Register it in the resolver
      const hash = await writeContractAsync({
        address: addresses.chainlinkResolver,
        abi: chainlinkResolverAbi,
        functionName: 'setGlobalFeed',
        args: [priceFeedId, feedAddress as `0x${string}`],
      });

      if (hash) {
        pushToast({ title: 'Success', description: `${selectedAsset.symbol} feed registered!`, type: 'success' });
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

  // Removed testnet guard to allow admin management on testnet

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
              <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => { setSortField('status'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                <div className="flex items-center gap-2">Status <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => { setSortField('vault'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                <div className="flex items-center gap-2">Stats <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white text-right" onClick={() => { setSortField('startTime'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                <div className="flex items-center justify-end gap-2">Schedule <ArrowUpDown className="w-3 h-3" /></div>
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
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-[#14B8A6] text-sm">${market.vault.toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          Target: {market.comparison === 0 ? '>' : market.comparison === 1 ? '<' : market.comparison === 2 ? '>=' : market.comparison === 3 ? '<=' : '=='} ${Number(formatUnits(BigInt(market.targetValue), 8)).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          {Number(market.startTime) > 0 ? `Start: ${new Date(Number(market.startTime) * 1000).toLocaleDateString('en-US')}` : 'Immediate'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {market.status === 'scheduled' ? `Trading begins ${new Date(Number(market.startTime) * 1000).toLocaleTimeString()}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">

                      <div className="flex items-center justify-end gap-2">
                        {/* Feed Info / Registration */}
                        {market.status !== 'resolved' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/10"
                            onClick={() => handleRegisterFeedForMarket(market.id)}
                            title="Register/Update Feed"
                          >
                            <Zap className="w-4 h-4" />
                          </Button>
                        )}

                        {(market.status === 'active' || market.status === 'expired') && (

                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-400/10" onClick={() => handleResolve(market, true)} disabled={isPending}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-400/10" onClick={() => handleResolve(market, false)} disabled={isPending}>
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
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                ${market.residual.toFixed(2)} residual
                              </span>
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
