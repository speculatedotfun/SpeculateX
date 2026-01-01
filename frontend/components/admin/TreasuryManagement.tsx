'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits, decodeFunctionData } from 'viem';
import { Shield, Wallet, Download, Upload, Settings, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { treasuryAbi, usdcAbi } from '@/lib/abis';
import { motion, AnimatePresence } from 'framer-motion';

export function TreasuryManagement() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { pushToast } = useToast();
    const { writeContractAsync } = useWriteContract();

    const addresses = getAddresses();
    const network = getCurrentNetwork();

    // State
    const [loading, setLoading] = useState(false);
    const [fastWithdrawForm, setFastWithdrawForm] = useState({ to: '', amount: '' });
    const [largeWithdrawForm, setLargeWithdrawForm] = useState({ to: '', amount: '' });
    const [limitForm, setLimitForm] = useState({ amount: '' });
    const [pendingWithdraws, setPendingWithdraws] = useState<any[]>([]);
    const [scanning, setScanning] = useState(false);
    const [currentTime, setCurrentTime] = useState(BigInt(Math.floor(Date.now() / 1000)));

    // Contract Reads
    const { data: dailyLimit, refetch: refetchLimit } = useReadContract({
        address: addresses.treasury,
        abi: treasuryAbi,
        functionName: 'dailyWithdrawLimit',
    });

    const { data: withdrawnToday, refetch: refetchWithdrawn } = useReadContract({
        address: addresses.treasury,
        abi: treasuryAbi,
        functionName: 'withdrawnTodayByToken',
        args: [addresses.usdc],
    });

    const { data: treasuryBalance, refetch: refetchBalance } = useReadContract({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'balanceOf',
        args: [addresses.treasury],
    });

    // Time ticker
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(BigInt(Math.floor(Date.now() / 1000)));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Event Scanning for Large Withdrawals
    const loadLargeWithdrawals = useCallback(async (force = false) => {
        if (!publicClient || scanning) return;
        setScanning(true);

        try {
            const startBlock = addresses.startBlock || 0n;
            const currentBlock = await publicClient.getBlockNumber();

            // Scanning in chunks 
            const chunkSize = 2000n;
            const allScheduledLogs: any[] = [];
            const allExecutedLogs: any[] = [];
            const allCancelledLogs: any[] = [];

            for (let i = currentBlock; i > startBlock; i -= chunkSize) {
                const chunkStart = i - chunkSize > startBlock ? i - chunkSize : startBlock;
                const chunkEnd = i;

                const [scheduled, executed, cancelled] = await Promise.all([
                    publicClient.getLogs({
                        address: addresses.treasury,
                        event: {
                            type: 'event',
                            name: 'LargeWithdrawScheduled',
                            inputs: [
                                { type: 'bytes32', name: 'opId', indexed: true },
                                { type: 'address', name: 'token', indexed: false },
                                { type: 'address', name: 'to', indexed: false },
                                { type: 'uint256', name: 'amount', indexed: false },
                                { type: 'uint256', name: 'readyAt', indexed: false },
                            ],
                        },
                        fromBlock: chunkStart,
                        toBlock: chunkEnd,
                    }),
                    publicClient.getLogs({
                        address: addresses.treasury,
                        event: {
                            type: 'event',
                            name: 'LargeWithdrawExecuted',
                            inputs: [{ type: 'bytes32', name: 'opId', indexed: true }],
                        },
                        fromBlock: chunkStart,
                        toBlock: chunkEnd,
                    }),
                    publicClient.getLogs({
                        address: addresses.treasury,
                        event: {
                            type: 'event',
                            name: 'LargeWithdrawCancelled',
                            inputs: [{ type: 'bytes32', name: 'opId', indexed: true }],
                        },
                        fromBlock: chunkStart,
                        toBlock: chunkEnd,
                    })
                ]);

                allScheduledLogs.push(...scheduled);
                allExecutedLogs.push(...executed);
                allCancelledLogs.push(...cancelled);

                // Limit scanning if we found some
                if (allScheduledLogs.length > 20) break;
            }

            const executedIds = new Set(allExecutedLogs.map(l => l.args.opId));
            const cancelledIds = new Set(allCancelledLogs.map(l => l.args.opId));

            const active = allScheduledLogs
                .filter(l => !executedIds.has(l.args.opId) && !cancelledIds.has(l.args.opId))
                .map(l => ({
                    opId: l.args.opId,
                    token: l.args.token,
                    to: l.args.to,
                    amount: l.args.amount,
                    readyAt: l.args.readyAt,
                    transactionHash: l.transactionHash,
                }))
                .sort((a, b) => Number(a.readyAt - b.readyAt));

            setPendingWithdraws(active);
        } catch (e) {
            console.error('Scan error:', e);
        } finally {
            setScanning(false);
        }
    }, [publicClient, addresses.treasury, addresses.startBlock, scanning]);

    useEffect(() => {
        loadLargeWithdrawals();
    }, [publicClient]);

    // Actions
    const handleFastWithdraw = async () => {
        if (!fastWithdrawForm.to || !fastWithdrawForm.amount) return;
        setLoading(true);
        try {
            const amountRaw = parseUnits(fastWithdrawForm.amount, 6); // USDC is 6 decimals on this testnet.

            const hash = await writeContractAsync({
                address: addresses.treasury,
                abi: treasuryAbi,
                functionName: 'withdraw',
                args: [addresses.usdc, fastWithdrawForm.to as `0x${string}`, amountRaw],
            });
            await publicClient?.waitForTransactionReceipt({ hash });
            pushToast({ title: 'Success', description: 'Withdrawal successful', type: 'success' });
            setFastWithdrawForm({ to: '', amount: '' });
            refetchBalance();
            refetchWithdrawn();
        } catch (e: any) {
            pushToast({ title: 'Error', description: e.shortMessage || e.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleLarge = async () => {
        if (!largeWithdrawForm.to || !largeWithdrawForm.amount) return;
        setLoading(true);
        try {
            const amountRaw = parseUnits(largeWithdrawForm.amount, 6);
            const hash = await writeContractAsync({
                address: addresses.treasury,
                abi: treasuryAbi,
                functionName: 'scheduleLargeWithdraw',
                args: [addresses.usdc, largeWithdrawForm.to as `0x${string}`, amountRaw],
            });
            await publicClient?.waitForTransactionReceipt({ hash });
            pushToast({ title: 'Success', description: 'Large withdrawal scheduled (24h timelock)', type: 'success' });
            setLargeWithdrawForm({ to: '', amount: '' });
            loadLargeWithdrawals(true);
        } catch (e: any) {
            pushToast({ title: 'Error', description: e.shortMessage || e.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteLarge = async (opId: `0x${string}`) => {
        setLoading(true);
        try {
            const hash = await writeContractAsync({
                address: addresses.treasury,
                abi: treasuryAbi,
                functionName: 'executeLargeWithdraw',
                args: [opId],
            });
            await publicClient?.waitForTransactionReceipt({ hash });
            pushToast({ title: 'Success', description: 'Large withdrawal executed', type: 'success' });
            loadLargeWithdrawals(true);
            refetchBalance();
        } catch (e: any) {
            pushToast({ title: 'Error', description: e.shortMessage || e.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelLarge = async (opId: `0x${string}`) => {
        setLoading(true);
        try {
            const hash = await writeContractAsync({
                address: addresses.treasury,
                abi: treasuryAbi,
                functionName: 'cancelLargeWithdraw',
                args: [opId],
            });
            await publicClient?.waitForTransactionReceipt({ hash });
            pushToast({ title: 'Success', description: 'Withdrawal cancelled', type: 'success' });
            loadLargeWithdrawals(true);
        } catch (e: any) {
            pushToast({ title: 'Error', description: e.shortMessage || e.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLimit = async () => {
        if (!limitForm.amount) return;
        setLoading(true);
        try {
            const amountRaw = parseUnits(limitForm.amount, 6);
            const hash = await writeContractAsync({
                address: addresses.treasury,
                abi: treasuryAbi,
                functionName: 'setDailyLimit',
                args: [amountRaw],
            });
            await publicClient?.waitForTransactionReceipt({ hash });
            pushToast({ title: 'Success', description: 'Daily limit updated', type: 'success' });
            setLimitForm({ amount: '' });
            refetchLimit();
        } catch (e: any) {
            pushToast({ title: 'Error', description: e.shortMessage || e.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const formatUSDC = (val: any) => {
        if (!val) return '0.00';
        return Number(formatUnits(val as bigint, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 p-6 rounded-2xl shadow-xl shadow-blue-500/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Wallet className="w-5 h-5 text-blue-500" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Treasury Balance</h4>
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">
                        {formatUSDC(treasuryBalance)} <span className="text-sm text-gray-400 font-medium">USDC</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 p-6 rounded-2xl shadow-xl shadow-purple-500/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Download className="w-5 h-5 text-purple-500" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Daily Limit</h4>
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">
                        {formatUSDC(dailyLimit)} <span className="text-sm text-gray-400 font-medium">USDC</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/5 p-6 rounded-2xl shadow-xl shadow-orange-500/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Upload className="w-5 h-5 text-orange-500" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Used Today</h4>
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">
                        {formatUSDC(withdrawnToday)} <span className="text-sm text-gray-400 font-medium">USDC</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Withdrawal Section */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/5 p-6 rounded-3xl shadow-xl">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Download className="w-6 h-6 text-green-500" /> Fast Withdrawal
                        </h3>
                        <p className="text-sm text-gray-500 mb-6 bg-green-500/5 p-3 rounded-xl border border-green-500/10">
                            Immediate withdrawal for amounts within the daily limit.
                        </p>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Recipient Address</label>
                                <Input
                                    placeholder="0x..."
                                    value={fastWithdrawForm.to}
                                    onChange={(e) => setFastWithdrawForm({ ...fastWithdrawForm, to: e.target.value })}
                                    className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Amount (USDC)</label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={fastWithdrawForm.amount}
                                    onChange={(e) => setFastWithdrawForm({ ...fastWithdrawForm, amount: e.target.value })}
                                    className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/10"
                                />
                            </div>
                            <Button
                                onClick={handleFastWithdraw}
                                disabled={loading || !fastWithdrawForm.to || !fastWithdrawForm.amount}
                                className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Execute Fast Withdraw'}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/5 p-6 rounded-3xl shadow-xl">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Clock className="w-6 h-6 text-amber-500" /> Timelocked Withdrawal
                        </h3>
                        <p className="text-sm text-gray-500 mb-6 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                            Required for large amounts. 24-hour security delay applies.
                        </p>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Recipient Address</label>
                                <Input
                                    placeholder="0x..."
                                    value={largeWithdrawForm.to}
                                    onChange={(e) => setLargeWithdrawForm({ ...largeWithdrawForm, to: e.target.value })}
                                    className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Amount (USDC)</label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={largeWithdrawForm.amount}
                                    onChange={(e) => setLargeWithdrawForm({ ...largeWithdrawForm, amount: e.target.value })}
                                    className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/10"
                                />
                            </div>
                            <Button
                                onClick={handleScheduleLarge}
                                disabled={loading || !largeWithdrawForm.to || !largeWithdrawForm.amount}
                                className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Schedule Large Withdraw'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Pending & Stats Section */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/5 p-6 rounded-3xl shadow-xl min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-6 h-6 text-blue-500" /> Pending Withdrawals
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadLargeWithdrawals(true)}
                                disabled={scanning}
                                className="text-blue-500 hover:bg-blue-500/5"
                            >
                                <LinkIcon className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
                                Scan
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {pendingWithdraws.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl"
                                    >
                                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20 text-green-500" />
                                        <p className="font-bold">No Pending Withdrawals</p>
                                        <p className="text-xs">Security timelock queue is empty.</p>
                                    </motion.div>
                                ) : (
                                    pendingWithdraws.map((op) => {
                                        const isReady = currentTime >= op.readyAt;
                                        const remaining = isReady ? 0n : op.readyAt - currentTime;

                                        return (
                                            <motion.div
                                                key={op.opId}
                                                layout
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="p-4 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-white/5 rounded-2xl relative overflow-hidden group"
                                            >
                                                {isReady && (
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                                                )}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="text-lg font-black text-gray-900 dark:text-white">
                                                            {formatUSDC(op.amount)} <span className="text-xs text-gray-500">USDC</span>
                                                        </div>
                                                        <div className="text-[10px] font-mono text-gray-400 mt-1 flex items-center gap-1">
                                                            To: {op.to.slice(0, 8)}...{op.to.slice(-6)}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {isReady ? (
                                                            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">READY</span>
                                                        ) : (
                                                            <div className="text-xs font-bold text-amber-500 flex items-center gap-1 justify-end">
                                                                <Clock className="w-3 h-3" />
                                                                {Math.floor(Number(remaining) / 3600)}h {Math.floor((Number(remaining) % 3600) / 60)}m
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        className={`flex-1 h-9 text-xs font-bold transition-all ${isReady ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}
                                                        disabled={!isReady || loading}
                                                        onClick={() => handleExecuteLarge(op.opId)}
                                                    >
                                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Execute'}
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        className="h-9 w-9 p-0 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-none"
                                                        disabled={loading}
                                                        onClick={() => handleCancelLarge(op.opId)}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/5 p-6 rounded-3xl shadow-xl">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Settings className="w-6 h-6 text-gray-400" /> Treasury Settings
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-1">New Daily Limit (USDC)</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={limitForm.amount}
                                        onChange={(e) => setLimitForm({ ...limitForm, amount: e.target.value })}
                                        className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/10"
                                    />
                                    <Button
                                        onClick={handleUpdateLimit}
                                        disabled={loading || !limitForm.amount}
                                        className="bg-gray-900 dark:bg-white dark:text-gray-900 font-bold"
                                    >
                                        Update
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
