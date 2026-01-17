'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import { useLeaderboard, type LeaderboardUser } from '@/lib/hooks/useLeaderboard';
import { useAccount } from 'wagmi';
import { Trophy, Medal, Award, Activity, Search, Crown, SlidersHorizontal, ArrowUpRight, Sparkles } from 'lucide-react';
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
        <div className="flex-1 flex flex-col relative font-sans selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white">

            {/* Background Gradient - Match Markets/Portfolio */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-[#FAF9FF] dark:bg-[#0f1219]">
                <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[bottom_1px_center]"></div>
                <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-teal-400/10 blur-[120px]" />
                <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
            </div>

            <Header />

            <main className="flex-1 relative z-10 mx-auto max-w-[1440px] w-full px-6 py-6">

                {/* Dashboard Header with Stats */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                                Leaderboard
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Compete with other traders and climb the ranks
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <div>
                                    <div className="text-xl font-black text-gray-900 dark:text-white">{users.length}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Traders</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <div>
                                    <div className="text-xl font-black text-gray-900 dark:text-white">
                                        {formatNumber(users.reduce((sum, u) => sum + u.points, 0))}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Points</div>
                                </div>
                            </div>
                            {currentUserStats && (
                                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl border border-teal-200 dark:border-teal-800 shadow-sm">
                                    <div>
                                        <div className="text-xl font-black text-teal-600 dark:text-teal-400">#{currentUserStats.rank}</div>
                                        <div className="text-[10px] font-bold text-teal-500 uppercase tracking-wider">Your Rank</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        {/* Top 3 Podium */}
                        {top3.length > 0 && !search && (
                            <div className="mb-10">
                                {/* Podium Title */}
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-full border border-yellow-500/20">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Top Traders</span>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-end justify-center max-w-4xl mx-auto">
                                    {/* 2nd Place - Left */}
                                    {top3[1] && (
                                        <motion.div
                                            className="order-2 md:order-1 w-full md:w-72 md:mb-0"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <PodiumCard user={top3[1]} place={2} prefersReducedMotion={prefersReducedMotion} nicknames={nicknames} />
                                        </motion.div>
                                    )}

                                    {/* 1st Place - Center & Elevated */}
                                    {top3[0] && (
                                        <motion.div
                                            className="order-1 md:order-2 w-full md:w-80 md:-mt-8 z-20"
                                            initial={{ opacity: 0, y: -20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0 }}
                                        >
                                            <PodiumCard user={top3[0]} place={1} prefersReducedMotion={prefersReducedMotion} nicknames={nicknames} />
                                        </motion.div>
                                    )}

                                    {/* 3rd Place - Right */}
                                    {top3[2] && (
                                        <motion.div
                                            className="order-3 md:order-3 w-full md:w-72 md:mb-0"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            <PodiumCard user={top3[2]} place={3} prefersReducedMotion={prefersReducedMotion} nicknames={nicknames} />
                                        </motion.div>
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
                            {/* Table Header Label */}
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">All Rankings</span>
                                </div>
                                <span className="text-xs font-bold text-gray-400">{filteredUsers.length} traders</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/80 dark:bg-gray-800/30">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest w-20">Rank</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Trader</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest hidden md:table-cell">Activity</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                        {filteredUsers.map((user) => (
                                            <LeaderboardRow key={user.address} user={user} isCurrentUser={user.address.toLowerCase() === userAddress?.toLowerCase()} nicknames={nicknames} />
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-16 text-center">
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="flex flex-col items-center gap-4"
                                                    >
                                                        <div className="p-5 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                                                            <Search className="w-10 h-10 text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">No traders found</p>
                                                            <p className="text-sm text-gray-500">Try adjusting your search query</p>
                                                        </div>
                                                    </motion.div>
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

    const config = {
        1: {
            gradient: 'from-yellow-400/20 via-amber-300/10 to-yellow-500/5',
            borderClass: 'border-yellow-400/50 dark:border-yellow-500/40',
            textClass: 'text-yellow-600 dark:text-yellow-400',
            iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
            glowClass: 'shadow-xl shadow-yellow-500/30',
            icon: <Crown className="w-8 h-8 text-white" />,
            label: 'Champion',
            rankBg: 'bg-yellow-500',
        },
        2: {
            gradient: 'from-slate-300/20 via-gray-200/10 to-slate-400/5',
            borderClass: 'border-slate-300/50 dark:border-slate-500/40',
            textClass: 'text-slate-600 dark:text-slate-300',
            iconBg: 'bg-gradient-to-br from-slate-400 to-slate-500',
            glowClass: 'shadow-lg shadow-slate-400/20',
            icon: <Medal className="w-7 h-7 text-white" />,
            label: 'Silver',
            rankBg: 'bg-slate-400',
        },
        3: {
            gradient: 'from-orange-400/20 via-amber-300/10 to-orange-500/5',
            borderClass: 'border-orange-400/50 dark:border-orange-500/40',
            textClass: 'text-orange-600 dark:text-orange-400',
            iconBg: 'bg-gradient-to-br from-orange-400 to-amber-600',
            glowClass: 'shadow-lg shadow-orange-400/20',
            icon: <Medal className="w-7 h-7 text-white" />,
            label: 'Bronze',
            rankBg: 'bg-orange-500',
        },
    }[place] || config[3];

    return (
        <motion.div
            initial={prefersReducedMotion ? false : { y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: place === 1 ? 0.1 : place === 2 ? 0 : 0.2, duration: 0.5 }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            className={cn(
                "relative rounded-3xl p-6 flex flex-col items-center border-2 transition-all duration-300 overflow-hidden",
                `bg-gradient-to-b ${config.gradient}`,
                config.borderClass,
                config.glowClass,
                "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
            )}
        >
            {/* Animated shine effect for first place */}
            {isFirst && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 2 }}
                />
            )}

            {/* Rank badge */}
            <div className={cn(
                "absolute -top-0 -right-0 w-12 h-12 flex items-center justify-center",
                config.rankBg,
                "rounded-bl-2xl rounded-tr-3xl"
            )}>
                <span className="text-white font-black text-lg">#{place}</span>
            </div>

            {/* Icon container */}
            <div className={cn(
                "relative z-10 p-4 rounded-2xl mb-4",
                config.iconBg,
                config.glowClass
            )}>
                {config.icon}
            </div>

            <div className="text-center relative z-10 w-full">
                {/* Username */}
                <div className="font-black text-xl mb-1 text-gray-900 dark:text-white truncate px-2">
                    {getDisplayName(user.address, nicknames)}
                </div>

                {/* Label */}
                <div className={cn("text-xs font-black uppercase tracking-widest mb-4", config.textClass)}>
                    {config.label}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200/50 dark:border-white/10">
                    <div className="text-center">
                        <div className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1">Points</div>
                        <div className={cn("text-2xl font-black tracking-tight", config.textClass)}>
                            {formatNumber(user.points)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1">Trades</div>
                        <div className="text-2xl font-black tracking-tight text-gray-700 dark:text-gray-300">
                            {user.totalTrades}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function LeaderboardRow({ user, isCurrentUser, nicknames = {} }: { user: LeaderboardUser, isCurrentUser: boolean, nicknames?: Record<string, string> }) {
    const getRankStyle = (rank: number) => {
        if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-500/30';
        if (rank === 2) return 'bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-md shadow-slate-400/20';
        if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-md shadow-orange-400/20';
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    };

    return (
        <tr className={cn(
            "group transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50",
            isCurrentUser && "bg-teal-50/50 dark:bg-teal-900/20 hover:bg-teal-50/70 dark:hover:bg-teal-900/30"
        )}>
            <td className="px-4 py-4">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110",
                    getRankStyle(user.rank)
                )}>
                    {user.rank}
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <span className={nicknames[user.address.toLowerCase()] ? '' : 'font-mono text-xs'}>
                                {getDisplayName(user.address, nicknames)}
                            </span>
                            {isCurrentUser && (
                                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                                    You
                                </span>
                            )}
                            {user.rank <= 3 && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                    user.rank === 1 && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
                                    user.rank === 2 && "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300",
                                    user.rank === 3 && "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                                )}>
                                    {user.rank === 1 ? 'Champion' : user.rank === 2 ? 'Silver' : 'Bronze'}
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 flex items-center gap-2">
                            <span>{user.totalTrades} Trades</span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 hidden md:table-cell">
                <div className="flex justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                    <Sparkline
                        data={generateActivityData(user.address)}
                        color={user.rank === 1 ? '#EAB308' : user.rank === 2 ? '#94A3B8' : user.rank === 3 ? '#F97316' : '#14B8A6'}
                        width={100}
                        height={28}
                    />
                </div>
            </td>
            <td className="px-4 py-4 text-right">
                <div className="flex flex-col items-end gap-0.5">
                    <span className={cn(
                        "text-lg font-black tabular-nums",
                        user.rank === 1 ? "text-yellow-600 dark:text-yellow-400" :
                        user.rank === 2 ? "text-slate-600 dark:text-slate-300" :
                        user.rank === 3 ? "text-orange-600 dark:text-orange-400" :
                        "text-gray-900 dark:text-white"
                    )}>
                        {formatNumber(user.points)}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Points</span>
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
