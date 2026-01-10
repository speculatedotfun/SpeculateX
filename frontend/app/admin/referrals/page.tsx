'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Loader2, RefreshCw, FileText, ExternalLink } from 'lucide-react';

interface ReferralRecord {
    timestamp: number;
    referrer: string;
    user: string;
    txHash: string;
    marketId: number;
    amount: string;
    type: string;
}

export default function AdminReferralsPage() {
    const [data, setData] = useState<ReferralRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/referrals');
            const json = await res.json();
            if (Array.isArray(json)) {
                setData(json);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-[#0a0a0a]">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                <FileText className="w-8 h-8" />
                            </div>
                            Referral Logs
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                            Local filesystem log of all referral-attributed trades.
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-xs">Date</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-xs">Referrer</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-xs">Trader</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-xs text-right">Amount</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-xs text-center">TX</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading && data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                                <span className="text-gray-400 font-medium">Loading logs...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                                            No referral trades recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono">
                                                {new Date(row.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 rounded-lg px-2 py-1 text-xs w-min">
                                                {row.referrer.slice(0, 6)}...{row.referrer.slice(-4)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-900 dark:text-white">
                                                {row.user.slice(0, 6)}...{row.user.slice(-4)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900 dark:text-white">
                                                {Number(row.amount).toLocaleString()} USDC
                                                <span className="block text-[10px] text-gray-400 font-medium uppercase mt-0.5">{row.type}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <a
                                                    href={`https://testnet.bscscan.com/tx/${row.txHash}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-[#14B8A6] hover:bg-[#14B8A6]/10 transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
