'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { 
  WalletIcon, 
  TrendingUpIcon, 
  HistoryIcon, 
  ArrowUpRightIcon, 
  ArrowDownRightIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  TrophyIcon,
  CheckIcon,
  XIcon,
  RefreshCwIcon
} from 'lucide-react';

import Header from '@/components/Header';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import MintUsdcForm from '@/components/MintUsdcForm';
import { useUserPortfolio, type PortfolioPosition, type PortfolioTrade, type PortfolioRedemption } from '@/lib/hooks/useUserPortfolio';
import { coreAbi, positionTokenAbi } from '@/lib/abis';
import { addresses } from '@/lib/contracts';
import { getMarketResolution } from '@/lib/hooks';

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
  const { data, isLoading, error, refetch, isRefetching } = useUserPortfolio();
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'claims' | 'faucet'>('positions');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const positions = data?.positions || [];
  const trades = data?.trades || [];
  const redemptions = data?.redemptions || [];

  const totalValue = positions.reduce((acc, pos) => acc + pos.value, 0);
  const activePositionsCount = positions.filter(p => p.status === 'Active').length;
  const resolvedPositionsCount = positions.filter(p => p.status === 'Resolved').length;
  const totalClaimed = redemptions.reduce((acc, r) => acc + r.amount, 0);

  // Create a Set of marketIds that have already been redeemed
  const redeemedMarketIds = new Set(redemptions.map(r => r.marketId));

  // Filter positions that are resolved AND winning AND have balance > 0 AND haven't been redeemed yet
  const claimablePositions = positions.filter(p => 
    p.status === 'Resolved' && 
    p.won && 
    p.balance > 0.000001 &&
    !redeemedMarketIds.has(p.marketId) // Exclude if already redeemed
  );

  // Filter losing positions (resolved but didn't win)
  const lostPositions = positions.filter(p => 
    p.status === 'Resolved' && !p.won
  );

  // Convert redemptions to PositionCard-compatible objects
  const claimedPositions: PortfolioPosition[] = redemptions.map(r => ({
    marketId: r.marketId,
    question: r.question,
    side: r.yesWins ? 'YES' : 'NO', // We assume they won if they redeemed
    balance: 0, // Claimed
    currentPrice: 1,
    value: r.amount,
    status: 'Resolved',
    won: true,
    marketResolved: true,
    yesWins: r.yesWins ?? undefined
  }));

  if (!isConnected) {
  return (
      <div className="min-h-screen bg-[#f5f0ff] relative overflow-hidden">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mb-6">
            <WalletIcon className="w-10 h-10 text-[#14B8A6]" />
          </div>
          <h1 className="text-3xl font-bold text-[#0f0a2e] mb-3 text-center">Connect Your Wallet</h1>
          <p className="text-gray-500 mb-8 text-center max-w-md">
            Connect your wallet to view your positions, track performance, and manage your prediction market portfolio.
          </p>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
            ↗ Use the Connect button in the top right
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-[#f5f0ff] relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-[#14B8A6]/10 to-blue-400/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 45, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Page Header */}
        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="[font-family:'Geist',Helvetica] font-bold text-[#0f0a2e] text-3xl sm:text-4xl tracking-tight mb-3">
              Portfolio
            </h1>
            <p className="text-gray-500">Track your prediction market performance</p>
          </div>
          <Button
            onClick={async () => {
              setIsManualRefreshing(true);
              await refetch();
              setIsManualRefreshing(false);
            }}
            disabled={isRefetching || isManualRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className={`w-4 h-4 ${(isRefetching || isManualRefreshing) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {claimablePositions.length > 0 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm"
            >
              <TrophyIcon className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-green-600">Claimable Winnings</p>
                <p className="text-sm font-medium">
                  You have {claimablePositions.length} winning position{claimablePositions.length > 1 ? 's' : ''} to redeem!
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white ml-2"
                onClick={() => setActiveTab('claims')}
              >
                View
              </Button>
            </motion.div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Value</h3>
                <div className="w-8 h-8 bg-[#14B8A6]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUpIcon className="w-4 h-4 text-[#14B8A6]" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#0f0a2e]">
                {isLoading ? (
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                ) : (
                  formatCurrency(totalValue)
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Current market value</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active</h3>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ClockIcon className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#0f0a2e]">
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 animate-pulse rounded" />
                ) : (
                  activePositionsCount
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Live positions</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Resolved</h3>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircleIcon className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#0f0a2e]">
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 animate-pulse rounded" />
                ) : (
                  resolvedPositionsCount
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Finalized markets</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden relative group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Claimed</h3>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrophyIcon className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#0f0a2e]">
                {isLoading ? (
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                ) : (
                  formatCurrency(totalClaimed)
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Total winnings redeemed</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-h-[400px]">
          {/* Tab Header */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex-1 py-4 px-4 text-sm font-medium text-center transition-colors relative whitespace-nowrap ${
                activeTab === 'positions' 
                  ? 'text-[#14B8A6]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Positions
              {activeTab === 'positions' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`flex-1 py-4 px-4 text-sm font-medium text-center transition-colors relative whitespace-nowrap ${
                activeTab === 'claims' 
                  ? 'text-[#14B8A6]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Claims & History
              {claimablePositions.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-600 text-[10px] px-1.5 py-0.5 rounded-full">
                  {claimablePositions.length}
                </span>
              )}
              {activeTab === 'claims' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-4 px-4 text-sm font-medium text-center transition-colors relative whitespace-nowrap ${
                activeTab === 'history' 
                  ? 'text-[#14B8A6]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Trade History
              {activeTab === 'history' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('faucet')}
              className={`flex-1 py-4 px-4 text-sm font-medium text-center transition-colors relative whitespace-nowrap ${
                activeTab === 'faucet' 
                  ? 'text-[#14B8A6]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Testnet Faucet
              {activeTab === 'faucet' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6]" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'positions' ? (
                <motion.div
                  key="positions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : positions.length === 0 ? (
                    <EmptyState 
                      title="No active positions" 
                      description="You haven't made any trades yet. Start predicting to build your portfolio."
                      actionLink="/markets"
                      actionText="Explore Markets"
                    />
                  ) : (
                    <div className="space-y-6">
                      {/* Active Positions */}
                      {positions.filter(p => p.status === 'Active').length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" />
                            Active Positions
                          </h3>
                          <div className="space-y-4">
                            {positions
                              .filter(p => p.status === 'Active')
                              .map((position) => (
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

                      {/* Resolved Positions */}
                      {positions.filter(p => p.status === 'Resolved').length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4" />
                            Resolved Positions
                          </h3>
                          <div className="space-y-4">
                            {positions
                              .filter(p => p.status === 'Resolved')
                              .map((position) => (
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
                    </div>
                  )}
                </motion.div>
              ) : activeTab === 'claims' ? (
                <motion.div
                  key="claims"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="space-y-8">
                    {/* Claimable Section */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrophyIcon className="w-5 h-5 text-green-600" />
                        Ready to Claim
                      </h3>
                      {isLoading ? (
                        <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                      ) : claimablePositions.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                          <p className="text-gray-500 text-sm">No winnings to claim right now.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
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

                    {/* Lost Positions Section */}
                    {lostPositions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <XIcon className="w-5 h-5 text-red-600" />
                          Lost Positions
                        </h3>
                        <div className="space-y-4">
                          {lostPositions.map((position) => (
                            <PositionCard 
                              key={`lost-${position.marketId}-${position.side}`} 
                              position={position} 
                              onClaimSuccess={() => {}}
                              isRedeemed={false}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Past Claims Section */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <HistoryIcon className="w-5 h-5 text-gray-600" />
                        Past Claims
                      </h3>
                      {isLoading ? (
                        <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                      ) : claimedPositions.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                          <p className="text-gray-500 text-sm">No past claims found.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
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
                  </div>
                </motion.div>
              ) : activeTab === 'faucet' ? (
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
              ) : (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : trades.length === 0 ? (
                    <EmptyState 
                      title="No trade history" 
                      description="Your recent trades will appear here."
                      actionLink="/markets"
                      actionText="Start Trading"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50/50">
                          <tr>
                            <th className="px-4 py-3 rounded-l-lg">Action</th>
                            <th className="px-4 py-3">Market</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">Total</th>
                            <th className="px-4 py-3 rounded-r-lg">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades.map((trade) => (
                            <tr key={trade.id} className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-4 font-medium">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  trade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {trade.action} {trade.side}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-gray-900 font-medium max-w-xs truncate">
                                <Link href={`/markets/${trade.marketId}`} className="hover:text-[#14B8A6] hover:underline">
                                  {trade.question}
                                </Link>
                              </td>
                              <td className="px-4 py-4">
                                {formatNumber(trade.tokenAmount)}
                              </td>
                              <td className="px-4 py-4">
                                {formatCurrency(trade.price)}
                              </td>
                              <td className="px-4 py-4 font-medium text-gray-900">
                                {formatCurrency(trade.usdcAmount)}
                              </td>
                              <td className="px-4 py-4 text-gray-400">
                                {new Date(trade.timestamp * 1000).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </main>
    </div>
  );
}

function PositionCard({ position, onClaimSuccess, isRedeemed = false }: { position: PortfolioPosition, onClaimSuccess: () => void, isRedeemed?: boolean }) {
  const { address } = useAccount();
  const isWinner = position.won;
  // Can redeem if: resolved, won, has balance, AND not already redeemed
  const canRedeem = position.status === 'Resolved' && isWinner && position.balance > 0.000001 && !isRedeemed;
  const isLost = position.status === 'Resolved' && !isWinner;
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  const [isClaiming, setIsClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get on-chain market resolution to verify
  const { data: marketResolution } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'getMarketResolution',
    args: [BigInt(position.marketId)],
    query: { enabled: canRedeem && !isRedeemed },
  }) as any;

  // Get token address and balance
  const { data: marketData } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'markets',
    args: [BigInt(position.marketId)],
    query: { enabled: canRedeem && !isRedeemed },
  }) as any;

  const tokenAddress = position.side === 'YES' 
    ? (marketData?.yes || marketData?.[0])
    : (marketData?.no || marketData?.[1]);

  const { data: tokenBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: positionTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address && canRedeem && !isRedeemed },
  });

  const handleClaim = async () => {
    try {
      setIsClaiming(true);
      setErrorMessage(null);

      // Validate on-chain state before attempting claim
      if (!marketResolution) {
        throw new Error('Unable to verify market resolution. Please try again.');
      }

      const isResolved = marketResolution.isResolved ?? marketResolution?.[7];
      const yesWins = marketResolution.yesWins ?? marketResolution?.[6];

      if (!isResolved) {
        throw new Error('Market is not yet resolved on-chain. Please wait for resolution.');
      }

      // Verify the user is on the winning side
      const userIsYes = position.side === 'YES';
      if (userIsYes !== yesWins) {
        throw new Error(`You cannot claim - ${yesWins ? 'YES' : 'NO'} won this market, but you hold ${position.side} tokens.`);
      }

      // Check balance
      const balance = tokenBalance ? Number(formatUnits(tokenBalance as bigint, 18)) : position.balance;
      if (balance < 0.000001) {
        throw new Error('Insufficient balance to claim. Your position may have already been redeemed.');
      }

      const hash = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'redeem',
        args: [BigInt(position.marketId), position.side === 'YES'],
      });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        // Optimistic update: Save redemption to localStorage
        try {
          const redemption = {
            id: `local-${hash}`,
            marketId: position.marketId,
            question: position.question,
            amount: position.balance, // 1 winning token = 1 USDC
            timestamp: Math.floor(Date.now() / 1000),
            txHash: hash,
            yesWins: yesWins
          };
          
          const existing = JSON.parse(localStorage.getItem('userRedemptions') || '[]');
          existing.push(redemption);
          localStorage.setItem('userRedemptions', JSON.stringify(existing));
        } catch (e) {
          console.warn('Failed to save local redemption:', e);
        }

        onClaimSuccess();
      }
    } catch (err: any) {
      console.error('Claim failed:', err);
      const errorMsg = err?.shortMessage || err?.message || err?.reason || 'Transaction failed. Please check the transaction details on BSCScan.';
      setErrorMessage(errorMsg);
      
      // Show error to user
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsClaiming(false);
    }
  };

  // If resolved and NOT winner (and not canRedeem), or resolved and balance 0, or explicitly marked as redeemed
  // But if it's resolved, winner, and balance > 0, we show Claim
  // If resolved, winner, and balance == 0 OR isRedeemed, it's "Claimed" (or lost if !won)
  const isClaimed = isRedeemed || (position.status === 'Resolved' && isWinner && position.balance <= 0.000001);

  return (
    <div className={`bg-white border rounded-xl p-4 sm:p-5 hover:shadow-md transition-all group ${
      canRedeem 
        ? 'border-green-200 bg-green-50/30' 
        : isClaimed 
        ? 'border-gray-100 bg-gray-50/50' 
        : isLost
        ? 'border-red-200 bg-red-50/20'
        : 'border-gray-100'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Market Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={position.side === 'YES' ? 'default' : 'destructive'} className={`${
              position.side === 'YES' ? 'bg-green-500' : 'bg-red-500'
            } text-white text-[10px] px-1.5 py-0.5`}>
              {position.side}
            </Badge>
            {position.status === 'Resolved' && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600">
                Resolved
              </Badge>
            )}
            {canRedeem && (
              <Badge variant="default" className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 animate-pulse">
                Winner!
              </Badge>
            )}
            {isLost && (
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px] px-1.5 py-0.5">
                Lost
              </Badge>
            )}
            {isClaimed && (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] px-1.5 py-0.5">
                Claimed
              </Badge>
            )}
          </div>
          <Link href={`/markets/${position.marketId}`}>
            <h3 className="text-base font-semibold text-gray-900 truncate hover:text-[#14B8A6] transition-colors">
              {position.question}
            </h3>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-400 uppercase font-medium">Balance</span>
            <span className="font-medium text-gray-900">{formatNumber(position.balance)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-400 uppercase font-medium">Avg Price</span>
            <span className="font-medium text-gray-900">{formatCurrency(position.currentPrice)}</span>
          </div>
          <div className="flex flex-col items-end min-w-[80px]">
            <span className="text-xs text-gray-400 uppercase font-medium">Value</span>
            <span className={`font-bold ${
              canRedeem 
                ? 'text-green-600' 
                : isLost 
                ? 'text-red-600' 
                : 'text-[#0f0a2e]'
            }`}>
              {formatCurrency(position.value)}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-col items-end sm:border-l sm:border-gray-100 sm:pl-4 gap-2">
          {canRedeem ? (
            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
              {errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 max-w-xs text-right">
                  {errorMessage}
                </div>
              )}
              <Button 
                onClick={handleClaim}
                disabled={isClaiming || isPending}
                className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20 animate-bounce-subtle"
              >
                {isClaiming || isPending ? 'Claiming...' : 'Claim Winnings'}
              </Button>
            </div>
          ) : isClaimed ? (
            <Button variant="ghost" disabled className="text-green-600 font-medium bg-green-50 cursor-default">
              <CheckIcon className="w-4 h-4 mr-1" /> Claimed
            </Button>
          ) : isLost ? (
            <Button variant="ghost" disabled className="text-red-600 font-medium bg-red-50 cursor-default">
              <XIcon className="w-4 h-4 mr-1" /> Lost
            </Button>
          ) : (
             <Link href={`/markets/${position.marketId}`}>
               <Button variant="outline" className="w-full sm:w-auto border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#14B8A6]">
                 Trade
               </Button>
             </Link>
          )}
        </div>

      </div>
    </div>
  );
}

function EmptyState({ title, description, actionLink, actionText }: { title: string, description: string, actionLink: string, actionText: string }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircleIcon className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-sm mx-auto mb-6">{description}</p>
      <Link href={actionLink}>
        <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white">
          {actionText}
        </Button>
      </Link>
    </div>
  );
}
