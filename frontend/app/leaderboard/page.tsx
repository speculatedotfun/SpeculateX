'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui';
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
  const rest = users.slice(3);

  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-br from-[#14B8A6]/10 to-purple-400/10 dark:from-[#14B8A6]/5 dark:to-purple-400/5 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-[#14B8A6]/10 dark:from-blue-400/5 dark:to-[#14B8A6]/5 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Page Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="[font-family:'Geist',Helvetica] font-black text-[#0f0a2e] dark:text-white text-4xl sm:text-5xl tracking-tight mb-4">
              Leaderboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Top traders ranked by volume. Earn points for every trade you make.
            </p>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-white/50 dark:bg-gray-800/50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
                {/* 2nd Place */}
                {top3[1] && (
                  <div className="order-2 md:order-1">
                    <PodiumCard user={top3[1]} place={2} />
                  </div>
                )}
                
                {/* 1st Place */}
                {top3[0] && (
                  <div className="order-1 md:order-2 -mt-8 md:-mt-12 z-10">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Traders</div>
                  <div className="text-xl font-black text-gray-900 dark:text-white">{users.length}</div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Total Volume</div>
                  <div className="text-xl font-black text-gray-900 dark:text-white">
                    {formatCurrency(users.reduce((acc, u) => acc + u.totalVolume, 0))}
                  </div>
                </div>
              </div>
            </div>

            {/* List View */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Trader</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Trades</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Volume</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.address} className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${user.rank <= 3 ? 'bg-yellow-50/10 dark:bg-yellow-900/5' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {user.rank === 1 && <Trophy className="w-4 h-4 text-yellow-500" />}
                            {user.rank === 2 && <Medal className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                            {user.rank === 3 && <Medal className="w-4 h-4 text-orange-500" />}
                            <span className={`font-bold ${user.rank <= 3 ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>#{user.rank}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              user.rank === 1 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' : 
                              user.rank === 2 ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                              user.rank === 3 ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' :
                              'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-500 dark:text-gray-300'
                            }`}>
                              {user.address.substring(2, 4)}
                            </div>
                            <span className="font-mono text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-[#14B8A6] dark:group-hover:text-[#14B8A6] transition-colors">
                              {shortenAddress(user.address)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                          {user.totalTrades}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                          {formatCurrency(user.totalVolume)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            user.rank <= 3 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                          }`}>
                            {formatNumber(user.points)} PTS
                          </span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          No trading activity found.
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
    </div>
  );
}

function PodiumCard({ user, place }: { user: LeaderboardUser, place: number }) {
  const isFirst = place === 1;
  const isSecond = place === 2;
  
  let bgColor = 'bg-white dark:bg-gray-800';
  let borderColor = 'border-gray-100 dark:border-gray-700';
  let iconColor = 'text-gray-400 dark:text-gray-500';
  let shadowColor = 'shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]';
  let icon = <Award className="w-8 h-8" />;
  let label = '3rd Place';

  if (isFirst) {
    bgColor = 'bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/10 dark:to-gray-800';
    borderColor = 'border-yellow-200 dark:border-yellow-800/30';
    iconColor = 'text-yellow-500';
    shadowColor = 'shadow-[0_20px_40px_rgba(234,179,8,0.2)] dark:shadow-[0_20px_40px_rgba(234,179,8,0.1)]';
    icon = <Trophy className="w-12 h-12" />;
    label = 'Champion';
  } else if (isSecond) {
    bgColor = 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-700/30 dark:to-gray-800';
    borderColor = 'border-gray-200 dark:border-gray-700';
    iconColor = 'text-gray-400 dark:text-gray-400';
    shadowColor = 'shadow-[0_15px_30px_rgba(156,163,175,0.1)] dark:shadow-[0_15px_30px_rgba(0,0,0,0.2)]';
    icon = <Medal className="w-10 h-10" />;
    label = 'Runner Up';
  } else {
    // Bronze
    bgColor = 'bg-gradient-to-b from-orange-50 to-white dark:from-orange-900/10 dark:to-gray-800';
    borderColor = 'border-orange-200 dark:border-orange-900/30';
    iconColor = 'text-orange-500';
    icon = <Medal className="w-8 h-8" />;
  }

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: place * 0.1 }}
      className={`relative rounded-3xl ${bgColor} border ${borderColor} ${shadowColor} p-6 flex flex-col items-center text-center ${isFirst ? 'py-10' : ''}`}
    >
      {isFirst && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-800 text-white font-black text-xl">
              1
            </div>
            <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-50 -z-10" />
          </div>
        </div>
      )}
      
      <div className={`mb-4 ${iconColor} ${isFirst ? 'scale-110 mt-6' : ''}`}>
        {icon}
      </div>
      
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4 overflow-hidden border-4 border-white dark:border-gray-700 shadow-sm">
        <div className={`w-full h-full flex items-center justify-center text-xl font-bold ${isFirst ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30' : 'text-gray-500 dark:text-gray-400'}`}>
          {user.address.substring(2, 4)}
        </div>
      </div>

      <h3 className="font-bold text-gray-900 dark:text-white mb-1 font-mono">
        {shortenAddress(user.address)}
      </h3>
      
      <div className={`text-xs font-bold uppercase tracking-wider mb-4 ${iconColor}`}>
        {label}
      </div>

      <div className="w-full pt-4 border-t border-gray-100/50 dark:border-gray-700/50">
        <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-1">Total Points</div>
        <div className="text-3xl font-black text-[#0f0a2e] dark:text-white tracking-tight">
          {formatNumber(user.points)}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          <span>{formatCurrency(user.totalVolume)} Vol</span>
          <span>•</span>
          <span>{user.uniqueMarkets} Mkts</span>
        </div>
      </div>
    </motion.div>
  );
}

