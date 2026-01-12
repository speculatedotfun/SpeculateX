'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import { useLeaderboard, type LeaderboardUser } from '@/lib/hooks/useLeaderboard';
import { useAccount } from 'wagmi';
import { Trophy, Medal, Award, TrendingUp, Users, Activity, Search, Zap, Crown, SlidersHorizontal, ArrowUpRight, Sparkles } from 'lucide-react';
import { Sparkline } from '@/components/market/Sparkline';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useNicknames, getDisplayName } from '@/lib/hooks/useNicknames';

// Helper to format numbers
const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
};

const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(num);
};

// Simulated activity data for sparklines
const generateActivityData = (address: string) => {
    const seed = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const data = [];
    let current = 50;
    for (let i = 0; i < 15; i++) {
        const random = Math.sin(seed + i) * 20;
        current += random;
        data.push(Math.max(10, current));
    }
    return data;
};

export default function LeaderboardPage() {
    const { data: users = [], isLoading } = useLeaderboard();
    const { address: userAddress } = useAccount();
    const { nicknames } = useNicknames();
    const [search, setSearch] = useState('');
    const [timeRange, setTimeRange] = useState<'all' | '24h' | '7d'>('all');
    const [isScrolled, setIsScrolled] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 100);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Filter & Search Logic
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const addressMatch = user.address.toLowerCase().includes(search.toLowerCase());
            const nickname = nicknames[user.address.toLowerCase()];
            const nicknameMatch = nickname && nickname.toLowerCase().includes(search.toLowerCase());
            return addressMatch || nicknameMatch;
        });
    }, [users, search, nicknames]);

    const top3 = filteredUsers.slice(0, 3);
    // Show everyone in the table, even if in podium, unless there are many users (e.g. > 10)
    // For now, let's just show everyone to be safe and avoid "empty table" confusion.
    // Or better: If filteredUsers.length <= 3, show them. If > 3, we can hide top 3.
    const showAllInTable = filteredUsers.length <= 5;
    const tableUsers = showAllInTable ? filteredUsers : filteredUsers.slice(3);

    // Current User Stats
    const currentUserStats = useMemo(() => {
        if (!userAddress) return null;
        return users.find(u => u.address.toLowerCase() === userAddress.toLowerCase());
    }, [users, userAddress]);

    return (
        <div className="min-h-screen relative font-sans selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white pb-20">

            {/* Background Gradient - Match Markets/Portfolio */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-[#FAF9FF] dark:bg-[#0f1219]">
                <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[bottom_1px_center]"></div>
                <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-teal-400/10 blur-[120px]" />
                <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
            </div>

            <Header />

            <main className="relative z-10 mx-auto max-w-[1440px] px-6 py-6">

                {/* Dashboard Header - Match Markets/Portfolio */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Leaderboard
                    </h1>
                </div>

                {isLoading ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        {/* Top 3 Podium */}
                        {top3.length > 0 && !search && (
                            <div className="mb-8">
                                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-end justify-center">
                                    {/* 2nd Place */}
                                    {top3[1] && (
                                        <div className="order-2 md:order-1 w-full md:w-64">
                                            <PodiumCard user={top3[1]} place={2} prefersReducedMotion={prefersReducedMotion} nicknames={nicknames} />
                                        </div>
                                    )}

                                    {/* 1st Place */}
                                    {top3[0] && (
                                        <div className="order-1 md:order-2 -mt-12 z-20 w-full md:w-72">
                                            <PodiumCard user={top3[0]} place={1} prefersReducedMotion={prefersReducedMotion} nicknames={nicknames} />
                                        </div>
                                    )}

                                    {/* 3rd Place */}
                                    {top3[2] && (
                                        <div className="order-3 md:order-3 w-full md:w-64">
                                            <PodiumCard user={top3[2]} place={3} prefersReducedMotion={prefersReducedMotion} nicknames={nicknames} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Controls Bar */}
                        <div className="sticky top-20 z-30 mb-6">
                            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-2 flex flex-col md:flex-row gap-3 items-center justify-between">

                                {/* Search */}
                                <div className="relative flex-1 w-full md:max-w-md group">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by address..."
                                        className="pl-10 h-10 bg-white/50 dark:bg-black/20 border-transparent focus:bg-white dark:focus:bg-black/40 rounded-xl transition-all text-sm shadow-inner"
                                    />
                                </div>

                                {/* Filters */}
                                <div className="flex bg-gray-100/50 dark:bg-white/5 p-1 rounded-xl w-full md:w-auto">
                                    {['all', '24h', '7d'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeRange(t as any)}
                                            className={cn(
                                                "flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                                timeRange === t
                                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5"
                                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50"
                                            )}
                                        >
                                            {t === 'all' ? 'All Time' : t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Table */}
                        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50 dark:bg-gray-800/10">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-20">Rank</th>
                                            <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Trader</th>
                                            <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Activity</th>
                                            <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                        {/* Always display all filtered users to confirm data visibility if total count is low */}
                                        {filteredUsers.map((user) => (
                                            <LeaderboardRow key={user.address} user={user} isCurrentUser={user.address.toLowerCase() === userAddress?.toLowerCase()} nicknames={nicknames} />
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                                        <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full">
                                                            <Search className="w-8 h-8" />
                                                        </div>
                                                        <p className="text-lg font-medium">No traders found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Sticky User Stats Footer */}
            <AnimatePresence>
                {currentUserStats && isScrolled && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-6 inset-x-0 mx-auto max-w-xl px-4 z-50 pointer-events-none"
                    >
                        <div className="bg-gray-900/90 dark:bg-white/90 backdrop-blur-xl text-white dark:text-gray-900 p-4 rounded-2xl shadow-2xl flex items-center justify-between pointer-events-auto border border-white/10 dark:border-gray-900/10 hover:scale-[1.02] transition-transform">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Your Rank</span>
                                    <div className="text-xl font-black leading-none">#{currentUserStats.rank}</div>
                                </div>
                                <div className="h-8 w-px bg-white/20 dark:bg-black/10" />
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Points</span>
                                    <div className="text-base font-bold leading-none">{formatNumber(currentUserStats.points)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Sparkline data={generateActivityData(currentUserStats.address)} color={currentUserStats.rank <= 3 ? '#EAB308' : '#14B8A6'} width={60} height={24} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

function StatCard({ title, value, icon: Icon, color }: any) {
    return (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 flex flex-col items-start gap-4 w-full sm:w-56 group">
            <div className={cn("p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 transition-colors", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">{value}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</div>
            </div>
        </div>
    );
}

function PodiumCard({ user, place, prefersReducedMotion = false, nicknames = {} }: { user: LeaderboardUser, place: number, prefersReducedMotion?: boolean, nicknames?: Record<string, string> }) {
    const isFirst = place === 1;
    const isSecond = place === 2;
    const isThird = place === 3;

    let borderClass = '';
    let textClass = '';
    let shadowClass = '';
    let icon = <Award className="w-8 h-8" />;
    let label = 'Bronze';
    let gradient = '';

    if (isFirst) {
        borderClass = 'border-yellow-400/40 dark:border-yellow-400/30';
        textClass = 'text-yellow-600 dark:text-yellow-400';
        icon = <Crown className="w-8 h-8" />;
        label = 'Champion';
    } else if (isSecond) {
        borderClass = 'border-slate-300/40 dark:border-slate-500/30';
        textClass = 'text-slate-600 dark:text-slate-300';
        icon = <Medal className="w-7 h-7" />;
        label = 'Silver';
    } else {
        borderClass = 'border-orange-400/40 dark:border-orange-400/30';
        textClass = 'text-orange-600 dark:text-orange-400';
        icon = <Medal className="w-7 h-7" />;
    }

    return (
        <motion.div
            initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
                "relative rounded-2xl p-6 flex flex-col items-center border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:-translate-y-1 duration-300 bg-white dark:bg-gray-900",
                borderClass
            )}
        >
            <div className={cn("absolute -top-6 mb-4 p-3 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 relative z-10", borderClass, textClass)}>
                {icon}
            </div>

            <div className="mt-8 text-center relative z-10 w-full">
                <div className="font-bold text-lg mb-1 dark:text-white flex items-center justify-center gap-1.5 truncate px-2">
                    {getDisplayName(user.address, nicknames)}
                </div>

                <div className={cn("text-[10px] font-black uppercase tracking-widest mb-6", textClass)}>
                    {label}
                </div>

                <div className="w-full text-center border-t border-gray-200/50 dark:border-white/5 pt-4">
                    <div className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1">Points</div>
                    <div className={cn("text-2xl font-black tracking-tight", textClass)}>{formatNumber(user.points)}</div>
                </div>
            </div>
        </motion.div>
    );
}

function LeaderboardRow({ user, isCurrentUser, nicknames = {} }: { user: LeaderboardUser, isCurrentUser: boolean, nicknames?: Record<string, string> }) {
    return (
        <tr className={cn(
            "group transition-colors",
            isCurrentUser && "bg-teal-50/30 dark:bg-teal-900/10"
        )}>
            <td className="px-4 py-3">
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                    user.rank <= 3
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                        : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                )}>
                    {user.rank}
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <span className={nicknames[user.address.toLowerCase()] ? '' : 'font-mono'}>
                                {getDisplayName(user.address, nicknames)}
                            </span>
                            {isCurrentUser && <span className="px-1.5 py-0.5 rounded-md bg-teal-500 text-white text-[9px] font-bold uppercase">You</span>}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">{user.totalTrades} Trades</div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                    <Sparkline data={generateActivityData(user.address)} color={user.rank <= 3 ? '#EAB308' : '#14B8A6'} width={80} height={24} />
                </div>
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatNumber(user.points)}</span>
                    <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Points</span>
                </div>
            </td>
        </tr>
    );
}

function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-80">
                <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl -mt-12" />
                <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            </div>
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="space-y-0">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0" />
                    ))}
                </div>
            </div>
        </div>
    );
}
