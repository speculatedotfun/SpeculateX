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
      // Get OperationScheduled events from last 30 days
      // RPC limit is typically 50,000 blocks, so we'll use a safe range
      const currentBlock = await publicClient.getBlockNumber();
      const maxRange = 45_000n; // Stay under 50k limit
      const requestedRange = 200_000n; // ~30 days on BSC
      const fromBlock = currentBlock > requestedRange 
        ? (currentBlock - requestedRange) 
        : 0n;
      
      // Ensure range doesn't exceed RPC limit
      const safeFromBlock = (currentBlock - fromBlock) > maxRange
        ? (currentBlock - maxRange)
        : (fromBlock > 0n ? fromBlock : 0n);
      
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
        toBlock: currentBlock, // Use current block instead of 'latest'
      });

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
        toBlock: currentBlock, // Use current block instead of 'latest'
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
        toBlock: currentBlock, // Use current block instead of 'latest'
      });

      const executedIds = new Set(executedLogs.map(l => l.topics[1]));
      const cancelledIds = new Set(cancelledLogs.map(l => l.topics[1]));
      const now = BigInt(Math.floor(Date.now() / 1000));

      const ops: ScheduledOp[] = scheduledLogs
        .map(log => {
          const opId = log.topics[1] as `0x${string}`;
          const tag = log.topics[2] as `0x${string}`;
          const readyAt = BigInt(log.data);
          
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
            status,
            data: '0x' as `0x${string}`, // Would need to store this separately
            description: TAG_NAMES[tag] || 'Unknown Operation',
          };
        })
        .filter(op => op.status === 'scheduled' || op.status === 'ready');

      setPendingOps(ops);
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
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Pending Operations
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPendingOperations}
              disabled={loadingOps}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingOps ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {pendingOps.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pending operations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOps.map((op) => (
                <div
                  key={op.opId}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {op.tagName}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          op.status === 'ready' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {op.status === 'ready' ? 'Ready' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                        {op.opId.slice(0, 18)}...{op.opId.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {formatTimeRemaining(op.readyAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelOp(op.opId)}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      {op.status === 'ready' && (
                        <Button
                          size="sm"
                          disabled={loading}
                          onClick={() => {
                            // Execute logic depends on tag type
                            pushToast({
                              title: 'Info',
                              description: 'Use the appropriate execute form with this OpId',
                              type: 'info'
                            });
                          }}
                        >
                          Execute
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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