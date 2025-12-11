'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { useLeaderboard, type LeaderboardUser } from '@/lib/hooks/useLeaderboard';
import { Trophy, Medal, Award, TrendingUp, Users, Activity } from 'lucide-react';

// Helper to shorten address
const shortenAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// Helper to format numbers
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(num);
};

const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
};

export default function LeaderboardPage() {
  const { data: users = [], isLoading } = useLeaderboard();
  
  // Top 3 users
  const top3 = users.slice(0, 3);
  
  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden font-sans">
      
      {/* --- UI Upgrade: Grid Background --- */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
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
              <div key={i} className="h-80 bg-white/50 dark:bg-gray-800/50 rounded-[32px] animate-pulse border border-gray-200 dark:border-gray-700" />
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
                    <PodiumCard user={top3[1]} place={2} />
                  </div>
                )}
                
                {/* 1st Place */}
                {top3[0] && (
                  <div className="order-1 md:order-2 -mt-12 z-10 relative">
                    <div className="absolute -inset-4 bg-gradient-to-b from-yellow-400/20 to-transparent blur-2xl -z-10 rounded-full" />
                    <PodiumCard user={top3[0]} place={1} />
                  </div>
                )}
                
                {/* 3rd Place */}
                {top3[2] && (
                  <div className="order-3 md:order-3">
                    <PodiumCard user={top3[2]} place={3} />
                  </div>
                )}
              </div>
            )}

            {/* Stats Row */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
            >
              <StatCard 
                title="Total Traders" 
                value={users.length.toString()} 
                icon={Users} 
                color="bg-blue-500" 
              />
              <StatCard 
                title="Total Volume" 
                value={formatCurrency(users.reduce((acc, u) => acc + u.totalVolume, 0))} 
                icon={TrendingUp} 
                color="bg-[#14B8A6]" 
              />
              <StatCard 
                title="Active Today" 
                value="24" 
                icon={Activity} 
                color="bg-purple-500" 
              />
              <StatCard 
                title="Points Awarded" 
                value={formatNumber(users.reduce((acc, u) => acc + u.points, 0))} 
                icon={Award} 
                color="bg-amber-500" 
              />
            </motion.div>

            {/* Leaderboard Table */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-black/5 dark:shadow-black/20 border border-white/20 dark:border-gray-700/50 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30">
                      <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Rank</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Trader</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Trades</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Volume</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {users.map((user) => (
                      <tr key={user.address} className="group hover:bg-white dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${
                              user.rank <= 3 
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {user.rank}
                            </span>
                            {user.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                              user.rank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                              user.rank === 2 ? 'bg-gray-200 text-gray-700' :
                              user.rank === 3 ? 'bg-orange-100 text-orange-700' :
                              'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-500 dark:text-gray-300'
                            }`}>
                              {user.address.substring(2, 4)}
                            </div>
                            <span className="font-mono font-bold text-gray-700 dark:text-gray-200 group-hover:text-[#14B8A6] transition-colors">
                              {shortenAddress(user.address)}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-bold text-gray-600 dark:text-gray-300">
                          {user.totalTrades}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(user.totalVolume)}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                            user.rank <= 3 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' 
                              : 'bg-[#14B8A6]/10 text-[#14B8A6] dark:bg-[#14B8A6]/20'
                          }`}>
                            {formatNumber(user.points)} PTS
                          </span>
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

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color.replace('bg-', 'bg-opacity-10 text-')}`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{title}</div>
        <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function PodiumCard({ user, place }: { user: LeaderboardUser, place: number }) {
  const isFirst = place === 1;
  const isSecond = place === 2;
  const isThird = place === 3;
  
  let bgColor = 'bg-white dark:bg-gray-800';
  let borderColor = 'border-gray-100 dark:border-gray-700';
  let iconColor = 'text-gray-400';
  let icon = <Award className="w-8 h-8" />;
  let label = '3rd Place';
  let heightClass = 'h-[320px]';

  if (isFirst) {
    bgColor = 'bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/10 dark:to-gray-800';
    borderColor = 'border-yellow-200 dark:border-yellow-500/30';
    iconColor = 'text-yellow-500';
    icon = <Trophy className="w-12 h-12" />;
    label = 'Champion';
    heightClass = 'h-[380px]';
  } else if (isSecond) {
    bgColor = 'bg-white dark:bg-gray-800';
    borderColor = 'border-gray-200 dark:border-gray-600';
    iconColor = 'text-gray-400';
    icon = <Medal className="w-10 h-10" />;
    label = 'Runner Up';
    heightClass = 'h-[340px]';
  } else {
    // Bronze
    borderColor = 'border-orange-200 dark:border-orange-900/30';
    iconColor = 'text-orange-500';
    icon = <Medal className="w-8 h-8" />;
  }

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: place * 0.1 }}
      className={`relative rounded-[32px] ${bgColor} border ${borderColor} shadow-xl p-6 flex flex-col items-center justify-end ${heightClass} relative overflow-hidden`}
    >
      {isFirst && (
        <div className="absolute top-0 inset-x-0 h-1 bg-yellow-400" />
      )}
      
      <div className="absolute top-8 flex flex-col items-center">
        <div className={`mb-6 p-4 rounded-full bg-white dark:bg-gray-900 shadow-lg ${iconColor}`}>
          {icon}
        </div>
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden border-4 border-white dark:border-gray-600 shadow-md mb-4 relative">
           <div className={`w-full h-full flex items-center justify-center text-2xl font-black ${
             isFirst ? 'bg-yellow-100 text-yellow-700' : 
             isSecond ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-700'
           }`}>
             {user.address.substring(2, 4)}
           </div>
           <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] font-bold text-center py-0.5">
             #{place}
           </div>
        </div>
        
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 font-mono tracking-tight">
          {shortenAddress(user.address)}
        </h3>
        <div className={`text-xs font-black uppercase tracking-widest ${iconColor} mb-6`}>
          {label}
        </div>
      </div>

      <div className="w-full pt-6 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-end">
        <div className="text-left">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Volume</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(user.totalVolume)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Score</div>
          <div className={`text-2xl font-black ${isFirst ? 'text-yellow-600' : 'text-[#14B8A6]'}`}>
            {formatNumber(user.points)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}