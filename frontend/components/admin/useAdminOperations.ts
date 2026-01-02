'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { keccak256, stringToBytes, encodeAbiParameters } from 'viem';
import { useToast } from '@/components/ui/toast';

export interface ScheduledOp {
    opId: `0x${string}`;
    tag: string;
    tagName: string;
    readyAt: bigint;
    scheduledAt: bigint;
    status: 'scheduled' | 'ready' | 'executed' | 'expired' | 'cancelled';
    data: `0x${string}`;
    description: string;
    transactionHash?: `0x${string}`;
}

export const OP_TAGS = {
    OP_SET_FACET: keccak256(stringToBytes('OP_SET_FACET')),
    OP_REMOVE_FACET: keccak256(stringToBytes('OP_REMOVE_FACET')),
    OP_SET_TREASURY: keccak256(stringToBytes('OP_SET_TREASURY')),
    OP_SET_RESOLVER: keccak256(stringToBytes('OP_SET_RESOLVER')),
    OP_PAUSE: keccak256(stringToBytes('OP_PAUSE')),
    OP_UNPAUSE: keccak256(stringToBytes('OP_UNPAUSE')),
    OP_RECOVER_ETH: keccak256(stringToBytes('OP_RECOVER_ETH')),
    OP_CANCEL_MARKET: keccak256(stringToBytes('OP_CANCEL_MARKET')),
} as const;

export const TAG_NAMES: Record<string, string> = {
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
const STORAGE_KEY_OPS = 'admin_pending_ops';
const STORAGE_KEY_BLOCK = 'admin_last_scanned_block';

const loadCache = () => {
    if (typeof window === 'undefined') return null;
    try {
        const storedOps = localStorage.getItem(STORAGE_KEY_OPS);
        const storedBlock = localStorage.getItem(STORAGE_KEY_BLOCK);
        if (storedOps && storedBlock) {
            const ops = JSON.parse(storedOps, (key, value) => {
                if (typeof value === 'string' && value.endsWith('n')) return BigInt(value.slice(0, -1));
                return value;
            });
            return { ops: ops as ScheduledOp[], lastBlock: BigInt(storedBlock) };
        }
    } catch (e) { console.warn('Cache load failed', e); }
    return null;
};

const saveCache = (ops: ScheduledOp[], block: bigint) => {
    if (typeof window === 'undefined') return;
    try {
        const opsJson = JSON.stringify(ops, (key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value);
        localStorage.setItem(STORAGE_KEY_OPS, opsJson);
        localStorage.setItem(STORAGE_KEY_BLOCK, block.toString());
    } catch (e) { console.warn('Cache save failed', e); }
};

export function useAdminOperations() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { pushToast } = useToast();
    const { writeContractAsync } = useWriteContract();

    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pendingOps, setPendingOps] = useState<ScheduledOp[]>([]);
    const [loadingOps, setLoadingOps] = useState(false);
    const [currentTime, setCurrentTime] = useState(BigInt(Math.floor(Date.now() / 1000)));

    const addresses = getAddresses();
    const network = getCurrentNetwork();
    const coreAbi = getCoreAbi(network);

    useEffect(() => {
        if (address) {
            checkIsAdmin(address).then(setIsAdmin);
        }
    }, [address]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(BigInt(Math.floor(Date.now() / 1000)));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const loadPendingOperations = useCallback(async (forceFullScan = false, deploymentBlock?: string) => {
        if (!publicClient || !addresses.core) return;
        setLoadingOps(true);

        try {
            const currentBlock = BigInt(await publicClient.getBlockNumber());
            let opsToKeep: ScheduledOp[] = [];
            let startBlock = addresses.startBlock || 73210700n;

            const cache = !forceFullScan && !deploymentBlock ? loadCache() : null;
            if (cache) {
                opsToKeep = cache.ops;
                if (cache.lastBlock > startBlock) startBlock = cache.lastBlock + 1n;
            }

            if (deploymentBlock && deploymentBlock.trim()) {
                startBlock = BigInt(deploymentBlock.trim());
                opsToKeep = [];
            }

            if (startBlock > currentBlock) startBlock = currentBlock;

            const safeFromBlock = startBlock;

            // Scanning logic...
            const CHUNK_SIZE = 1000n;
            const allScheduledLogs: any[] = [];
            const allExecutedLogs: any[] = [];
            const allCancelledLogs: any[] = [];

            for (let chunkStart = safeFromBlock; chunkStart <= currentBlock; chunkStart += CHUNK_SIZE) {
                const chunkEnd = chunkStart + CHUNK_SIZE - 1n > currentBlock ? currentBlock : chunkStart + CHUNK_SIZE - 1n;

                const [scheduled, executed, cancelled] = await Promise.all([
                    publicClient.getLogs({
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
                        fromBlock: chunkStart,
                        toBlock: chunkEnd,
                    }),
                    publicClient.getLogs({
                        address: addresses.core,
                        event: {
                            type: 'event',
                            name: 'OperationExecuted',
                            inputs: [{ type: 'bytes32', name: 'opId', indexed: true }],
                        },
                        fromBlock: chunkStart,
                        toBlock: chunkEnd,
                    }),
                    publicClient.getLogs({
                        address: addresses.core,
                        event: {
                            type: 'event',
                            name: 'OperationCancelled',
                            inputs: [{ type: 'bytes32', name: 'opId', indexed: true }],
                        },
                        fromBlock: chunkStart,
                        toBlock: chunkEnd,
                    })
                ]);

                allScheduledLogs.push(...scheduled);
                allExecutedLogs.push(...executed);
                allCancelledLogs.push(...cancelled);
                await new Promise(r => setTimeout(r, 50));
            }

            const executedIds = new Set(allExecutedLogs.map((l: any) => l.topics[1]));
            const cancelledIds = new Set(allCancelledLogs.map((l: any) => l.topics[1]));
            const now = BigInt(Math.floor(Date.now() / 1000));

            const newOps: ScheduledOp[] = allScheduledLogs.map((log: any) => {
                const opId = log.topics[1] as `0x${string}`;
                const tag = log.topics[2] as `0x${string}`;
                const readyAt = BigInt(log.data);
                return {
                    opId,
                    tag,
                    tagName: TAG_NAMES[tag] || 'Unknown',
                    readyAt,
                    scheduledAt: readyAt - 172800n,
                    status: 'scheduled' as const,
                    data: '0x' as `0x${string}`,
                    description: TAG_NAMES[tag] || 'Unknown Operation',
                    transactionHash: log.transactionHash,
                };
            });

            const opMap = new Map<string, ScheduledOp>();
            opsToKeep.forEach(op => opMap.set(op.opId, op));
            newOps.forEach(op => opMap.set(op.opId, op));

            let mergedOps = Array.from(opMap.values()).map(op => {
                let status = op.status;
                if (executedIds.has(op.opId)) status = 'executed';
                else if (cancelledIds.has(op.opId)) status = 'cancelled';
                if (status === 'scheduled' || status === 'ready') {
                    if (now > op.readyAt + OP_EXPIRY_WINDOW) status = 'expired';
                    else if (now >= op.readyAt) status = 'ready';
                }
                return { ...op, status };
            });

            const activeOps = mergedOps
                .filter(op => op.status === 'scheduled' || op.status === 'ready')
                .sort((a, b) => Number(a.readyAt - b.readyAt));

            setPendingOps(activeOps);
            saveCache(activeOps, currentBlock);

        } catch (e) {
            console.error('Error loading operations:', e);
        } finally {
            setLoadingOps(false);
        }
    }, [publicClient, addresses.core, addresses.startBlock]);

    const scheduleOperation = useCallback(async (
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
            const scheduledEvent = receipt.logs.find(log =>
                log.topics[0] === keccak256(stringToBytes('OperationScheduled(bytes32,bytes32,uint256)'))
            );

            if (scheduledEvent) {
                const opId = scheduledEvent.topics[1] as `0x${string}`;
                pushToast({ title: 'Scheduled', description: `${successMessage} OpId: ${opId.slice(0, 10)}...`, type: 'success' });
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
    }, [publicClient, writeContractAsync, addresses.core, coreAbi, pushToast, loadPendingOperations]);

    return {
        isAdmin,
        loading,
        pendingOps,
        loadingOps,
        currentTime,
        loadPendingOperations,
        scheduleOperation,
    };
}
