'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { keccak256, stringToBytes, encodeAbiParameters, parseUnits, decodeEventLog } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { 
  Settings, Loader2, CheckCircle2, Clock, AlertTriangle, 
  Shield, Database, Wallet, Zap, Pause, Play, Trash2,
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============ Types ============
interface ScheduledOp {
  opId: `0x${string}`;
  tag: string;
  tagName: string;
  readyAt: bigint;
  scheduledAt: bigint;
  status: 'scheduled' | 'ready' | 'executed' | 'expired' | 'cancelled';
  data: `0x${string}`;
  description: string;
}

// ============ Constants ============
const OP_TAGS = {
  OP_SET_FACET: keccak256(stringToBytes('OP_SET_FACET')),
  OP_REMOVE_FACET: keccak256(stringToBytes('OP_REMOVE_FACET')),
  OP_SET_TREASURY: keccak256(stringToBytes('OP_SET_TREASURY')),
  OP_SET_RESOLVER: keccak256(stringToBytes('OP_SET_RESOLVER')),
  OP_PAUSE: keccak256(stringToBytes('OP_PAUSE')),
  OP_UNPAUSE: keccak256(stringToBytes('OP_UNPAUSE')),
  OP_RECOVER_ETH: keccak256(stringToBytes('OP_RECOVER_ETH')),
  OP_CANCEL_MARKET: keccak256(stringToBytes('OP_CANCEL_MARKET')),
} as const;

const TAG_NAMES: Record<string, string> = {
  [OP_TAGS.OP_SET_FACET]: 'Set Facet',
  [OP_TAGS.OP_REMOVE_FACET]: 'Remove Facet',
  [OP_TAGS.OP_SET_TREASURY]: 'Set Treasury',
  [OP_TAGS.OP_SET_RESOLVER]: 'Set Resolver',
  [OP_TAGS.OP_PAUSE]: 'Pause',
  [OP_TAGS.OP_UNPAUSE]: 'Unpause',
  [OP_TAGS.OP_RECOVER_ETH]: 'Recover ETH',
  [OP_TAGS.OP_CANCEL_MARKET]: 'Cancel Market',
};

const OP_EXPIRY_WINDOW = 7n * 24n * 60n * 60n; // 7 days in seconds

export default function AdminOperationsManager() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'router' | 'treasury' | 'emergency'>('pending');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Pending Operations
  const [pendingOps, setPendingOps] = useState<ScheduledOp[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [currentTime, setCurrentTime] = useState(BigInt(Math.floor(Date.now() / 1000)));
  const [deploymentBlock, setDeploymentBlock] = useState<string>(''); // Optional: specify deployment block
  const [searchedFromBlock, setSearchedFromBlock] = useState<bigint>(0n);
  
  // Form States - separate for each operation type
  const [setFacetForm, setSetFacetForm] = useState({ selector: '', address: '' });
  const [removeFacetForm, setRemoveFacetForm] = useState({ selector: '' });
  const [treasuryForm, setTreasuryForm] = useState({ address: '' });
  const [resolverForm, setResolverForm] = useState({ address: '' });
  const [ethRecoveryForm, setEthRecoveryForm] = useState({ address: '' });
  const [cancelMarketForm, setCancelMarketForm] = useState({ marketId: '' });
  const [largeWithdrawForm, setLargeWithdrawForm] = useState({ token: '', to: '', amount: '' });
  const [dailyLimitForm, setDailyLimitForm] = useState({ limit: '' });
  
  const addresses = getAddresses();
  const network = getCurrentNetwork();
  const coreAbi = getCoreAbi(network);
  const { writeContractAsync } = useWriteContract();

  // ============ Admin Check ============
  useEffect(() => {
    if (address) {
      checkIsAdmin(address).then(setIsAdmin);
    }
  }, [address]);

  // ============ Load Pending Operations ============
  const loadPendingOperations = useCallback(async () => {
    if (!publicClient || !addresses.core) return;
    setLoadingOps(true);

    try {
      // Get OperationScheduled events
      // Now using Ankr RPC - much more reliable than public BSC RPC!
      const currentBlock = await publicClient.getBlockNumber();

      // Allow manual deployment block override for searching older operations
      // Default deployment block for mainnet deployment: 73210707
      const safeFromBlock = deploymentBlock && deploymentBlock.trim()
        ? BigInt(deploymentBlock.trim())
        : 73210700n; // Slightly before actual deployment block

      // Ankr RPC limit: 1000 blocks max for eth_getLogs
      const maxRange = 1_000n;
      const safeToBlock = safeFromBlock + maxRange > currentBlock
        ? currentBlock
        : safeFromBlock + maxRange;

      setSearchedFromBlock(safeFromBlock); // Store for display

      console.log(`Querying operations from block ${safeFromBlock} to ${safeToBlock} (${safeToBlock - safeFromBlock} blocks) using Ankr RPC`);

      const scheduledLogs = await publicClient.getLogs({
        address: addresses.core,
        event: {
          type: 'event',
          name: 'OperationScheduled',
          inputs: [
            { type: 'bytes32', name: 'opId', indexed: true },
            { type: 'bytes32', name: 'tag', indexed: true },
            { type: 'uint256', name: 'readyAt', indexed: false },
          ],
        },
        fromBlock: safeFromBlock,
        toBlock: safeToBlock,
      });

      console.log(`Found ${scheduledLogs.length} OperationScheduled events`);

      const executedLogs = await publicClient.getLogs({
        address: addresses.core,
        event: {
          type: 'event',
          name: 'OperationExecuted',
          inputs: [
            { type: 'bytes32', name: 'opId', indexed: true },
          ],
        },
        fromBlock: safeFromBlock,
        toBlock: safeToBlock,
      });

      const cancelledLogs = await publicClient.getLogs({
        address: addresses.core,
        event: {
          type: 'event',
          name: 'OperationCancelled',
          inputs: [
            { type: 'bytes32', name: 'opId', indexed: true },
          ],
        },
        fromBlock: safeFromBlock,
        toBlock: safeToBlock,
      });

      const executedIds = new Set(executedLogs.map(l => l.topics[1]));
      const cancelledIds = new Set(cancelledLogs.map(l => l.topics[1]));
      const now = BigInt(Math.floor(Date.now() / 1000));

      const ops: ScheduledOp[] = await Promise.all(
        scheduledLogs.map(async (log) => {
          const opId = log.topics[1] as `0x${string}`;
          const tag = log.topics[2] as `0x${string}`;
          const readyAt = BigInt(log.data);

          // Get block timestamp for scheduledAt
          let scheduledAt = readyAt - 172800n; // Default: 48 hours before readyAt
          try {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            scheduledAt = block.timestamp;
          } catch (e) {
            console.warn('Could not fetch block timestamp:', e);
          }

          let status: ScheduledOp['status'] = 'scheduled';
          if (executedIds.has(opId)) status = 'executed';
          else if (cancelledIds.has(opId)) status = 'cancelled';
          else if (now > readyAt + OP_EXPIRY_WINDOW) status = 'expired';
          else if (now >= readyAt) status = 'ready';

          return {
            opId,
            tag,
            tagName: TAG_NAMES[tag] || 'Unknown',
            readyAt,
            scheduledAt,
            status,
            data: '0x' as `0x${string}`,
            description: TAG_NAMES[tag] || 'Unknown Operation',
          };
        })
      );

      setPendingOps(ops.filter(op => op.status === 'scheduled' || op.status === 'ready'));
    } catch (e) {
      console.error('Error loading operations:', e);
      pushToast({ title: 'Error', description: 'Failed to load pending operations', type: 'error' });
    } finally {
      setLoadingOps(false);
    }
  }, [publicClient, addresses.core, pushToast]);

  useEffect(() => {
    if (isAdmin) {
      loadPendingOperations();
    }
  }, [isAdmin, loadPendingOperations]);

  // Live countdown timer - updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(BigInt(Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ============ Helper: Schedule Operation ============
  const scheduleOperation = async (
    tag: `0x${string}`,
    data: `0x${string}`,
    successMessage: string
  ): Promise<`0x${string}` | null> => {
    if (!publicClient) return null;
    setLoading(true);
    
    try {
      const hash = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'scheduleOp',
        args: [tag, data],
      });
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Extract opId from event
      const scheduledEvent = receipt.logs.find(log => 
        log.topics[0] === keccak256(stringToBytes('OperationScheduled(bytes32,bytes32,uint256)'))
      );
      
      if (scheduledEvent) {
        const opId = scheduledEvent.topics[1] as `0x${string}`;
        pushToast({ 
          title: 'Scheduled', 
          description: `${successMessage} OpId: ${opId.slice(0, 10)}...`, 
          type: 'success' 
        });
        loadPendingOperations();
        return opId;
      }
      
      pushToast({ title: 'Success', description: successMessage, type: 'success' });
      return null;
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.shortMessage || e.message, type: 'error' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ============ Router Operations ============
  const handleScheduleSetFacet = async () => {
    if (!setFacetForm.selector || !setFacetForm.address) return;
    const data = encodeAbiParameters(
      [{ type: 'bytes4' }, { type: 'address' }],
      [setFacetForm.selector as `0x${string}`, setFacetForm.address as `0x${string}`]
    );
    await scheduleOperation(OP_TAGS.OP_SET_FACET as `0x${string}`, data, 'Facet registration scheduled');
    setSetFacetForm({ selector: '', address: '' });
  };

  const handleScheduleRemoveFacet = async () => {
    if (!removeFacetForm.selector) return;
    const data = encodeAbiParameters(
      [{ type: 'bytes4' }],
      [removeFacetForm.selector as `0x${string}`]
    );
    await scheduleOperation(OP_TAGS.OP_REMOVE_FACET as `0x${string}`, data, 'Facet removal scheduled');
    setRemoveFacetForm({ selector: '' });
  };

  const handleScheduleSetTreasury = async () => {
    if (!treasuryForm.address) return;
    const data = encodeAbiParameters(
      [{ type: 'address' }],
      [treasuryForm.address as `0x${string}`]
    );
    await scheduleOperation(OP_TAGS.OP_SET_TREASURY as `0x${string}`, data, 'Treasury update scheduled');
    setTreasuryForm({ address: '' });
  };

  const handleScheduleSetResolver = async () => {
    if (!resolverForm.address) return;
    const data = encodeAbiParameters(
      [{ type: 'address' }],
      [resolverForm.address as `0x${string}`]
    );
    await scheduleOperation(OP_TAGS.OP_SET_RESOLVER as `0x${string}`, data, 'Resolver update scheduled');
    setResolverForm({ address: '' });
  };

  const handleSchedulePause = async () => {
    await scheduleOperation(
      OP_TAGS.OP_PAUSE as `0x${string}`, 
      '0x' as `0x${string}`, 
      'Pause scheduled'
    );
  };

  const handleScheduleUnpause = async () => {
    await scheduleOperation(
      OP_TAGS.OP_UNPAUSE as `0x${string}`, 
      '0x' as `0x${string}`, 
      'Unpause scheduled'
    );
  };

  const handleScheduleRecoverETH = async () => {
    if (!ethRecoveryForm.address) return;
    const data = encodeAbiParameters(
      [{ type: 'address' }],
      [ethRecoveryForm.address as `0x${string}`]
    );
    await scheduleOperation(OP_TAGS.OP_RECOVER_ETH as `0x${string}`, data, 'ETH recovery scheduled');
    setEthRecoveryForm({ address: '' });
  };

  const handleScheduleCancelMarket = async () => {
    if (!cancelMarketForm.marketId) return;
    const data = encodeAbiParameters(
      [{ type: 'uint256' }],
      [BigInt(cancelMarketForm.marketId)]
    );
    await scheduleOperation(OP_TAGS.OP_CANCEL_MARKET as `0x${string}`, data, 'Market cancellation scheduled');
    setCancelMarketForm({ marketId: '' });
  };

  // ============ Execute Operations ============
  const handleExecuteOp = async (opId: `0x${string}`, tag: string) => {
    if (!publicClient) return;
    setLoading(true);
    try {
      const hash = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'executeOp',
        args: [opId, tag as `0x${string}`],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      pushToast({ title: 'Success', description: 'Operation executed successfully!', type: 'success' });
      loadPendingOperations();
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.shortMessage || e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAllReady = async () => {
    const readyOps = pendingOps.filter(op => currentTime >= op.readyAt);
    if (readyOps.length === 0) {
      pushToast({ title: 'Info', description: 'No operations ready to execute', type: 'info' });
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const op of readyOps) {
      try {
        const hash = await writeContractAsync({
          address: addresses.core,
          abi: coreAbi,
          functionName: 'executeOp',
          args: [op.opId, op.tag as `0x${string}`],
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        successCount++;
        pushToast({
          title: 'Executed',
          description: `${op.tagName} executed (${successCount}/${readyOps.length})`,
          type: 'success'
        });
      } catch (e: any) {
        failCount++;
        console.error(`Failed to execute ${op.tagName}:`, e);
        pushToast({
          title: 'Failed',
          description: `${op.tagName}: ${e.shortMessage || e.message}`,
          type: 'error'
        });
      }
    }

    setLoading(false);
    loadPendingOperations();

    pushToast({
      title: 'Batch Complete',
      description: `${successCount} succeeded, ${failCount} failed`,
      type: successCount > 0 ? 'success' : 'error'
    });
  };

  const handleCancelOp = async (opId: `0x${string}`) => {
    if (!publicClient) return;
    setLoading(true);
    try {
      const hash = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'cancelOp',
        args: [opId],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      pushToast({ title: 'Success', description: 'Operation cancelled', type: 'success' });
      loadPendingOperations();
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.shortMessage || e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ============ Time Helpers ============
  const formatTimeRemaining = (readyAt: bigint): string => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (now >= readyAt) return 'Ready to execute';

    const remaining = Number(readyAt - now);
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getProgressPercentage = (readyAt: bigint, scheduledAt: bigint): number => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const total = Number(readyAt - scheduledAt);
    const elapsed = Number(now - scheduledAt);
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const formatExecutionDate = (readyAt: bigint): string => {
    const date = new Date(Number(readyAt) * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {(['pending', 'router', 'treasury', 'emergency'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-[#14B8A6] text-[#14B8A6]'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
            {tab === 'pending' && pendingOps.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-[#14B8A6] text-white text-xs rounded-full">
                {pendingOps.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pending Operations */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Pending Operations
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {pendingOps.filter(op => currentTime >= op.readyAt).length} of {pendingOps.length} ready to execute
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadPendingOperations}
                disabled={loadingOps}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingOps ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {pendingOps.some(op => currentTime >= op.readyAt) && (
                <Button
                  size="sm"
                  onClick={handleExecuteAllReady}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Execute All Ready ({pendingOps.filter(op => currentTime >= op.readyAt).length})
                </Button>
              )}
            </div>
          </div>

          {/* Deployment Block Input (for finding old operations) */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">🔍 Custom Block Search</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Using Ankr RPC for reliable operation loading. Default searches from block 73210700 (mainnet deployment). Enter different block to search specific range:
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g., 42000000"
                    value={deploymentBlock}
                    onChange={(e) => setDeploymentBlock(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadPendingOperations}
                    disabled={loadingOps || !deploymentBlock.trim()}
                  >
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {pendingOps.length === 0 ? (
            <div className="space-y-6">
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-bold">No pending operations loaded</p>
                <p className="text-sm mt-2">Searched blocks {searchedFromBlock.toString()} to {searchedFromBlock + 100n}</p>
              </div>

              {/* Manual Workaround Guide */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-amber-500 rounded-full p-3 flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-amber-900 dark:text-amber-100 mb-3">
                      No Operations Found in Current Range
                    </h3>
                    <p className="text-amber-800 dark:text-amber-200 mb-4">
                      Using Ankr RPC but no operations found in searched blocks. You can verify and execute operations manually via BscScan:
                    </p>

                    <div className="bg-white dark:bg-gray-900/50 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-3">
                        📋 Quick Steps:
                      </p>
                      <ol className="text-sm text-amber-800 dark:text-amber-200 space-y-2 ml-4 list-decimal">
                        <li>Check <a href="https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#events" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-950 dark:hover:text-amber-50">BscScan Events Tab</a> for OperationScheduled events (should see 21)</li>
                        <li>Wait for the 48-hour timelock to expire (check <code className="bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">readyAt</code> timestamp)</li>
                        <li>Use <a href="https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#writeContract" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-950 dark:hover:text-amber-50">BscScan Write Contract</a> to execute each operation</li>
                        <li>Call <code className="bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">executeOp(opId, tag)</code> for each event</li>
                      </ol>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href="https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#events"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg shadow-lg transition-colors"
                      >
                        View Events on BscScan →
                      </a>
                      <a
                        href="https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#writeContract"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg shadow-lg transition-colors"
                      >
                        Execute via BscScan →
                      </a>
                    </div>

                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-4">
                      💡 See <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">MANUAL_EXECUTION_GUIDE.md</code> for detailed instructions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingOps.map((op) => {
                const now = currentTime;
                const isReady = now >= op.readyAt;
                const progress = getProgressPercentage(op.readyAt, op.scheduledAt);
                const timeRemaining = formatTimeRemaining(op.readyAt);
                const executionDate = formatExecutionDate(op.readyAt);

                return (
                  <motion.div
                    key={op.opId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/30 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${
                            isReady
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-amber-100 dark:bg-amber-900/30'
                          }`}>
                            {isReady ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-gray-900 dark:text-white">
                              {op.tagName}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Operation ID
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-900/50 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {op.opId.slice(0, 10)}...{op.opId.slice(-8)}
                          </code>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            isReady
                              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                              : 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                          }`}>
                            {isReady ? '✓ Ready to Execute' : '⏳ Timelock Active'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {isReady ? 'Timelock Complete' : 'Timelock Progress'}
                        </span>
                        <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          className={`h-full ${
                            isReady
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500'
                          } shadow-lg`}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>

                    {/* Time Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                            {isReady ? 'Ready Since' : 'Ready In'}
                          </p>
                        </div>
                        <p className={`text-lg font-black ${
                          isReady
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {timeRemaining}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                            Execute After
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {executionDate}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleCancelOp(op.opId)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cancel Operation
                      </Button>
                      {isReady && (
                        <Button
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                          onClick={() => handleExecuteOp(op.opId, op.tag)}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4 mr-2" />
                          )}
                          Execute Now
                        </Button>
                      )}
                    </div>

                    {/* Warning for ready operations */}
                    {isReady && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3"
                      >
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                          <div className="text-xs text-green-700 dark:text-green-300">
                            <p className="font-bold">Timelock period completed!</p>
                            <p className="mt-1">This operation is now ready to execute. Click &quot;Execute Now&quot; to apply the changes to the protocol.</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Router Operations */}
      {activeTab === 'router' && (
        <div className="space-y-4">
          <SectionCard
            title="Register Facet"
            icon={Database}
            expanded={expandedSections.has('setFacet')}
            onToggle={() => toggleSection('setFacet')}
          >
            <div className="space-y-3">
              <Input
                value={setFacetForm.selector}
                onChange={(e) => setSetFacetForm(f => ({ ...f, selector: e.target.value }))}
                placeholder="Selector (0x12345678)"
                className="font-mono"
              />
              <Input
                value={setFacetForm.address}
                onChange={(e) => setSetFacetForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Facet address (0x...)"
                className="font-mono"
              />
              <Button onClick={handleScheduleSetFacet} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Schedule
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Remove Facet"
            icon={Trash2}
            expanded={expandedSections.has('removeFacet')}
            onToggle={() => toggleSection('removeFacet')}
          >
            <div className="space-y-3">
              <Input
                value={removeFacetForm.selector}
                onChange={(e) => setRemoveFacetForm({ selector: e.target.value })}
                placeholder="Selector (0x12345678)"
                className="font-mono"
              />
              <Button onClick={handleScheduleRemoveFacet} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Schedule Removal
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Update Treasury"
            icon={Wallet}
            expanded={expandedSections.has('setTreasury')}
            onToggle={() => toggleSection('setTreasury')}
          >
            <div className="space-y-3">
              <Input
                value={treasuryForm.address}
                onChange={(e) => setTreasuryForm({ address: e.target.value })}
                placeholder="New treasury address (0x...)"
                className="font-mono"
              />
              <Button onClick={handleScheduleSetTreasury} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Schedule Update
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Update Resolver"
            icon={Zap}
            expanded={expandedSections.has('setResolver')}
            onToggle={() => toggleSection('setResolver')}
          >
            <div className="space-y-3">
              <Input
                value={resolverForm.address}
                onChange={(e) => setResolverForm({ address: e.target.value })}
                placeholder="New resolver address (0x...)"
                className="font-mono"
              />
              <Button onClick={handleScheduleSetResolver} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Schedule Update
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Protocol Control"
            icon={Pause}
            expanded={expandedSections.has('pause')}
            onToggle={() => toggleSection('pause')}
          >
            <div className="flex gap-2">
              <Button 
                onClick={handleSchedulePause} 
                disabled={loading} 
                variant="destructive" 
                className="flex-1"
              >
                <Pause className="w-4 h-4 mr-2" /> Schedule Pause
              </Button>
              <Button 
                onClick={handleScheduleUnpause} 
                disabled={loading} 
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" /> Schedule Unpause
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Recover ETH"
            icon={Wallet}
            expanded={expandedSections.has('recoverETH')}
            onToggle={() => toggleSection('recoverETH')}
          >
            <div className="space-y-3">
              <Input
                value={ethRecoveryForm.address}
                onChange={(e) => setEthRecoveryForm({ address: e.target.value })}
                placeholder="Recovery address (0x...)"
                className="font-mono"
              />
              <Button onClick={handleScheduleRecoverETH} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Schedule Recovery
              </Button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Emergency Operations */}
      {activeTab === 'emergency' && (
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-800 dark:text-red-200">Emergency Operations</h4>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  These operations are irreversible. All are timelocked 24 hours.
                </p>
              </div>
            </div>
          </div>

          <SectionCard
            title="Cancel Market"
            icon={AlertTriangle}
            expanded={expandedSections.has('cancelMarket')}
            onToggle={() => toggleSection('cancelMarket')}
          >
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cancelling refunds all positions at 50% value. This cannot be undone.
              </p>
              <Input
                type="number"
                value={cancelMarketForm.marketId}
                onChange={(e) => setCancelMarketForm({ marketId: e.target.value })}
                placeholder="Market ID"
              />
              <Button 
                onClick={handleScheduleCancelMarket} 
                disabled={loading} 
                variant="destructive" 
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                Schedule Cancellation
              </Button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Treasury Tab */}
      {activeTab === 'treasury' && (
        <div className="space-y-4">
          <SectionCard
            title="Set Daily Limit"
            icon={Settings}
            expanded={expandedSections.has('dailyLimit')}
            onToggle={() => toggleSection('dailyLimit')}
          >
            <div className="space-y-3">
              <Input
                type="number"
                value={dailyLimitForm.limit}
                onChange={(e) => setDailyLimitForm({ limit: e.target.value })}
                placeholder="Daily limit in USDC"
              />
              <p className="text-xs text-gray-500">Max: 5,000,000 USDC</p>
              <Button disabled={loading} className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Update Limit
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Schedule Large Withdrawal"
            icon={Wallet}
            expanded={expandedSections.has('largeWithdraw')}
            onToggle={() => toggleSection('largeWithdraw')}
          >
            <div className="space-y-3">
              <Input
                value={largeWithdrawForm.token}
                onChange={(e) => setLargeWithdrawForm(f => ({ ...f, token: e.target.value }))}
                placeholder="Token address"
                className="font-mono"
              />
              <Input
                value={largeWithdrawForm.to}
                onChange={(e) => setLargeWithdrawForm(f => ({ ...f, to: e.target.value }))}
                placeholder="Recipient address"
                className="font-mono"
              />
              <Input
                type="number"
                value={largeWithdrawForm.amount}
                onChange={(e) => setLargeWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Amount"
              />
              <Button disabled={loading} className="w-full">
                <Clock className="w-4 h-4 mr-2" /> Schedule Withdrawal
              </Button>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

// ============ Section Card Component ============
function SectionCard({ 
  title, 
  icon: Icon, 
  expanded, 
  onToggle, 
  children 
}: { 
  title: string; 
  icon: any; 
  expanded: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#14B8A6]/10 rounded-lg">
            <Icon className="w-4 h-4 text-[#14B8A6]" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white">{title}</span>
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
          >
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}