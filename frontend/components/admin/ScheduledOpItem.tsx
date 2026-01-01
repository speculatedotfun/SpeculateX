'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap, Loader2 } from 'lucide-react';
import { ScheduledOp } from './useAdminOperations';

interface ScheduledOpItemProps {
    op: ScheduledOp;
    currentTime: bigint;
    loading: boolean;
    onExecute: (opId: `0x${string}`, tag: string) => void;
    onCancel: (opId: `0x${string}`) => void;
}

export function ScheduledOpItem({
    op,
    currentTime,
    loading,
    onExecute,
    onCancel,
}: ScheduledOpItemProps) {
    const isReady = currentTime >= op.readyAt;

    const formatTimeRemaining = (readyAt: bigint): string => {
        if (currentTime >= readyAt) return 'Ready to execute';
        const remaining = Number(readyAt - currentTime);
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    };

    const getProgressPercentage = (readyAt: bigint, scheduledAt: bigint): number => {
        const total = Number(readyAt - scheduledAt);
        const elapsed = Number(currentTime - scheduledAt);
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

    const progress = getProgressPercentage(op.readyAt, op.scheduledAt);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white via-white to-gray-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/30 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-gray-900 dark:text-white">
                            {op.tagName}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${isReady
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                            {isReady ? 'Ready' : 'Timelock Active'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 font-mono">
                        ID: {op.opId.slice(0, 10)}...{op.opId.slice(-4)}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                        {formatTimeRemaining(op.readyAt)}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
                        {isReady ? 'Ready since' : 'Ready at'} {formatExecutionDate(op.readyAt)}
                    </div>
                </div>
            </div>

            <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
                <div
                    className={`h-full transition-all duration-1000 ease-out ${isReady ? 'bg-green-500' : 'bg-amber-500'
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex justify-end gap-3">
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onCancel(op.opId)}
                    disabled={loading}
                    className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 border-none"
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => onExecute(op.opId, op.tag)}
                    disabled={!isReady || loading}
                    className={`font-bold ${isReady
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Execute
                </Button>
            </div>
        </motion.div>
    );
}
