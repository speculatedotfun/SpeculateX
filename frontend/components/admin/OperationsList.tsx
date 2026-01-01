'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Zap, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { ScheduledOp } from './useAdminOperations';
import { ScheduledOpItem } from './ScheduledOpItem';

interface OperationsListProps {
    pendingOps: ScheduledOp[];
    currentTime: bigint;
    loading: boolean;
    loadingOps: boolean;
    onRefresh: (force?: boolean, fromBlock?: string) => void;
    onExecute: (opId: `0x${string}`, tag: string) => void;
    onExecuteAllReady: () => void;
    onCancel: (opId: `0x${string}`) => void;
    startBlock?: bigint;
}

export function OperationsList({
    pendingOps,
    currentTime,
    loading,
    loadingOps,
    onRefresh,
    onExecute,
    onExecuteAllReady,
    onCancel,
    startBlock,
}: OperationsListProps) {
    const [customBlock, setCustomBlock] = useState('');

    const readyOpsCount = pendingOps.filter(op => currentTime >= op.readyAt).length;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Pending Operations
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {readyOpsCount} of {pendingOps.length} ready to execute
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRefresh(true)}
                        disabled={loadingOps}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingOps ? 'animate-spin' : ''}`} />
                        {loadingOps ? 'Scanning Chain...' : 'Refresh'}
                    </Button>
                    {readyOpsCount > 0 && (
                        <Button
                            size="sm"
                            onClick={onExecuteAllReady}
                            disabled={loading}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4 mr-2" />
                            )}
                            Execute All Ready ({readyOpsCount})
                        </Button>
                    )}
                </div>
            </div>

            {/* Custom Block Search */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">🔍 Custom Block Search</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                            Search from a specific block to find older events.
                        </p>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                placeholder={startBlock?.toString() || 'Start block'}
                                value={customBlock}
                                onChange={(e) => setCustomBlock(e.target.value)}
                                className="max-w-xs bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800 text-gray-900 dark:text-white"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRefresh(true, customBlock)}
                                disabled={loadingOps || !customBlock.trim()}
                            >
                                Search
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {pendingOps.length === 0 ? (
                <div className="space-y-6">
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400 font-medium">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No pending operations loaded</p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="bg-amber-500 rounded-full p-3 flex-shrink-0">
                                <AlertTriangle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-amber-900 dark:text-amber-100 mb-3">
                                    Manual Workaround Guide
                                </h3>
                                <p className="text-amber-800 dark:text-amber-200 mb-4">
                                    If you cannot find operations via the scanner, you can execute them manually on BscScan.
                                </p>
                                <div className="bg-white dark:bg-gray-900/50 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-800">
                                    <ol className="text-sm text-amber-800 dark:text-amber-200 space-y-2 ml-4 list-decimal">
                                        <li>Find <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">OperationScheduled</code> events on BscScan.</li>
                                        <li>Wait for the timelock to expire.</li>
                                        <li>Call <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">executeOp(opId, tag)</code> in Write Contract.</li>
                                    </ol>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <a href="https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#events" target="_blank" rel="noopener noreferrer" className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">
                                        View Events
                                    </a>
                                    <a href="https://bscscan.com/address/0x101450a49E730d2e9502467242d0B6f157BABe60#writeContract" target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">
                                        Write Contract
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingOps.map((op) => (
                        <ScheduledOpItem
                            key={op.opId}
                            op={op}
                            currentTime={currentTime}
                            loading={loading}
                            onExecute={onExecute}
                            onCancel={onCancel}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
