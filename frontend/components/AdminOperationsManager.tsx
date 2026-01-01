'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi } from '@/lib/abis';
import { Shield, Wallet, Loader2, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { decodeFunctionData, decodeAbiParameters } from 'viem';

import { useAdminOperations, OP_TAGS } from './admin/useAdminOperations';
import { OperationsList } from './admin/OperationsList';
import { OperationScheduler } from './admin/OperationScheduler';
import { TreasuryManagement } from './admin/TreasuryManagement';

export default function AdminOperationsManager() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [activeTab, setActiveTab] = useState<'pending' | 'router' | 'treasury' | 'emergency'>('pending');
  const [executingAll, setExecutingAll] = useState(false);

  const {
    isAdmin,
    loading: opLoading,
    pendingOps,
    loadingOps,
    currentTime,
    loadPendingOperations,
    scheduleOperation,
  } = useAdminOperations();

  const addresses = getAddresses();
  const network = getCurrentNetwork();
  const coreAbi = getCoreAbi(network);

  const handleExecuteOp = useCallback(async (opId: `0x${string}`, tag: string) => {
    if (!publicClient) return;
    try {
      const op = pendingOps.find(o => o.opId === opId);
      let functionName = '';
      let args: any[] = [opId];

      // Map tags to specific execute functions and their arguments
      if (tag === OP_TAGS.OP_PAUSE) {
        functionName = 'executePause';
      } else if (tag === OP_TAGS.OP_UNPAUSE) {
        functionName = 'executeUnpause';
      } else {
        // For other operations, we need the encoded data
        let data = op?.data;

        // If data is missing (e.g. fresh page load with no cache), 
        // try to recover it by decoding the original scheduleOp transaction.
        if ((!data || data === '0x') && op?.transactionHash) {
          const tx = await publicClient.getTransaction({ hash: op.transactionHash });
          const decoded = decodeFunctionData({ abi: coreAbi, data: tx.input });
          if (decoded.args && decoded.args.length >= 2) {
            data = decoded.args[1] as `0x${string}`;
          }
        }

        if (!data || data === '0x') {
          throw new Error('Operation data is missing and could not be automatically recovered from the blockchain.');
        }

        if (tag === OP_TAGS.OP_SET_TREASURY) {
          functionName = 'executeSetTreasury';
          args.push(decodeAbiParameters([{ type: 'address' }], data)[0]);
        } else if (tag === OP_TAGS.OP_SET_RESOLVER) {
          functionName = 'executeSetResolver';
          args.push(decodeAbiParameters([{ type: 'address' }], data)[0]);
        } else if (tag === OP_TAGS.OP_RECOVER_ETH) {
          functionName = 'executeRecoverETH';
          args.push(decodeAbiParameters([{ type: 'address' }], data)[0]);
        } else if (tag === OP_TAGS.OP_SET_FACET) {
          functionName = 'executeSetFacet';
          const [selector, facet] = decodeAbiParameters([{ type: 'bytes4' }, { type: 'address' }], data);
          args.push(selector, facet);
        } else if (tag === OP_TAGS.OP_REMOVE_FACET) {
          functionName = 'executeRemoveFacet';
          const [selector] = decodeAbiParameters([{ type: 'bytes4' }], data);
          args.push(selector);
        } else if (tag === OP_TAGS.OP_CANCEL_MARKET) {
          functionName = 'emergencyCancelMarket';
          const [marketId] = decodeAbiParameters([{ type: 'uint256' }], data);
          args.push(marketId);
        } else {
          throw new Error(`Execution logic for tag ${tag} not implemented in frontend yet.`);
        }
      }

      if (!functionName) throw new Error('Could not determine execution function');

      const hash = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: functionName as any,
        args: args as any,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      pushToast({ title: 'Success', description: 'Operation executed successfully!', type: 'success' });
      loadPendingOperations();
    } catch (e: any) {
      console.error('Execution error:', e);
      pushToast({ title: 'Error', description: e.shortMessage || e.message, type: 'error' });
    }
  }, [publicClient, writeContractAsync, addresses.core, coreAbi, pushToast, loadPendingOperations, pendingOps]);

  const handleExecuteAllReady = useCallback(async () => {
    const readyOps = pendingOps.filter(op => currentTime >= op.readyAt);
    if (readyOps.length === 0) return;

    setExecutingAll(true);
    let successCount = 0;
    for (const op of readyOps) {
      try {
        await handleExecuteOp(op.opId, op.tag);
        successCount++;
      } catch (e) {
        console.error(e);
      }
    }
    setExecutingAll(false);
    loadPendingOperations();
    pushToast({ title: 'Batch Complete', description: `Executed ${successCount} operations`, type: 'success' });
  }, [pendingOps, currentTime, handleExecuteOp, loadPendingOperations, pushToast]);

  const handleCancelOp = useCallback(async (opId: `0x${string}`) => {
    if (!publicClient) return;
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
    }
  }, [publicClient, writeContractAsync, addresses.core, coreAbi, pushToast, loadPendingOperations]);

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-bold text-lg">Admin access required</p>
        <p className="text-sm">Connect an authorized wallet to manage protocol operations.</p>
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
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === tab
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

      <div className="min-h-[400px]">
        {activeTab === 'pending' && (
          <OperationsList
            pendingOps={pendingOps}
            currentTime={currentTime}
            loading={executingAll || opLoading}
            loadingOps={loadingOps}
            onRefresh={(force, fromBlock) => loadPendingOperations(force, fromBlock)}
            onExecute={handleExecuteOp}
            onExecuteAllReady={handleExecuteAllReady}
            onCancel={handleCancelOp}
            startBlock={addresses.startBlock}
          />
        )}

        {(activeTab === 'router' || activeTab === 'emergency') && (
          <OperationScheduler
            activeTab={activeTab}
            loading={opLoading}
            onSchedule={scheduleOperation}
          />
        )}

        {activeTab === 'treasury' && (
          <TreasuryManagement />
        )}
      </div>
    </div>
  );
}