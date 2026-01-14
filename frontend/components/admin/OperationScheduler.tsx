'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Settings, AlertTriangle, Pause, Play } from 'lucide-react';
import { encodeAbiParameters } from 'viem';
import { OP_TAGS } from './useAdminOperations';
import { getAddresses } from '@/lib/contracts';

interface OperationSchedulerProps {
    activeTab: 'router' | 'treasury' | 'emergency';
    loading: boolean;
    onSchedule: (tag: `0x${string}`, data: `0x${string}`, msg: string) => Promise<any>;
}

export function OperationScheduler({
    activeTab,
    loading,
    onSchedule,
}: OperationSchedulerProps) {
    const [setFacetForm, setSetFacetForm] = useState({ selector: '', address: '' });
    const [removeFacetForm, setRemoveFacetForm] = useState({ selector: '' });
    const [treasuryForm, setTreasuryForm] = useState({ address: '' });
    const [resolverForm, setResolverForm] = useState({ address: '' });
    const [ethRecoveryForm, setEthRecoveryForm] = useState({ address: '' });
    const [cancelMarketForm, setCancelMarketForm] = useState({ marketId: '' });

    const addresses = getAddresses();

    const handleScheduleSetFacet = async () => {
        if (!setFacetForm.selector || !setFacetForm.address) return;
        const data = encodeAbiParameters(
            [{ type: 'bytes4' }, { type: 'address' }],
            [setFacetForm.selector as `0x${string}`, setFacetForm.address as `0x${string}`]
        );
        await onSchedule(OP_TAGS.OP_SET_FACET as `0x${string}`, data, 'Facet registration scheduled');
        setSetFacetForm({ selector: '', address: '' });
    };

    const handleQuickFillFacet = (addr: string) => {
        setSetFacetForm(prev => ({ ...prev, address: addr }));
    };

    if (activeTab === 'router') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5" /> Facet Management
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 p-3 rounded-lg space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase">Set Facet</h4>
                        <Input
                            placeholder="Selector (0x...)"
                            value={setFacetForm.selector}
                            onChange={(e) => setSetFacetForm({ ...setFacetForm, selector: e.target.value })}
                            className="h-9 text-xs bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10"
                        />
                        <Input
                            placeholder="Facet Address"
                            value={setFacetForm.address}
                            onChange={(e) => setSetFacetForm({ ...setFacetForm, address: e.target.value })}
                            className="h-9 text-xs bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10"
                        />
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(addresses.facets || {}).map(([name, addr]) => (
                                <button
                                    key={name}
                                    onClick={() => handleQuickFillFacet(addr)}
                                    className="px-2 py-0.5 text-[9px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                        <Button onClick={handleScheduleSetFacet} disabled={!setFacetForm.selector || !setFacetForm.address || loading} className="w-full h-9 text-xs">
                            Schedule
                        </Button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 p-3 rounded-lg space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase">Remove Facet</h4>
                        <Input
                            placeholder="Selector"
                            value={removeFacetForm.selector}
                            onChange={(e) => setRemoveFacetForm({ ...removeFacetForm, selector: e.target.value })}
                            className="h-9 text-xs bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10"
                        />
                        <Button variant="destructive" onClick={async () => {
                            if (!removeFacetForm.selector) return;
                            const data = encodeAbiParameters([{ type: 'bytes4' }], [removeFacetForm.selector as `0x${string}`]);
                            await onSchedule(OP_TAGS.OP_REMOVE_FACET as `0x${string}`, data, 'Facet removal scheduled');
                            setRemoveFacetForm({ selector: '' });
                        }} disabled={!removeFacetForm.selector || loading} className="w-full h-9 text-xs">
                            Remove
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5" /> Core Config
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 p-3 rounded-lg space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase">Set Treasury</h4>
                        <Input
                            placeholder="Treasury Address"
                            value={treasuryForm.address}
                            onChange={(e) => setTreasuryForm({ ...treasuryForm, address: e.target.value })}
                            className="h-9 text-xs bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10"
                        />
                        <Button onClick={async () => {
                            if (!treasuryForm.address) return;
                            const data = encodeAbiParameters([{ type: 'address' }], [treasuryForm.address as `0x${string}`]);
                            await onSchedule(OP_TAGS.OP_SET_TREASURY as `0x${string}`, data, 'Treasury update scheduled');
                            setTreasuryForm({ address: '' });
                        }} disabled={!treasuryForm.address || loading} className="w-full h-9 text-xs border-blue-500/20 hover:bg-blue-500/10 text-blue-500">
                            Schedule
                        </Button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 p-3 rounded-lg space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase">Set Resolver</h4>
                        <Input
                            placeholder="Resolver Address"
                            value={resolverForm.address}
                            onChange={(e) => setResolverForm({ ...resolverForm, address: e.target.value })}
                            className="h-9 text-xs bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10"
                        />
                        <Button onClick={async () => {
                            if (!resolverForm.address) return;
                            const data = encodeAbiParameters([{ type: 'address' }], [resolverForm.address as `0x${string}`]);
                            await onSchedule(OP_TAGS.OP_SET_RESOLVER as `0x${string}`, data, 'Resolver update scheduled');
                            setResolverForm({ address: '' });
                        }} disabled={!resolverForm.address || loading} className="w-full h-9 text-xs border-purple-500/20 hover:bg-purple-500/10 text-purple-500">
                            Schedule
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === 'emergency') {
        return (
            <div className="space-y-4">
                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl">
                    <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Danger Zone
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="destructive"
                            className="h-16 text-sm font-bold flex flex-col gap-1"
                            onClick={() => onSchedule(OP_TAGS.OP_PAUSE as `0x${string}`, '0x' as `0x${string}`, 'Pause scheduled')}
                            disabled={loading}
                        >
                            <Pause className="w-5 h-5" />
                            PAUSE
                        </Button>
                        <Button
                            className="h-16 text-sm font-bold flex flex-col gap-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => onSchedule(OP_TAGS.OP_UNPAUSE as `0x${string}`, '0x' as `0x${string}`, 'Unpause scheduled')}
                            disabled={loading}
                        >
                            <Play className="w-5 h-5" />
                            UNPAUSE
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 p-3 rounded-lg space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase">Recover ETH</h4>
                        <Input
                            placeholder="Recipient"
                            value={ethRecoveryForm.address}
                            onChange={(e) => setEthRecoveryForm({ ...ethRecoveryForm, address: e.target.value })}
                            className="h-9 text-xs bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10"
                        />
                        <Button onClick={async () => {
                            if (!ethRecoveryForm.address) return;
                            const data = encodeAbiParameters([{ type: 'address' }], [ethRecoveryForm.address as `0x${string}`]);
                            await onSchedule(OP_TAGS.OP_RECOVER_ETH as `0x${string}`, data, 'ETH recovery scheduled');
                            setEthRecoveryForm({ address: '' });
                        }} disabled={!ethRecoveryForm.address || loading} className="w-full h-9 text-xs">
                            Recover
                        </Button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 p-3 rounded-lg space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase">Cancel Market</h4>
                        <Input
                            placeholder="Market ID"
                            value={cancelMarketForm.marketId}
                            onChange={(e) => setCancelMarketForm({ ...cancelMarketForm, marketId: e.target.value })}
                            className="h-9 text-xs bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10"
                        />
                        <Button onClick={async () => {
                            if (!cancelMarketForm.marketId) return;
                            const data = encodeAbiParameters([{ type: 'uint256' }], [BigInt(cancelMarketForm.marketId)]);
                            await onSchedule(OP_TAGS.OP_CANCEL_MARKET as `0x${string}`, data, 'Market cancellation scheduled');
                            setCancelMarketForm({ marketId: '' });
                        }} disabled={!cancelMarketForm.marketId || loading} variant="destructive" className="w-full h-9 text-xs">
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
