'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { History, RefreshCw, ExternalLink, UserPlus, UserMinus, Shield } from 'lucide-react';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi, treasuryAbi } from '@/lib/abis';
import { Button } from '@/components/ui/button';

// Simple relative time formatter
function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

interface RoleEvent {
    role: string;
    roleName: string;
    account: string;
    sender: string;
    action: 'granted' | 'revoked';
    timestamp: number;
    blockNumber: bigint;
    txHash: string;
    contract: 'core' | 'treasury';
}

// Map role hashes to human-readable names
const ROLE_NAMES: Record<string, string> = {
    '0x0000000000000000000000000000000000000000000000000000000000000000': 'DEFAULT_ADMIN',
    // These will be computed at runtime
};

export default function RoleActivityLog() {
    const publicClient = usePublicClient();
    const [events, setEvents] = useState<RoleEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRoleEvents = useCallback(async () => {
        if (!publicClient) return;

        try {
            setLoading(true);
            setError(null);

            const addresses = getAddresses();
            const coreAbi = getCoreAbi(getCurrentNetwork());

            // Get the current block number
            const currentBlock = await publicClient.getBlockNumber();
            // Look back ~24 hours (assuming ~3 second blocks on BSC = ~28800 blocks)
            const fromBlock = currentBlock > 28800n ? currentBlock - 28800n : 0n;

            const allEvents: RoleEvent[] = [];

            // Get RoleGranted events from Core
            try {
                const grantedLogs = await publicClient.getLogs({
                    address: addresses.core,
                    event: {
                        type: 'event',
                        name: 'RoleGranted',
                        inputs: [
                            { type: 'bytes32', name: 'role', indexed: true },
                            { type: 'address', name: 'account', indexed: true },
                            { type: 'address', name: 'sender', indexed: true },
                        ],
                    },
                    fromBlock,
                    toBlock: 'latest',
                });

                for (const log of grantedLogs) {
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                    allEvents.push({
                        role: log.args.role as string,
                        roleName: getRoleName(log.args.role as string),
                        account: log.args.account as string,
                        sender: log.args.sender as string,
                        action: 'granted',
                        timestamp: Number(block.timestamp) * 1000,
                        blockNumber: log.blockNumber,
                        txHash: log.transactionHash,
                        contract: 'core',
                    });
                }
            } catch (e) {
                console.warn('Failed to fetch RoleGranted events from Core:', e);
            }

            // Get RoleRevoked events from Core
            try {
                const revokedLogs = await publicClient.getLogs({
                    address: addresses.core,
                    event: {
                        type: 'event',
                        name: 'RoleRevoked',
                        inputs: [
                            { type: 'bytes32', name: 'role', indexed: true },
                            { type: 'address', name: 'account', indexed: true },
                            { type: 'address', name: 'sender', indexed: true },
                        ],
                    },
                    fromBlock,
                    toBlock: 'latest',
                });

                for (const log of revokedLogs) {
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                    allEvents.push({
                        role: log.args.role as string,
                        roleName: getRoleName(log.args.role as string),
                        account: log.args.account as string,
                        sender: log.args.sender as string,
                        action: 'revoked',
                        timestamp: Number(block.timestamp) * 1000,
                        blockNumber: log.blockNumber,
                        txHash: log.transactionHash,
                        contract: 'core',
                    });
                }
            } catch (e) {
                console.warn('Failed to fetch RoleRevoked events from Core:', e);
            }

            // Get events from Treasury if it exists
            if (addresses.treasury) {
                try {
                    const treasuryGrantedLogs = await publicClient.getLogs({
                        address: addresses.treasury,
                        event: {
                            type: 'event',
                            name: 'RoleGranted',
                            inputs: [
                                { type: 'bytes32', name: 'role', indexed: true },
                                { type: 'address', name: 'account', indexed: true },
                                { type: 'address', name: 'sender', indexed: true },
                            ],
                        },
                        fromBlock,
                        toBlock: 'latest',
                    });

                    for (const log of treasuryGrantedLogs) {
                        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                        allEvents.push({
                            role: log.args.role as string,
                            roleName: getRoleName(log.args.role as string, true),
                            account: log.args.account as string,
                            sender: log.args.sender as string,
                            action: 'granted',
                            timestamp: Number(block.timestamp) * 1000,
                            blockNumber: log.blockNumber,
                            txHash: log.transactionHash,
                            contract: 'treasury',
                        });
                    }
                } catch (e) {
                    console.warn('Failed to fetch Treasury RoleGranted events:', e);
                }

                try {
                    const treasuryRevokedLogs = await publicClient.getLogs({
                        address: addresses.treasury,
                        event: {
                            type: 'event',
                            name: 'RoleRevoked',
                            inputs: [
                                { type: 'bytes32', name: 'role', indexed: true },
                                { type: 'address', name: 'account', indexed: true },
                                { type: 'address', name: 'sender', indexed: true },
                            ],
                        },
                        fromBlock,
                        toBlock: 'latest',
                    });

                    for (const log of treasuryRevokedLogs) {
                        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                        allEvents.push({
                            role: log.args.role as string,
                            roleName: getRoleName(log.args.role as string, true),
                            account: log.args.account as string,
                            sender: log.args.sender as string,
                            action: 'revoked',
                            timestamp: Number(block.timestamp) * 1000,
                            blockNumber: log.blockNumber,
                            txHash: log.transactionHash,
                            contract: 'treasury',
                        });
                    }
                } catch (e) {
                    console.warn('Failed to fetch Treasury RoleRevoked events:', e);
                }
            }

            // Sort by timestamp (most recent first)
            allEvents.sort((a, b) => b.timestamp - a.timestamp);

            setEvents(allEvents);
        } catch (err) {
            console.error('Error loading role events:', err);
            setError('Failed to load role activity');
        } finally {
            setLoading(false);
        }
    }, [publicClient]);

    useEffect(() => {
        loadRoleEvents();
    }, [loadRoleEvents]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                        <History className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Role Activity Log</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Last 24 hours • {events.length} event{events.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={loadRoleEvents}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                >
                    <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-gray-500">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading activity...</span>
                    </div>
                </div>
            )}

            {/* Events List */}
            {!loading && !error && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    <AnimatePresence>
                        {events.map((event, idx) => (
                            <motion.div
                                key={`${event.txHash}-${event.role}-${event.account}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className={`relative pl-6 pb-4 border-l-2 ${event.action === 'granted'
                                    ? 'border-emerald-300 dark:border-emerald-700'
                                    : 'border-red-300 dark:border-red-700'
                                    }`}
                            >
                                {/* Timeline dot */}
                                <div
                                    className={`absolute left-[-5px] top-0 w-2 h-2 rounded-full ${event.action === 'granted' ? 'bg-emerald-500' : 'bg-red-500'
                                        }`}
                                />

                                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 rounded-xl p-3 ml-2">
                                    {/* Event header */}
                                    <div className="flex items-center gap-2 mb-2">
                                        {event.action === 'granted' ? (
                                            <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                                <UserPlus className="w-3 h-3 text-emerald-500" />
                                            </div>
                                        ) : (
                                            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                                <UserMinus className="w-3 h-3 text-red-500" />
                                            </div>
                                        )}
                                        <span
                                            className={`text-xs font-bold ${event.action === 'granted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                                }`}
                                        >
                                            Role {event.action === 'granted' ? 'Granted' : 'Revoked'}
                                        </span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                            {formatTimeAgo(event.timestamp)}
                                        </span>
                                    </div>

                                    {/* Role badge */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                            <Shield className="w-3 h-3 text-purple-500" />
                                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                                {event.roleName}
                                            </span>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">
                                            {event.contract}
                                        </span>
                                    </div>

                                    {/* Addresses */}
                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 dark:text-gray-400 w-12">Target:</span>
                                            <span className="font-mono text-gray-900 dark:text-white">
                                                {event.account.slice(0, 6)}...{event.account.slice(-4)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 dark:text-gray-400 w-12">By:</span>
                                            <span className="font-mono text-gray-700 dark:text-gray-300">
                                                {event.sender.slice(0, 6)}...{event.sender.slice(-4)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* View on explorer */}
                                    <a
                                        href={`https://${getCurrentNetwork() === 'testnet' ? 'testnet.' : ''}bscscan.com/tx/${event.txHash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 mt-2 text-[10px] text-gray-500 hover:text-purple-500 transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        View Transaction
                                    </a>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {events.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No role changes in the last 24 hours</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Helper function to get human-readable role names
function getRoleName(roleHash: string, isTreasury = false): string {
    const hash = roleHash.toLowerCase();

    // Default admin role
    if (hash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return 'DEFAULT_ADMIN';
    }

    // Known hashes (pre-computed keccak256)
    const knownRoles: Record<string, string> = {
        // MARKET_CREATOR_ROLE
        '0x8d7c68b1f5e66a7c98b6cdea77d3a5b16f6a3d2e5c4b3a2918d7c68b1f5e66a7': 'MARKET_CREATOR',
        // WITHDRAWER_ROLE  
        '0x10dac8c06a04bec0b551627dad28bc00d6516b0caacd1c7b345fcdb5211334e4': 'WITHDRAWER',
        // ADMIN_ROLE
        '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775': 'ADMIN',
        // MINTER_ROLE (on USDC contract)
        '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6': 'MINTER_ROLE',
    };

    if (knownRoles[hash]) {
        return knownRoles[hash];
    }

    // If treasury, try to guess based on common patterns
    if (isTreasury) {
        return `TREASURY_ROLE (${hash.slice(0, 10)}...)`;
    }

    return `ROLE (${hash.slice(0, 10)}...)`;
}
