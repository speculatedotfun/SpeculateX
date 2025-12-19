'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { useLeaderboard, type LeaderboardUser } from '@/lib/hooks/useLeaderboard';
import { Trophy, Medal, Award, TrendingUp, Users, Activity, ExternalLink, Zap } from 'lucide-react';
import { Sparkline } from '@/components/market/Sparkline';

// Helper to shorten address
const shortenAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// Helper to format numbers
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
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
  for (let i = 0; i < 10; i++) {
    const random = Math.sin(seed + i) * 20;
    current += random;
    data.push(Math.max(10, current));
  }
  return data;
};

export default function LeaderboardPage() {
  const { data: users = [], isLoading } = useLeaderboard();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Top 3 users
  const top3 = users.slice(0, 3);
  
  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden font-sans">

      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
          >
            <h1 className="text-5xl sm:text-6xl font-black text-[#0f0a2e] dark:text-white tracking-tighter mb-4">
              Leaderboard
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
              Top traders ranked by volume. Earn points for every trade you make.
            </p>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-80 bg-white/50 dark:bg-gray-800/50 rounded-[32px] border border-gray-200 dark:border-gray-700 ${prefersReducedMotion ? '' : 'animate-pulse'}`} />
            ))}
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 items-end">
                {/* 2nd Place */}
                {top3[1] && (
                  <div className="order-2 md:order-1">
                    <PodiumCard user={top3[1]} place={2} prefersReducedMotion={prefersReducedMotion} />
                  </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <div className="order-1 md:order-2 -mt-12 z-10 relative">
                    <div className="absolute -inset-4 bg-gradient-to-b from-yellow-400/20 to-transparent blur-2xl -z-10 rounded-full" />
                    <PodiumCard user={top3[0]} place={1} prefersReducedMotion={prefersReducedMotion} />
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <div className="order-3 md:order-3">
                    <PodiumCard user={top3[2]} place={3} prefersReducedMotion={prefersReducedMotion} />
                  </div>
                )}
              </div>
            )}

            {/* Stats Row */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.2, duration: prefersReducedMotion ? 0 : 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
            >
              <StatCard
                title="Active Traders"
                value={users.length.toString()}
                icon={Users}
                color="text-blue-500"
                bgColor="bg-blue-500/10"
              />
              <StatCard
                title="Total Volume"
                value={formatCurrency(users.reduce((acc, u) => acc + u.totalVolume, 0))}
                icon={TrendingUp}
                color="text-[#14B8A6]"
                bgColor="bg-[#14B8A6]/10"
              />
              <StatCard
                title="Total Trades"
                value={formatNumber(users.reduce((acc, u) => acc + u.totalTrades, 0))}
                icon={Activity}
                color="text-purple-500"
                bgColor="bg-purple-500/10"
              />
              <StatCard
                title="Points Cap"
                value={formatNumber(users.reduce((acc, u) => acc + u.points, 0))}
                icon={Zap}
                color="text-amber-500"
                bgColor="bg-amber-500/10"
              />
            </motion.div>

            {/* Leaderboard Table */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.4, duration: prefersReducedMotion ? 0 : 0.3 }}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-black/5 dark:shadow-black/20 border border-white/20 dark:border-gray-700/50 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30">
                      <th className="px-8 py-5 text-left text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Rank</th>
                      <th className="px-8 py-5 text-left text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Trader</th>
                      <th className="px-8 py-5 text-center text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Activity</th>
                      <th className="px-8 py-5 text-right text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Volume</th>
                      <th className="px-8 py-5 text-right text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Total Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {users.map((user) => (
                      <tr key={user.address} className="group hover:bg-white dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className={`flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm transition-transform group-hover:scale-110 ${
                              user.rank <= 3 
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg' 
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {user.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:rotate-6 ${
                              user.rank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                              user.rank === 2 ? 'bg-slate-100 text-slate-700' :
                              user.rank === 3 ? 'bg-orange-100 text-orange-700' :
                              'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-500 dark:text-gray-300'
                            }`}>
                              {user.address.substring(2, 4).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-gray-900 dark:text-white group-hover:text-[#14B8A6] transition-colors flex items-center gap-2">
                                {shortenAddress(user.address)}
                                {user.rank <= 5 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-tighter">Whale</span>
                                )}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{user.totalTrades} Trades</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                           <div className="flex justify-center group-hover:scale-110 transition-transform">
                              <Sparkline 
                                data={generateActivityData(user.address)} 
                                color={user.rank <= 3 ? '#EAB308' : '#14B8A6'} 
                                width={60} 
                                height={24} 
                              />
                           </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-black text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(user.totalVolume)}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right">
                          <div className="flex flex-col items-end">
                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-black shadow-sm ${
                              user.rank <= 3 
                                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white' 
                                : 'bg-[#14B8A6]/10 text-[#14B8A6] dark:bg-[#14B8A6]/20'
                            }`}>
                              {formatNumber(user.points)} PTS
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-50">
                            <Users className="w-12 h-12" />
                            <p className="text-lg font-medium">No trading activity found.</p>
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
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor }: any) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-5 group hover:border-[#14B8A6]/30 transition-all hover:shadow-xl">
      <div className={`p-4 rounded-2xl ${bgColor} ${color} transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-inner`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{title}</div>
        <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{value}</div>
      </div>
    </div>
  );
}

function PodiumCard({ user, place, prefersReducedMotion = false }: { user: LeaderboardUser, place: number, prefersReducedMotion?: boolean }) {
  const isFirst = place === 1;
  const isSecond = place === 2;
  const isThird = place === 3;

  let bgColor = 'bg-white dark:bg-gray-800';
  let borderColor = 'border-gray-100 dark:border-gray-700';
  let iconColor = 'text-gray-400';
  let icon = <Award className="w-10 h-10" />;
  let label = '3rd Place';
  let heightClass = 'h-[340px]';
  let glowColor = 'from-orange-400/20';

  if (isFirst) {
    bgColor = 'bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/10 dark:to-gray-800';
    borderColor = 'border-yellow-200 dark:border-yellow-500/30';
    iconColor = 'text-yellow-500';
    icon = <Trophy className="w-14 h-14" />;
    label = 'Champion';
    heightClass = 'h-[420px]';
    glowColor = 'from-yellow-400/30';
  } else if (isSecond) {
    bgColor = 'bg-white dark:bg-gray-800';
    borderColor = 'border-slate-200 dark:border-slate-600';
    iconColor = 'text-slate-400';
    icon = <Medal className="w-12 h-12" />;
    label = 'Runner Up';
    heightClass = 'h-[380px]';
    glowColor = 'from-slate-400/20';
  } else {
    // Bronze
    borderColor = 'border-orange-200 dark:border-orange-900/30';
    iconColor = 'text-orange-500';
    glowColor = 'from-orange-400/20';
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: prefersReducedMotion ? 0 : place * 0.1, duration: prefersReducedMotion ? 0 : 0.5, type: 'spring' }}
      whileHover={{ y: -10 }}
      className={`relative rounded-[40px] ${bgColor} border-2 ${borderColor} shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 flex flex-col items-center justify-end ${heightClass} overflow-hidden group`}
    >
      <div className={`absolute -top-24 -left-24 w-48 h-48 bg-gradient-to-br ${glowColor} to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
      
      <div className="absolute top-10 flex flex-col items-center w-full">
        <motion.div 
          animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={`mb-8 p-5 rounded-3xl bg-white dark:bg-gray-900 shadow-xl ${iconColor} border border-gray-100 dark:border-gray-800`}
        >
          {icon}
        </motion.div>
        
        <div className="w-24 h-24 rounded-[32px] bg-gray-50 dark:bg-gray-700 overflow-hidden border-4 border-white dark:border-gray-600 shadow-2xl mb-6 relative group-hover:scale-110 transition-transform">
           <div className={`w-full h-full flex items-center justify-center text-3xl font-black ${
             isFirst ? 'bg-gradient-to-br from-yellow-100 to-amber-200 text-yellow-700' : 
             isSecond ? 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700' : 
             'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700'
           }`}>
             {user.address.substring(2, 4).toUpperCase()}
           </div>
           <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm text-white text-[10px] font-black text-center py-1 tracking-widest uppercase">
             RANK {place}
           </div>
        </div>
        
        <h3 className="font-black text-xl text-gray-900 dark:text-white mb-1 font-mono tracking-tighter">
          {shortenAddress(user.address)}
        </h3>
        <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${iconColor} mb-6`}>
          {label}
        </div>
      </div>

      <div className="w-full pt-8 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-end relative z-10">
        <div className="text-left">
          <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5 opacity-60">Trading Volume</div>
          <div className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{formatCurrency(user.totalVolume)}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5 opacity-60">Points</div>
          <div className={`text-3xl font-black tracking-tighter ${isFirst ? 'text-yellow-600 dark:text-yellow-400' : 'text-[#14B8A6]'}`}>
            {formatNumber(user.points)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}