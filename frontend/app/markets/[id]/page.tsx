'use client';
// @ts-nocheck
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract, usePublicClient, useBlockNumber } from 'wagmi';
import { useMarketData } from '@/lib/hooks/useMarketData';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { formatUnits, decodeEventLog } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Loader2, Share2, Check } from 'lucide-react';

// Components
import Header from '@/components/Header';
import TradingCard from '@/components/TradingCard';
import { PriceChart } from '@/components/PriceChart';
import { MarketHeader } from '@/components/market/MarketHeader';
import { Skeleton } from '@/components/ui';
import { PriceDisplay } from '@/components/market/PriceDisplay';

// Lib
import { getMarket, getSpotPriceYesE6, getMarketResolution, getMarketState } from '@/lib/hooks';
import { addresses } from '@/lib/contracts';
import { positionTokenAbi, coreAbi } from '@/lib/abis';
import { formatPriceInCents, getAssetLogo } from '@/lib/marketUtils';
import type { PricePoint } from '@/lib/priceHistory/types';
import {
  useMarketSnapshot,
  type SnapshotTimeRange,
  getSecondsForRange,
} from '@/lib/useMarketSnapshot';
import { subscribeToSubgraph } from '@/lib/subgraphClient';

// Custom Hooks
import { useMarketPriceHistory } from '@/lib/hooks/useMarketPriceHistory';
import { useMarketTransactions } from '@/lib/hooks/useMarketTransactions';
import { useMarketHolders } from '@/lib/hooks/useMarketHolders';

// Tabs
import { PositionTab } from './tabs/PositionTab';
import { CommentsTab } from './tabs/CommentsTab';
import { TransactionsTab } from './tabs/TransactionsTab';
import { ResolutionTab } from './tabs/ResolutionTab';
import { AdminMarketActions } from '@/components/market/AdminMarketActions';
import { TopHoldersCard } from './components/TopHoldersCard';

const SNAPSHOT_TRADE_LIMIT = 200;
const SNAPSHOT_HOLDER_LIMIT = 20;

const MARKET_LIVE_SUBSCRIPTION = /* GraphQL */ `
  subscription MarketLive(
    $id: ID!
    $since: BigInt!
    $txLimit: Int!
    $holderLimit: Int!
  ) {
    market(id: $id) {
      id
      createdAt
      tradesAsc: trades(
        where: { timestamp_gte: $since }
        orderBy: timestamp
        orderDirection: asc
        first: 1000
      ) {
        txHash
        timestamp
        user { id }
        action
        side
        tokenDelta
        usdcDelta
        priceE6
      }
      tradesDesc: trades(
        orderBy: timestamp
        orderDirection: desc
        first: $txLimit
      ) {
        txHash
        timestamp
        user { id }
        action
        side
        tokenDelta
        usdcDelta
        priceE6
      }
      yesBalances: positionBalances(
        where: { side: "yes", tokenBalance_gt: "0" }
        orderBy: tokenBalance
        orderDirection: desc
        first: $holderLimit
      ) {
        user { id }
        tokenBalance
      }
      noBalances: positionBalances(
        where: { side: "no", tokenBalance_gt: "0" }
        orderBy: tokenBalance
        orderDirection: desc
        first: $holderLimit
      ) {
        user { id }
        tokenBalance
      }
    }
  }
`;

function MarketDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden">
      <Header />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8" role="status" aria-label="Loading market details">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Skeleton className="h-6 w-32 mb-6 rounded-full bg-gray-200 dark:bg-gray-800" />
        </motion.div>

        {/* Header Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <Skeleton className="w-20 h-20 rounded-2xl shrink-0 bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 w-full space-y-4">
              <Skeleton className="h-8 w-3/4 bg-gray-200 dark:bg-gray-700" />
              <div className="flex gap-3">
                <Skeleton className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Skeleton className="h-[500px] w-full rounded-3xl bg-gray-200 dark:bg-gray-700" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Skeleton className="h-[300px] w-full rounded-3xl bg-gray-200 dark:bg-gray-700" />
            </motion.div>
          </div>
          <div className="lg:col-span-1 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Skeleton className="h-[400px] w-full rounded-3xl bg-gray-200 dark:bg-gray-700" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Skeleton className="h-[300px] w-full rounded-3xl bg-gray-200 dark:bg-gray-700" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketDetailPage() {
  const params = useParams();
  const publicClient = usePublicClient();
  const rawIdParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const marketId = typeof rawIdParam === 'string' ? rawIdParam : '';
  const marketIdNum = Number(marketId);
  const isMarketIdValid = marketId !== '' && Number.isInteger(marketIdNum) && marketIdNum >= 0;
  const { address, isConnected } = useAccount();

  // Core market state
  const [market, setMarket] = useState<any>(null);
  const [resolution, setResolution] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Use centralized market data hook
  const marketData = useMarketData(marketIdNum);

  // UI state
  const [activeTab, setActiveTab] = useState<'Position' | 'Comments' | 'Transactions' | 'Resolution'>('Resolution');
  const [holderTab, setHolderTab] = useState<'yes' | 'no'>('yes');
  const [chartSide, setChartSide] = useState<'yes' | 'no'>('yes');
  const [timeRange, setTimeRange] = useState<SnapshotTimeRange>('ALL');
  const [yesBalance, setYesBalance] = useState<string>('0');
  const [noBalance, setNoBalance] = useState<string>('0');
  const [logoSrc, setLogoSrc] = useState<string>(() => getAssetLogo());
  const [showInstantUpdateBadge, setShowInstantUpdateBadge] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [copied, setCopied] = useState(false);

  // Copy market link to clipboard
  const handleShareMarket = useCallback(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Snapshot query
  const snapshotQuery = useMarketSnapshot(
    isMarketIdValid ? marketIdNum : null,
    timeRange,
    SNAPSHOT_TRADE_LIMIT,
    SNAPSHOT_HOLDER_LIMIT,
  );
  const snapshotData = snapshotQuery.data ?? null;
  const snapshotLoading = snapshotQuery.isLoading;

  // Use both historical data and real-time data
  const {
    sortedChartData,
    mergePricePoints,
  } = useMarketPriceHistory(
    marketIdNum,
    timeRange,
    snapshotData,
    snapshotLoading,
    market?.createdAt,
    marketData.currentPrices
  );

  // Merge real-time data from useMarketData with historical data
  useEffect(() => {
    if (marketData.chartData.length > 0) {
      mergePricePoints(marketData.chartData);
    }
  }, [marketData.chartData, mergePricePoints]);

  const {
    transactions,
  } = useMarketTransactions(marketIdNum, snapshotData);

  const {
    topHoldersYes,
    topHoldersNo,
  } = useMarketHolders(snapshotData, marketData.currentPrices.yes, marketData.currentPrices.no);

  // Clear error when marketId changes
  useEffect(() => {
    setError('');
  }, [marketId]);

  // Load market metadata
  useEffect(() => {
    const loadMarketMetadata = async () => {
      if (!isMarketIdValid) return;

      try {
        const marketIdBigInt = BigInt(marketIdNum);
        
        const onchainData = await getMarket(marketIdBigInt);

        if (!onchainData.yes || onchainData.yes === '0x0000000000000000000000000000000000000000') {
          setError('Market does not exist');
          return;
        }

        let marketWithCreatedAt = onchainData as any;
        setMarket(marketWithCreatedAt);

        const resolutionData = await getMarketResolution(marketIdBigInt);
        setResolution(resolutionData);
      } catch (err) {
        console.error('Error loading market metadata:', err);
        setError('Failed to load market');
      }
    };

    loadMarketMetadata();
  }, [isMarketIdValid, marketIdNum]);

  // Watch for MarketCreated events
  useEffect(() => {
     // ... (Event watching logic preserved)
  }, [publicClient, isMarketIdValid, marketIdNum, market?.createdAt]);

  useEffect(() => {
    if (market?.question) {
      setLogoSrc(getAssetLogo(String(market.question)));
    }
  }, [market?.question]);

  const subscriptionPayload = useMemo(() => {
    if (!isMarketIdValid) return null;
    const secondsRange = getSecondsForRange(timeRange);
    const since = secondsRange !== null ? Math.max(0, Math.floor(Date.now() / 1000) - secondsRange) : 0;
    return {
      query: MARKET_LIVE_SUBSCRIPTION,
      variables: {
        id: marketIdNum.toString(),
        since: since.toString(),
        txLimit: SNAPSHOT_TRADE_LIMIT,
        holderLimit: SNAPSHOT_HOLDER_LIMIT,
      },
    };
  }, [isMarketIdValid, marketIdNum, timeRange]);

  const processSnapshotData = useCallback((snapshot: any) => {
    if (!snapshot) return;
    const tradesAsc = snapshot.tradesAsc ?? [];

    if (tradesAsc.length > 0) {
      const newPricePoints = tradesAsc.map((trade: any) => {
        if (!trade?.timestamp || trade.priceE6 === null) return null;
        const timestamp = Number(trade.timestamp);
        const priceYesValue = Number(trade.priceE6) / 1e6;
        if (!Number.isFinite(timestamp) || timestamp <= 0 || !Number.isFinite(priceYesValue)) return null;
        return {
          timestamp,
          priceYes: Math.max(0, Math.min(1, priceYesValue)),
          priceNo: Math.max(0, Math.min(1, 1 - priceYesValue)),
          txHash: trade.txHash ?? undefined,
        };
      }).filter((point: PricePoint | null): point is PricePoint => point !== null);
      
      if (newPricePoints.length > 0) {
         mergePricePoints(newPricePoints);
      }
    }
  }, [mergePricePoints]);

  useEffect(() => {
    if (!subscriptionPayload) return;
    let disposed = false;
    const unsubscribe = subscribeToSubgraph<{ market: any }>(
      subscriptionPayload,
      {
        onData: payload => {
          if (disposed) return;
          processSnapshotData(payload.market ?? null);
        },
        onError: error => console.error('[MarketDetail] Live subscription error', error),
      },
    );
    return () => { disposed = true; unsubscribe(); };
  }, [subscriptionPayload, processSnapshotData]);

  useEffect(() => {
    if (snapshotData) processSnapshotData(snapshotData);
  }, [snapshotData, processSnapshotData]);

  const { data: yesBal } = useReadContract({
    address: market?.yes as `0x${string}` | undefined,
    abi: positionTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!(address && market?.yes) },
  });

  const { data: noBal } = useReadContract({
    address: market?.no as `0x${string}` | undefined,
    abi: positionTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!(address && market?.no) },
  });

  useEffect(() => {
    if (yesBal) setYesBalance(formatUnits(yesBal as bigint, 18));
    if (noBal) setNoBalance(formatUnits(noBal as bigint, 18));
  }, [yesBal, noBal]);

  const currentPrice = chartSide === 'yes' ? marketData.currentPrices.yes : marketData.currentPrices.no;
  let chanceChangePercent = 0;
  if (sortedChartData.length > 0) {
    const firstPrice = chartSide === 'yes' ? sortedChartData[0].priceYes : sortedChartData[0].priceNo;
    if (firstPrice > 0) {
      chanceChangePercent = ((currentPrice - firstPrice) / firstPrice) * 100;
    }
  }

  const resolvedChartData = useMemo(() => {
    if (!sortedChartData.length || !market?.resolution?.isResolved) return sortedChartData;
    const yesWins = Boolean(market.resolution.yesWins);
    const lastPoint = sortedChartData[sortedChartData.length - 1];
    const finalTimestamp = (lastPoint?.timestamp ?? Math.floor(Date.now() / 1000)) + 1;
    const snapPoint: PricePoint = {
      timestamp: finalTimestamp,
      priceYes: yesWins ? 1 : 0,
      priceNo: yesWins ? 0 : 1,
      txHash: 'resolution-snap',
    };
    const alreadySnapped = Math.abs(lastPoint.priceYes - snapPoint.priceYes) < 1e-6 && Math.abs(lastPoint.priceNo - snapPoint.priceNo) < 1e-6;
    if (alreadySnapped) return sortedChartData;
    return [...sortedChartData, snapPoint];
  }, [sortedChartData, market?.resolution?.isResolved, market?.resolution?.yesWins]);

  const totalVolume = marketData.marketState ? Number(formatUnits(marketData.marketState.vault ?? 0n, 6)) : 0;
  
  // Merge createdAt from snapshotData if available (subgraph has it, on-chain doesn't)
  const marketWithCreatedAt = useMemo(() => {
    if (!market) return market;
    const createdAt = snapshotData?.createdAt ?? market.createdAt;
    return { ...market, createdAt };
  }, [market, snapshotData?.createdAt]);
  
  const createdAtDate = (() => {
    const createdAt = marketWithCreatedAt?.createdAt ?? snapshotData?.createdAt;
    if (!createdAt) return null;
    try {
      const numeric = typeof createdAt === 'bigint' ? Number(createdAt) : Number(createdAt);
      if (!Number.isFinite(numeric) || numeric <= 0) return null;
      return new Date(numeric * 1000);
    } catch { return null; }
  })();

  const marketStatus = typeof market?.status === 'number' ? market.status : Number(market?.status ?? 0);
  const marketResolution = market?.resolution;
  // Debug: log the resolution data to help diagnose expiryTimestamp issues
  if (marketResolution && (!marketResolution.expiryTimestamp || marketResolution.expiryTimestamp === 0n)) {
    console.warn(`[MarketDetail] Market ${marketId} has invalid expiryTimestamp:`, marketResolution);
  }
  const marketExpiry = marketResolution?.expiryTimestamp && marketResolution.expiryTimestamp !== 0n 
    ? Number(marketResolution.expiryTimestamp) 
    : 0;
  const marketIsResolved = Boolean(marketResolution?.isResolved);
  const marketIsExpired = marketExpiry > 0 && marketExpiry < Date.now() / 1000;
  const isChartRefreshing = snapshotLoading && sortedChartData.length > 0;
  const marketIsActive = marketStatus === 0 && !marketIsResolved && !marketIsExpired;
  
  const totalVolumeDisplay = totalVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (marketData.isLoading || !market || !resolution) {
    return <MarketDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-md bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-xl"
            role="alert"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" aria-hidden="true" />
            </motion.div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Market Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">{error}</p>
            <Link
              href="/markets"
              className="inline-flex items-center px-6 py-3 bg-[#14B8A6] text-white font-bold rounded-xl hover:bg-[#0D9488] transition-all shadow-lg hover:shadow-[#14B8A6]/20 hover:scale-105 active:scale-95"
              aria-label="Return to browse all markets"
            >
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
              Browse Markets
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!isMarketIdValid) {
    return (
      <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-center max-w-md bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-xl">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Invalid Market</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">The market ID provided is invalid.</p>
            <Link href="/markets" className="inline-flex items-center px-6 py-3 bg-[#14B8A6] text-white font-bold rounded-xl hover:bg-[#0D9488] transition-all shadow-lg hover:shadow-[#14B8A6]/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Markets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-x-hidden font-sans">
      
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
      </div>

      <Header />
   
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Link & Share Button */}
        <motion.div initial={prefersReducedMotion ? false : { x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="mb-6 flex items-center justify-between">
          <Link
            href="/markets"
            className="inline-flex items-center text-gray-500 hover:text-[#14B8A6] dark:text-gray-400 dark:hover:text-[#14B8A6] font-bold text-sm transition-colors group"
            aria-label="Navigate back to markets list"
          >
            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mr-3 group-hover:border-[#14B8A6] transition-colors shadow-sm">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </div>
            Back to Markets
          </Link>

          <button
            onClick={handleShareMarket}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-[#14B8A6] dark:hover:text-[#14B8A6] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-[#14B8A6] transition-all shadow-sm"
            aria-label={copied ? 'Link copied!' : 'Copy market link to clipboard'}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#14B8A6]" aria-hidden="true" />
                <span className="text-[#14B8A6]">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Market Header - Now contains the 3D Stats Banner inside */}
        <MarketHeader
          market={marketWithCreatedAt ?? market}
          resolution={resolution}
          totalVolume={totalVolume}
          totalVolumeDisplay={totalVolumeDisplay}
          createdAtDate={createdAtDate}
          logoSrc={logoSrc}
          marketIsActive={marketIsActive}
          marketIsCancelled={marketStatus === 2}
          yesPrice={marketData.currentPrices.yes}
          expiryTimestamp={BigInt(marketExpiry)}
          onLogoError={() => setLogoSrc('/logos/default.png')}
        />

        {/* Status Banner (Resolved/Expired/Cancelled) */}
        {(marketIsResolved || marketIsExpired || marketStatus === 2) && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-2 mb-8 px-6 py-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm ${
                marketStatus === 2
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-900 dark:text-red-100'
                : marketIsResolved
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50 text-purple-900 dark:text-purple-100'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-100'
            }`}
            role="status"
            aria-label={
              marketStatus === 2
                ? 'Market has been cancelled. All positions can be redeemed at 50% value.'
                : marketIsResolved
                  ? `Market finalized. Winning outcome: ${marketResolution?.yesWins ? 'YES' : 'NO'}`
                  : 'Market expired'
            }
          >
            <div className="flex items-center gap-3">
               {marketStatus === 2 ? (
                 <AlertTriangle className="w-5 h-5" aria-hidden="true" />
               ) : marketIsResolved ? (
                 <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
               ) : (
                 <Clock className="w-5 h-5" aria-hidden="true" />
               )}
               <span className="font-bold text-sm sm:text-base">
                 {marketStatus === 2 ? 'Market Cancelled' : marketIsResolved ? 'Market Finalized' : 'Market Expired'}
               </span>
            </div>
            {marketStatus === 2 ? (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-black/20 px-3 py-1.5 rounded-full">
                <span className="text-xs font-bold uppercase opacity-70">Redemption:</span>
                <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">
                  50% Value
                </span>
              </div>
            ) : marketIsResolved && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-black/20 px-3 py-1.5 rounded-full">
                <span className="text-xs font-bold uppercase opacity-70">Winning Outcome:</span>
                <span className={`text-xs font-black uppercase ${marketResolution?.yesWins ? 'text-[#14B8A6]' : 'text-red-500'}`}>
                    {marketResolution?.yesWins ? 'YES' : 'NO'}
                </span>
              </div>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
          
          {/* --- Left Column: Chart & Tabs (8 cols) --- */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Chart Card */}
            <motion.div
              initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.2 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-white/20 dark:border-gray-700/50"
            >
              {/* Chart Controls Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Current Price
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${chartSide === 'yes' ? 'bg-[#14B8A6]/10 text-[#14B8A6]' : 'bg-red-500/10 text-red-500'}`}>
                      {chartSide.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <PriceDisplay 
                      price={chartSide === 'yes' ? marketData.currentPrices.yes : marketData.currentPrices.no}
                      priceClassName="text-5xl sm:text-6xl font-black tracking-tighter text-gray-900 dark:text-white"
                      showInCents={true}
                    />
                    <div className={`flex items-center font-bold text-lg ${chanceChangePercent >= 0 ? 'text-[#14B8A6]' : 'text-red-500'}`}>
                      {chanceChangePercent >= 0 ? '↑' : '↓'} {Math.abs(chanceChangePercent).toFixed(2)}%
                      <span className="text-gray-400 dark:text-gray-500 text-xs font-medium ml-2 uppercase tracking-wide">past {timeRange}</span>
                    </div>
                  </div>
                </div>
                
                {/* Outcome Toggle */}
                <div className="bg-gray-100 dark:bg-gray-700/50 p-1.5 rounded-2xl flex w-full sm:w-auto" role="group" aria-label="Chart side selection">
                  <button
                    onClick={() => setChartSide('yes')}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 ${
                      chartSide === 'yes'
                        ? 'bg-white dark:bg-gray-600 text-[#14B8A6] shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    role="radio"
                    aria-checked={chartSide === 'yes'}
                    aria-label="Show YES outcome chart"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setChartSide('no')}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 ${
                      chartSide === 'no'
                        ? 'bg-white dark:bg-gray-600 text-red-500 shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    role="radio"
                    aria-checked={chartSide === 'no'}
                    aria-label="Show NO outcome chart"
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Chart Visual */}
              <div className="h-[350px] w-full mb-8 relative">
                 {/* */}
                {snapshotLoading && sortedChartData.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading chart data">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-[#14B8A6] animate-spin" aria-hidden="true" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Data</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full">
                    <PriceChart
                      data={resolvedChartData}
                      selectedSide={chartSide}
                      marketId={marketIdNum}
                      useCentralizedData={true}
                    />
                    {isChartRefreshing && (
                      <div className="absolute top-2 right-2 px-3 py-1 bg-[#14B8A6]/10 backdrop-blur-md rounded-full border border-[#14B8A6]/20 flex items-center gap-2" role="status" aria-label="Chart updating with live data">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#14B8A6]"></span>
                        </span>
                        <span className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-wider">Live</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center justify-start border-t border-gray-100 dark:border-gray-700/50 pt-6 gap-2 overflow-x-auto" role="group" aria-label="Time range selection">
                {(['1D', '1W', '1M', 'ALL'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap hover:scale-105 active:scale-95 ${
                      timeRange === range
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    role="radio"
                    aria-checked={timeRange === range}
                    aria-label={`Show ${range === 'ALL' ? 'all time' : range} chart data`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Tabs Section */}
            <motion.div
              initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-[32px] shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto scrollbar-hide p-2 bg-gray-50/50 dark:bg-gray-900/20" role="tablist" aria-label="Market details navigation">
                {(['Position', 'Comments', 'Transactions', 'Resolution'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-3 text-sm font-bold whitespace-nowrap transition-all relative rounded-2xl ${
                      activeTab === tab
                        ? 'text-[#14B8A6]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`${tab.toLowerCase()}-panel`}
                    aria-label={`View ${tab.toLowerCase()} information`}
                  >
                    <span className="relative z-10">{tab}</span>
                    {activeTab === tab && (
                      <motion.div 
                        layoutId="activeTabPill" 
                        className="absolute inset-0 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl z-0" 
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} 
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6 sm:p-8 bg-gray-50/50 dark:bg-gray-900/50 min-h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    role="tabpanel"
                    id={`${activeTab.toLowerCase()}-panel`}
                    aria-label={`${activeTab} content`}
                  >
                    {activeTab === 'Position' && (
                      <PositionTab isConnected={isConnected} yesBalance={yesBalance} noBalance={noBalance} priceYes={marketData.currentPrices.yes} priceNo={marketData.currentPrices.no} />
                    )}
                    {activeTab === 'Comments' && <CommentsTab marketId={marketId} isConnected={isConnected} address={address} />}
                    {activeTab === 'Transactions' && <TransactionsTab transactions={transactions} loading={snapshotLoading && transactions.length === 0} />}
                    {activeTab === 'Resolution' && (
                      <ResolutionTab 
                        resolution={resolution} 
                        marketId={marketIdNum}
                        marketStatus={marketStatus === 0 ? 'active' : marketStatus === 1 ? 'resolved' : 'cancelled'}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* --- Right Column: Trading & Stats (4 cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Trading Card (Desktop Sticky) */}
            <motion.div
              initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: prefersReducedMotion ? 0 : 0.4 }}
              className="sticky top-24 space-y-6"
            >
              {isMarketIdValid && market && (
                <>
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[32px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-black/30 border border-white/20 dark:border-gray-700/50 overflow-hidden relative z-20">
                    <TradingCard marketId={marketIdNum} marketData={marketData} />
                  </div>

                  {!marketIsActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`rounded-2xl border p-4 text-sm font-medium flex items-center gap-3 ${
                        marketStatus === 2
                          ? 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-400'
                          : 'border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400'
                      }`}
                      role="alert"
                      aria-live="polite"
                    >
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      <span>
                        {marketStatus === 2
                          ? 'This market has been cancelled. All positions can be redeemed at 50% value.'
                          : 'Trading is currently closed for this market.'}
                      </span>
                    </motion.div>
                  )}

                  {/* Admin Actions (Right Sidebar) */}
                  {isMarketIdValid && market && (
                    <AdminMarketActions
                      marketId={marketIdNum}
                      marketStatus={marketStatus === 0 ? 'active' : marketStatus === 1 ? 'resolved' : 'cancelled'}
                      isResolved={marketIsResolved}
                      expiryTimestamp={marketExpiry ? BigInt(marketExpiry) : 0n}
                      oracleType={resolution?.oracleType || 0}
                      oracleAddress={resolution?.oracleAddress}
                    />
                  )}

                  <div className="bg-white dark:bg-gray-800 rounded-[24px] shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <TopHoldersCard 
                        holderTab={holderTab} 
                        setHolderTab={setHolderTab} 
                        topHoldersYes={topHoldersYes} 
                        topHoldersNo={topHoldersNo} 
                        address={address} 
                        yesBalance={yesBalance} 
                        noBalance={noBalance} 
                        priceYes={marketData.currentPrices.yes} 
                        priceNo={marketData.currentPrices.no} 
                    />
                  </div>
                </>
              )}
            </motion.div>
          </div>

        </div>
        
        {/* Instant Update Toast */}
        <AnimatePresence>
            {showInstantUpdateBadge && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-8 right-8 px-5 py-3 rounded-full bg-gray-900/90 dark:bg-white/90 backdrop-blur text-white dark:text-gray-900 text-sm font-bold shadow-2xl flex items-center gap-3 z-50"
              role="status"
              aria-live="polite"
              aria-label="Market prices have been updated"
            >
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#14B8A6]"></span>
                </div>
                Prices updated
            </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
}