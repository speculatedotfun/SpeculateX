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
        <div className="min-h-screen relative overflow-hidden font-sans selection:bg-[#14B8A6]/30">

            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-gray-50 dark:bg-[#0B1121]">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] invert dark:invert-0" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#14B8A6]/5 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            <Header />

            <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24">

                {/* Hero Section */}
                <div className="text-center mb-12 relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-white/20 backdrop-blur-md text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4 shadow-sm"
                    >
                        <Sparkles className="w-2.5 h-2.5 text-[#14B8A6]" /> Live Rankings
                    </motion.div>

                    <motion.h1
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-500 tracking-tighter mb-4"
                    >
                        Leaderboard
                    </motion.h1>

                    <motion.p
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-light leading-relaxed"
                    >
                        Compete with the top traders. Prove your skill. <span className="text-[#14B8A6] font-medium">Claim your throne.</span>
                    </motion.p>
                </div>

                {/* Stats Row */}
                <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12"
                >
                    <StatCard
                        title="Active Traders"
                        value={users.length.toString()}
                        icon={Users}
                        color="text-blue-500"
                        bgColor="bg-blue-500/10"
                        borderColor="border-blue-500/10"
                    />
                    <StatCard
                        title="Total Volume"
                        value={formatCurrency(users.reduce((acc, u) => acc + u.totalVolume, 0))}
                        icon={TrendingUp}
                        color="text-[#14B8A6]"
                        bgColor="bg-[#14B8A6]/10"
                        borderColor="border-[#14B8A6]/10"
                    />
                    <StatCard
                        title="Total Trades"
                        value={formatNumber(users.reduce((acc, u) => acc + u.totalTrades, 0))}
                        icon={Activity}
                        color="text-purple-500"
                        bgColor="bg-purple-500/10"
                        borderColor="border-purple-500/10"
                    />
                    <StatCard
                        title="Points Cap"
                        value={formatNumber(users.reduce((acc, u) => acc + u.points, 0))}
                        icon={Zap}
                        color="text-amber-500"
                        bgColor="bg-amber-500/10"
                        borderColor="border-amber-500/10"
                    />
                </motion.div>

                {isLoading ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        {/* Top 3 Podium */}
                        {top3.length > 0 && !search && (
                            <div className="relative mb-12">
                                <div className="absolute inset-0 bg-gradient-to-b from-[#14B8A6]/5 to-transparent blur-3xl -z-10 rounded-full" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-end max-w-7xl mx-auto">
                                    {/* 2nd Place */}
                                    {top3[1] && (
                                        <div className="order-2 md:order-1">
                                            <PodiumCard user={top3[1]} place={2} prefersReducedMotion={prefersReducedMotion} nicknames={nicknames} />
                                        </div>
                                    )}

                                    {/* 1st Place */}
                                    {top3[0] && (
                                        <div className="order-1 md:order-2 -mt-8 z-20">
                                            <PodiumCard user={top3[0]} place={1} prefersReducedMotion={prefersReducedMotion} nicknames={nicknames} />
                                        </div>
                                    )}

                                    {/* 3rd Place */}
                                    {top3[2] && (
                                        <div className="order-3 md:order-3">
                                            <PodiumCard user={top3[2]} place={3} prefersReducedMotion={prefersReducedMotion} nicknames={nicknames} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Controls Bar */}
                        <div className="sticky top-20 z-30 mb-6 max-w-7xl mx-auto">
                            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-1.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-lg flex flex-col md:flex-row gap-2 items-center justify-between">

                                {/* Search */}
                                <div className="relative flex-1 w-full md:max-w-md group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-[#14B8A6] transition-colors" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by address..."
                                        className="pl-9 h-9 bg-transparent border-transparent focus:bg-white dark:focus:bg-gray-800 rounded-lg transition-all text-sm"
                                    />
                                </div>

                                {/* Filters */}
                                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-lg w-full md:w-auto">
                                    {['all', '24h', '7d'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeRange(t as any)}
                                            className={cn(
                                                "flex-1 md:flex-none px-4 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                                                timeRange === t
                                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                            )}
                                        >
                                            {t === 'all' ? 'All Time' : t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Table */}
                        <motion.div
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="max-w-7xl mx-auto bg-white/70 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/5 shadow-2xl overflow-hidden"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                                            <th className="px-4 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest w-16">Rank</th>
                                            <th className="px-4 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Trader</th>
                                            <th className="px-4 py-3 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Activity</th>
                                            <th className="px-4 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume/Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {/* Always display all filtered users to confirm data visibility if total count is low */}
                                        {filteredUsers.map((user) => (
                                            <LeaderboardRow key={user.address} user={user} isCurrentUser={user.address.toLowerCase() === userAddress?.toLowerCase()} nicknames={nicknames} />
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-16 text-center">
                                                    <div className="flex flex-col items-center gap-3 opacity-50">
                                                        <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-full">
                                                            <Search className="w-6 h-6" />
                                                        </div>
                                                        <p className="text-base font-medium">No traders found matching "{search}"</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
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
                        className="fixed bottom-4 inset-x-0 mx-auto max-w-xl px-4 z-50 pointer-events-none"
                    >
                        <div className="bg-gray-900/90 dark:bg-white/90 backdrop-blur-xl text-white dark:text-gray-900 p-3 rounded-xl shadow-2xl flex items-center justify-between pointer-events-auto border border-white/10 dark:border-gray-900/10">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Your Rank</span>
                                    <div className="text-lg font-black leading-none">#{currentUserStats.rank}</div>
                                </div>
                                <div className="h-6 w-px bg-white/20 dark:bg-black/10" />
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Points</span>
                                    <div className="text-sm font-bold leading-none">{formatNumber(currentUserStats.points)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Sparkline data={generateActivityData(currentUserStats.address)} color={currentUserStats.rank <= 3 ? '#EAB308' : '#14B8A6'} width={50} height={18} />
                                <div className="px-2 py-1 bg-white/10 dark:bg-black/10 rounded-md text-[10px] font-bold">
                                    {formatCurrency(currentUserStats.totalVolume)} Vol
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bgColor, borderColor }: any) {
    return (
        <div className={`bg-white/60 dark:bg-gray-800/40 backdrop-blur-xl rounded-xl p-4 border ${borderColor ? borderColor : 'border-gray-100'} shadow-sm flex flex-col items-start gap-3 hover:scale-[1.02] transition-transform`}>
            <div className={`p-2 rounded-lg ${bgColor} ${color}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <div className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-1">{value}</div>
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{title}</div>
            </div>
        </div>
    );
}

function PodiumCard({ user, place, prefersReducedMotion = false, nicknames = {} }: { user: LeaderboardUser, place: number, prefersReducedMotion?: boolean, nicknames?: Record<string, string> }) {
    const isFirst = place === 1;
    const isSecond = place === 2;
    const isThird = place === 3;

    let bgClass = '';
    let borderClass = '';
    let textClass = '';
    let shadowClass = '';
    let icon = <Award className="w-8 h-8" />;
    let label = 'Bronze';

    if (isFirst) {
        bgClass = 'bg-gradient-to-b from-yellow-500/10 to-yellow-500/5 dark:from-yellow-400/10 dark:to-yellow-400/5';
        borderClass = 'border-yellow-500/20';
        textClass = 'text-yellow-600 dark:text-yellow-400';
        shadowClass = 'shadow-yellow-500/10';
        icon = <Crown className="w-7 h-7" />;
        label = 'Champion';
    } else if (isSecond) {
        bgClass = 'bg-gradient-to-b from-slate-400/10 to-slate-400/5';
        borderClass = 'border-slate-400/20';
        textClass = 'text-slate-600 dark:text-slate-300';
        shadowClass = 'shadow-slate-400/10';
        icon = <Medal className="w-6 h-6" />;
        label = 'Silver';
    } else {
        bgClass = 'bg-gradient-to-b from-orange-400/10 to-orange-400/5';
        borderClass = 'border-orange-400/20';
        textClass = 'text-orange-600 dark:text-orange-400';
        shadowClass = 'shadow-orange-400/10';
        icon = <Medal className="w-6 h-6" />;
    }

    return (
        <motion.div
            initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
                "relative rounded-2xl p-5 flex flex-col items-center border backdrop-blur-xl shadow-xl transition-all hover:-translate-y-1 duration-300",
                bgClass, borderClass, shadowClass
            )}
        >
            <div className={cn("absolute -top-6 mb-3 p-2.5 rounded-full bg-white dark:bg-gray-900 shadow-lg border", borderClass, textClass)}>
                {icon}
            </div>

            <div className="mt-6 text-center">
                <div className="font-bold text-sm mb-1 dark:text-white flex items-center justify-center gap-1">
                    {getDisplayName(user.address, nicknames)}
                </div>

                <div className={cn("text-[9px] font-black uppercase tracking-widest mb-4", textClass)}>
                    {label}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full text-center border-t border-gray-200/50 dark:border-white/5 pt-3">
                    <div>
                        <div className="text-[8px] font-bold uppercase text-gray-400 tracking-wider mb-1">Score</div>
                        <div className={cn("text-base font-black", textClass)}>{formatNumber(user.points)}</div>
                    </div>
                    <div>
                        <div className="text-[8px] font-bold uppercase text-gray-400 tracking-wider mb-1">Volume</div>
                        <div className="text-sm font-bold dark:text-gray-300">{formatNumber(user.totalVolume)}</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function LeaderboardRow({ user, isCurrentUser, nicknames = {} }: { user: LeaderboardUser, isCurrentUser: boolean, nicknames?: Record<string, string> }) {
    return (
        <tr className={cn(
            "group transition-colors",
            isCurrentUser ? "bg-[#14B8A6]/5" : "hover:bg-gray-50 dark:hover:bg-white/5"
        )}>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs",
                    user.rank <= 3 ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500"
                )}>
                    {user.rank}
                </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                            <span className={nicknames[user.address.toLowerCase()] ? '' : 'font-mono'}>
                                {getDisplayName(user.address, nicknames)}
                            </span>
                            {isCurrentUser && <span className="px-1.5 py-0.5 rounded bg-[#14B8A6] text-white text-[8px] font-bold uppercase">You</span>}
                            {user.rank <= 10 && <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
                        </div>
                        <div className="text-[9px] font-semibold text-gray-400">{user.totalTrades} Trades</div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                <div className="flex justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                    <Sparkline data={generateActivityData(user.address)} color={user.rank <= 3 ? '#EAB308' : '#14B8A6'} width={60} height={20} />
                </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-right">
                <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-black text-gray-900 dark:text-white">{formatNumber(user.points)} PTS</span>
                    <span className="text-[9px] font-medium text-gray-400 font-mono">${formatNumber(user.totalVolume)} Vol</span>
                </div>
            </td>
        </tr>
    );
}

function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-80">
                <div className="bg-gray-200 dark:bg-gray-800 rounded-3xl" />
                <div className="bg-gray-200 dark:bg-gray-800 rounded-3xl -mt-12" />
                <div className="bg-gray-200 dark:bg-gray-800 rounded-3xl" />
            </div>
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}
