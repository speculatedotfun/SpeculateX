'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Wallet, Database, RefreshCw, ExternalLink, Crown, Zap, Check, X, Plus } from 'lucide-react';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi, treasuryAbi } from '@/lib/abis';
import { keccak256, stringToBytes, isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RoleHolder {
    address: string;
    roles: {
        defaultAdmin: boolean;
        marketCreator: boolean;
        treasuryWithdrawer: boolean;
        treasuryAdmin: boolean;
    };
    isYou: boolean;
}

// Role definitions with metadata
const ROLE_DEFINITIONS = {
    defaultAdmin: {
        name: 'DEFAULT_ADMIN',
        description: 'Full protocol control',
        icon: Crown,
        color: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        badgeColor: 'bg-red-500',
    },
    marketCreator: {
        name: 'MARKET_CREATOR',
        description: 'Create markets',
        icon: Zap,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        badgeColor: 'bg-blue-500',
    },
    treasuryWithdrawer: {
        name: 'TREASURY_WITHDRAWER',
        description: 'Withdraw from treasury',
        icon: Wallet,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        badgeColor: 'bg-emerald-500',
    },
    treasuryAdmin: {
        name: 'TREASURY_ADMIN',
        description: 'Manage treasury settings',
        icon: Database,
        color: 'text-purple-500',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        badgeColor: 'bg-purple-500',
    },
} as const;

export default function RoleVisualization() {
    const publicClient = usePublicClient();
    const { address: connectedAddress } = useAccount();
    const [roleHolders, setRoleHolders] = useState<RoleHolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newAddress, setNewAddress] = useState('');
    const [addressesToCheck, setAddressesToCheck] = useState<string[]>([]);

    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const MARKET_CREATOR_ROLE = keccak256(stringToBytes('MARKET_CREATOR_ROLE'));
    const TREASURY_WITHDRAWER_ROLE = keccak256(stringToBytes('WITHDRAWER_ROLE'));
    const TREASURY_ADMIN_ROLE = keccak256(stringToBytes('ADMIN_ROLE'));

    // Check roles for a specific address
    const checkRolesForAddress = useCallback(async (addr: string): Promise<RoleHolder | null> => {
        if (!publicClient || !isAddress(addr)) return null;

        try {
            const addresses = getAddresses();
            const coreAbi = getCoreAbi(getCurrentNetwork());

            const [hasDefaultAdmin, hasMarketCreator, hasTreasuryWithdrawer, hasTreasuryAdmin] = await Promise.all([
                publicClient.readContract({
                    address: addresses.core,
                    abi: coreAbi,
                    functionName: 'hasRole',
                    args: [DEFAULT_ADMIN_ROLE as `0x${string}`, addr as `0x${string}`],
                }).catch(() => false) as Promise<boolean>,
                publicClient.readContract({
                    address: addresses.core,
                    abi: coreAbi,
                    functionName: 'hasRole',
                    args: [MARKET_CREATOR_ROLE as `0x${string}`, addr as `0x${string}`],
                }).catch(() => false) as Promise<boolean>,
                addresses.treasury
                    ? publicClient.readContract({
                        address: addresses.treasury,
                        abi: treasuryAbi,
                        functionName: 'hasRole',
                        args: [TREASURY_WITHDRAWER_ROLE, addr as `0x${string}`],
                    }).catch(() => false) as Promise<boolean>
                    : Promise.resolve(false),
                addresses.treasury
                    ? publicClient.readContract({
                        address: addresses.treasury,
                        abi: treasuryAbi,
                        functionName: 'hasRole',
                        args: [TREASURY_ADMIN_ROLE, addr as `0x${string}`],
                    }).catch(() => false) as Promise<boolean>
                    : Promise.resolve(false),
            ]);

            return {
                address: addr,
                roles: {
                    defaultAdmin: Boolean(hasDefaultAdmin),
                    marketCreator: Boolean(hasMarketCreator),
                    treasuryWithdrawer: Boolean(hasTreasuryWithdrawer),
                    treasuryAdmin: Boolean(hasTreasuryAdmin),
                },
                isYou: addr.toLowerCase() === connectedAddress?.toLowerCase(),
            };
        } catch (e) {
            console.error(`Error checking roles for ${addr}:`, e);
            return null;
        }
    }, [publicClient, connectedAddress, DEFAULT_ADMIN_ROLE, MARKET_CREATOR_ROLE, TREASURY_WITHDRAWER_ROLE, TREASURY_ADMIN_ROLE]);

    const loadAllRoleHolders = useCallback(async () => {
        if (!publicClient) return;

        try {
            setLoading(true);
            setError(null);

            // Build list of addresses to check
            const toCheck = new Set<string>();

            // Always check connected address
            if (connectedAddress) {
                toCheck.add(connectedAddress);
            }

            // Add any manually added addresses
            addressesToCheck.forEach(addr => toCheck.add(addr));

            // Check roles for all addresses
            const holders: RoleHolder[] = [];
            for (const addr of toCheck) {
                const holder = await checkRolesForAddress(addr);
                if (holder && Object.values(holder.roles).some(Boolean)) {
                    holders.push(holder);
                }
            }

            // Sort: you first, then by number of roles (most first)
            holders.sort((a, b) => {
                if (a.isYou && !b.isYou) return -1;
                if (!a.isYou && b.isYou) return 1;
                const aCount = Object.values(a.roles).filter(Boolean).length;
                const bCount = Object.values(b.roles).filter(Boolean).length;
                return bCount - aCount;
            });

            setRoleHolders(holders);
        } catch (err) {
            console.error('Error loading role holders:', err);
            setError('Failed to load role information');
        } finally {
            setLoading(false);
        }
    }, [publicClient, connectedAddress, addressesToCheck, checkRolesForAddress]);

    useEffect(() => {
        loadAllRoleHolders();
    }, [loadAllRoleHolders]);

    const handleAddAddress = async () => {
        if (!isAddress(newAddress)) return;
        if (addressesToCheck.includes(newAddress.toLowerCase())) return;

        setAddressesToCheck(prev => [...prev, newAddress.toLowerCase()]);

        // Check this address immediately
        const holder = await checkRolesForAddress(newAddress);
        if (holder) {
            setRoleHolders(prev => {
                const exists = prev.some(h => h.address.toLowerCase() === newAddress.toLowerCase());
                if (exists) return prev;
                return [...prev, holder].sort((a, b) => {
                    if (a.isYou && !b.isYou) return -1;
                    if (!a.isYou && b.isYou) return 1;
                    return Object.values(b.roles).filter(Boolean).length - Object.values(a.roles).filter(Boolean).length;
                });
            });
        }
        setNewAddress('');
    };

    const getRoleCount = (roles: RoleHolder['roles']) => Object.values(roles).filter(Boolean).length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <Users className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Role Matrix</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {roleHolders.length} address{roleHolders.length !== 1 ? 'es' : ''} checked
                        </p>
                    </div>
                </div>
                <Button
                    onClick={loadAllRoleHolders}
                    disabled={loading}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                >
                    <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Add address to check */}
            <div className="flex gap-2">
                <Input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="0x... (check address)"
                    className="font-mono text-xs bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10"
                />
                <Button
                    onClick={handleAddAddress}
                    disabled={!isAddress(newAddress)}
                    size="sm"
                    className="shrink-0"
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Check
                </Button>
            </div>

            {/* Role Legend */}
            <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => {
                    const Icon = def.icon;
                    return (
                        <div
                            key={key}
                            className={`flex items-center gap-2 p-2 rounded-lg ${def.bgColor}`}
                        >
                            <Icon className={`w-4 h-4 ${def.color}`} />
                            <div>
                                <div className="text-[10px] font-bold text-gray-900 dark:text-white">{def.name}</div>
                                <div className="text-[9px] text-gray-500 dark:text-gray-400">{def.description}</div>
                            </div>
                        </div>
                    );
                })}
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
                        <span className="text-sm">Loading role matrix...</span>
                    </div>
                </div>
            )}

            {/* Role Holders Table */}
            {!loading && !error && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    <AnimatePresence>
                        {roleHolders.map((holder, idx) => (
                            <motion.div
                                key={holder.address}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`bg-white dark:bg-gray-800/50 border rounded-xl p-3 ${holder.isYou
                                        ? 'border-purple-300 dark:border-purple-700 ring-2 ring-purple-200 dark:ring-purple-800'
                                        : 'border-gray-200 dark:border-white/5'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Shield className={`w-4 h-4 ${holder.roles.defaultAdmin ? 'text-red-500' : 'text-gray-400'}`} />
                                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                                            {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                                        </span>
                                        {holder.isYou && (
                                            <span className="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full font-bold">
                                                You
                                            </span>
                                        )}
                                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                            {getRoleCount(holder.roles)} role{getRoleCount(holder.roles) !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <a
                                        href={`https://${getCurrentNetwork() === 'testnet' ? 'testnet.' : ''}bscscan.com/address/${holder.address}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                {/* Role badges */}
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => {
                                        const hasRole = holder.roles[key as keyof typeof holder.roles];
                                        const Icon = def.icon;
                                        return (
                                            <div
                                                key={key}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-opacity ${hasRole
                                                        ? `${def.bgColor} ${def.color}`
                                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 opacity-50'
                                                    }`}
                                            >
                                                <Icon className="w-3 h-3" />
                                                {def.name.split('_')[0]}
                                                {hasRole ? (
                                                    <Check className="w-3 h-3" />
                                                ) : (
                                                    <X className="w-3 h-3" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {roleHolders.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                            <p>Add an address above to check its roles</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
