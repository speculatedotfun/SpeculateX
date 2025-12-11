'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { 
  Wallet, 
  TrendingUp, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trophy,
  Check,
  X,
  RefreshCw,
  Search
} from 'lucide-react';

import Header from '@/components/Header';
import { Button } from '@/components/ui'; // Assuming you have a basic Button component, or use standard button
import MintUsdcForm from '@/components/MintUsdcForm';
import { useUserPortfolio, type PortfolioPosition } from '@/lib/hooks/useUserPortfolio';
import { coreAbi, positionTokenAbi } from '@/lib/abis';
import { addresses } from '@/lib/contracts';
import { useWriteContract, usePublicClient, useReadContract } from 'wagmi';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
};

export default function PortfolioPage() {
  const { isConnected } = useAccount();
  const { data, isLoading, refetch, isRefetching } = useUserPortfolio();
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'claims' | 'faucet'>('positions');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const positions = data?.positions || [];
  const trades = data?.trades || [];
  const redemptions = data?.redemptions || [];

  const totalValue = positions.reduce((acc, pos) => acc + pos.value, 0);
  const activePositionsCount = positions.filter(p => p.status === 'Active').length;
  const resolvedPositionsCount = positions.filter(p => p.status === 'Resolved').length;
  const totalClaimed = redemptions.reduce((acc, r) => acc + r.amount, 0);

  const redeemedMarketIds = new Set(redemptions.map(r => r.marketId));

  const claimablePositions = positions.filter(p => 
    p.status === 'Resolved' && 
    p.won && 
    p.balance > 0.000001 &&
    !redeemedMarketIds.has(p.marketId)
  );

  const lostPositions = positions.filter(p => 
    p.status === 'Resolved' && !p.won
  );

  const claimedPositions: PortfolioPosition[] = redemptions.map(r => ({
    marketId: r.marketId,
    question: r.question,
    side: r.yesWins ? 'YES' : 'NO',
    balance: 0,
    currentPrice: 1,
    value: r.amount,
    status: 'Resolved',
    won: true,
    marketResolved: true,
    yesWins: r.yesWins ?? undefined
  }));

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
        </div>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[32px] shadow-xl shadow-[#14B8A6]/10 flex items-center justify-center mb-8 animate-in fade-in zoom-in duration-500">
            <Wallet className="w-12 h-12 text-[#14B8A6]" />
          </div>
          <h1 className="text-4xl font-black text-[#0f0a2e] dark:text-white mb-4 tracking-tight">Connect Your Wallet</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md leading-relaxed">
            Connect to view your positions, track performance, and manage your prediction market portfolio.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-6 py-3 rounded-xl text-sm font-bold border border-blue-100 dark:border-blue-800/50">
            Use the Connect button in the top right ↗
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden font-sans">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl font-black text-[#0f0a2e] dark:text-white tracking-tighter mb-2">
              Your Portfolio
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Track and manage your prediction market positions</p>
          </motion.div>

          <div className="flex items-center gap-3">
             {claimablePositions.length > 0 && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm mr-2"
                >
                  <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Winnings</span>
                    <span className="text-xs font-bold">{claimablePositions.length} To Claim</span>
                  </div>
                  <button 
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    onClick={() => setActiveTab('claims')}
                  >
                    View
                  </button>
                </motion.div>
              )}

            <button
              onClick={async () => {
                setIsManualRefreshing(true);
                await refetch();
                setIsManualRefreshing(false);
              }}
              disabled={isRefetching || isManualRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${(isRefetching || isManualRefreshing) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard 
            title="Total Value" 
            value={isLoading ? "..." : formatCurrency(totalValue)} 
            subtext="Current market value"
            icon={TrendingUp}
            color="bg-[#14B8A6]"
          />
          <StatCard 
            title="Active Positions" 
            value={isLoading ? "..." : activePositionsCount.toString()} 
            subtext="Live markets"
            icon={Clock}
            color="bg-blue-500"
          />
          <StatCard 
            title="Resolved" 
            value={isLoading ? "..." : resolvedPositionsCount.toString()} 
            subtext="Finalized markets"
            icon={CheckCircle2}
            color="bg-purple-500"
          />
          <StatCard 
            title="Total Claimed" 
            value={isLoading ? "..." : formatCurrency(totalClaimed)} 
            subtext="Winnings redeemed"
            icon={Trophy}
            color="bg-amber-500"
          />
        </div>

        {/* Tabs & Content */}
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-[32px] border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden min-h-[500px]">
          
          {/* Tab Header */}
          <div className="flex border-b border-gray-100 dark:border-gray-700/50 overflow-x-auto p-1 bg-gray-50/50 dark:bg-gray-900/20">
            {['positions', 'claims', 'history', 'faucet'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-3 px-6 text-sm font-bold rounded-2xl transition-all relative whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-white dark:bg-gray-800 text-[#14B8A6] shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'claims' && claimablePositions.length > 0 && (
                  <span className="ml-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
                    {claimablePositions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'positions' && (
                <motion.div
                  key="positions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {isLoading ? (
                    <LoadingState />
                  ) : positions.length === 0 ? (
                    <EmptyState 
                      title="No active positions" 
                      description="You haven't made any trades yet. Start predicting to build your portfolio."
                      actionLink="/markets"
                      actionText="Explore Markets"
                    />
                  ) : (
                    <>
                      {/* Active Section */}
                      {positions.filter(p => p.status === 'Active').length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Active Positions</h3>
                          <div className="grid gap-4">
                            {positions.filter(p => p.status === 'Active').map((position) => (
                              <PositionCard 
                                key={`${position.marketId}-${position.side}`} 
                                position={position} 
                                onClaimSuccess={() => refetch()}
                                isRedeemed={redeemedMarketIds.has(position.marketId)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resolved Section (Non-claimable ones visible here too) */}
                      {positions.filter(p => p.status === 'Resolved').length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Resolved Positions</h3>
                          <div className="grid gap-4 opacity-80 hover:opacity-100 transition-opacity">
                            {positions.filter(p => p.status === 'Resolved').map((position) => (
                              <PositionCard 
                                key={`${position.marketId}-${position.side}`} 
                                position={position} 
                                onClaimSuccess={() => refetch()}
                                isRedeemed={redeemedMarketIds.has(position.marketId)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'claims' && (
                <motion.div
                  key="claims"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {isLoading ? (
                    <LoadingState />
                  ) : (
                    <>
                      {/* Claimable */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pl-1 mb-4">
                          <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Ready to Claim</h3>
                        </div>
                        
                        {claimablePositions.length === 0 ? (
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700/50 border-dashed">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No winnings available to claim right now.</p>
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            {claimablePositions.map((position) => (
                              <PositionCard 
                                key={`claim-${position.marketId}-${position.side}`} 
                                position={position} 
                                onClaimSuccess={() => refetch()}
                                isRedeemed={false}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* History of Claims */}
                      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Claim History</h3>
                        {claimedPositions.length === 0 ? (
                          <p className="text-sm text-gray-500 pl-1">No past claims found.</p>
                        ) : (
                          <div className="grid gap-4">
                            {claimedPositions.map((position) => (
                              <PositionCard 
                                key={`claimed-${position.marketId}-${position.side}`} 
                                position={position} 
                                onClaimSuccess={() => {}}
                                isRedeemed={true}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {isLoading ? (
                    <LoadingState />
                  ) : trades.length === 0 ? (
                    <EmptyState 
                      title="No trade history" 
                      description="Your recent trades will appear here."
                      actionLink="/markets"
                      actionText="Start Trading"
                    />
                  ) : (
                    <div className="space-y-3">
                      {trades.map((trade) => (
                        <div 
                          key={trade.id} 
                          className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 hover:shadow-md transition-all gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              trade.action === 'buy' 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                            }`}>
                              {trade.action === 'buy' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                  trade.action === 'buy' 
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' 
                                    : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                                }`}>
                                  {trade.action} {trade.side}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                  {new Date(trade.timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <Link href={`/markets/${trade.marketId}`} className="text-sm font-bold text-gray-900 dark:text-white hover:text-[#14B8A6] transition-colors line-clamp-1">
                                {trade.question}
                              </Link>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-8 bg-gray-50 dark:bg-gray-700/30 sm:bg-transparent sm:dark:bg-transparent p-3 sm:p-0 rounded-xl">
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Amount</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatNumber(trade.tokenAmount)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Price</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(trade.price)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Total</p>
                              <p className="text-sm font-black text-[#0f0a2e] dark:text-white">{formatCurrency(trade.usdcAmount)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'faucet' && (
                <motion.div
                  key="faucet"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex justify-center py-8"
                >
                  <div className="w-full max-w-md">
                    <MintUsdcForm />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>
    </div>
  );
}

// --- Sub-Components ---

function StatCard({ title, value, subtext, icon: Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
        <Icon className={`w-16 h-16 text-${color.replace('bg-', '')}`} />
      </div>
      <div className="relative z-10">
        <div className={`w-10 h-10 ${color}/10 rounded-2xl flex items-center justify-center mb-4`}>
          <Icon className={`w-5 h-5 text-${color.replace('bg-', '')}-600 dark:text-${color.replace('bg-', '')}-400`} />
        </div>
        <div className="text-3xl font-black text-[#0f0a2e] dark:text-white tracking-tight mb-1">{value}</div>
        <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{title}</div>
        <div className="text-[10px] font-medium text-gray-400 mt-1">{subtext}</div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ title, description, actionLink, actionText }: any) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-8 h-8 text-gray-300 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">{description}</p>
      <Link href={actionLink}>
        <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold rounded-xl px-6 py-2.5 shadow-lg shadow-[#14B8A6]/20">
          {actionText}
        </Button>
      </Link>
    </div>
  );
}

function PositionCard({ position, onClaimSuccess, isRedeemed = false }: { position: PortfolioPosition, onClaimSuccess: () => void, isRedeemed?: boolean }) {
  const { address } = useAccount();
  const isWinner = position.won;
  const canRedeem = position.status === 'Resolved' && isWinner && position.balance > 0.000001 && !isRedeemed;
  const isLost = position.status === 'Resolved' && !isWinner;
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const [isClaiming, setIsClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Contract Reads for validation (kept minimal)
  const { data: marketData } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'markets',
    args: [BigInt(position.marketId)],
    query: { enabled: canRedeem },
  }) as any;

  const handleClaim = async () => {
    try {
      setIsClaiming(true);
      const hash = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'redeem',
        args: [BigInt(position.marketId), position.side === 'YES'],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        onClaimSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Transaction failed. Check console.");
    } finally {
      setIsClaiming(false);
    }
  };

  const isClaimed = isRedeemed || (position.status === 'Resolved' && isWinner && position.balance <= 0.000001);
  const showClaimed = isClaimed && isWinner;
  const showLost = position.status === 'Resolved' && !isWinner;

  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-3xl p-5 sm:p-6 transition-all duration-300 group relative overflow-hidden ${
      canRedeem 
        ? 'border-green-200 dark:border-green-800 shadow-[0_8px_30px_rgba(34,197,94,0.1)]' 
        : 'border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-[#14B8A6]/30'
    }`}>
      {canRedeem && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-400/20 to-transparent -mr-10 -mt-10 rounded-full blur-2xl pointer-events-none" />
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
              position.side === 'YES' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              {position.side}
            </span>
            {canRedeem && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-500 text-white shadow-sm animate-pulse">
                Winner
              </span>
            )}
            {showLost && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                Resolved
              </span>
            )}
            {showClaimed && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800">
                Claimed
              </span>
            )}
          </div>
          <Link href={`/markets/${position.marketId}`}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight hover:text-[#14B8A6] transition-colors line-clamp-2">
              {position.question}
            </h3>
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:flex sm:items-center gap-6 sm:gap-8 w-full sm:w-auto border-t sm:border-t-0 border-gray-100 dark:border-gray-700 pt-4 sm:pt-0">
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Balance</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatNumber(position.balance)}</span>
          </div>
          <div className="flex flex-col items-center sm:items-end border-l border-r sm:border-0 border-gray-100 dark:border-gray-700 px-2 sm:px-0">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Price</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(position.currentPrice)}</span>
          </div>
          <div className="flex flex-col items-end min-w-[80px]">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Value</span>
            <span className={`font-black text-base ${canRedeem ? 'text-green-600 dark:text-green-400' : 'text-[#0f0a2e] dark:text-white'}`}>
              {formatCurrency(position.value)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end sm:border-l sm:border-gray-100 dark:sm:border-gray-700 sm:pl-6 gap-2 w-full sm:w-auto">
          {canRedeem ? (
            <Button 
              onClick={handleClaim}
              disabled={isClaiming || isPending}
              className="w-full sm:w-auto bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold rounded-xl shadow-lg shadow-[#14B8A6]/20 transition-all active:scale-95"
            >
              {isClaiming || isPending ? 'Claiming...' : 'Claim'}
            </Button>
          ) : (
             <Link href={`/markets/${position.marketId}`} className="w-full sm:w-auto">
               <Button variant="outline" className="w-full border-2 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:border-[#14B8A6] dark:hover:border-[#14B8A6] hover:text-[#14B8A6] dark:hover:text-[#14B8A6] rounded-xl">
                 Trade
               </Button>
             </Link>
          )}
        </div>
      </div>
    </div>
  );
}