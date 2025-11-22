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

// Components
import Header from '@/components/Header';
import TradingCard from '@/components/TradingCard';
import { PriceChart } from '@/components/PriceChart';
import { MarketHeader } from '@/components/market/MarketHeader';
import { Skeleton } from '@/components/ui';

// Lib
import { getMarket, getSpotPriceYesE6, getMarketResolution, getMarketState } from '@/lib/hooks';
import { addresses } from '@/lib/contracts';
import { positionTokenAbi, coreAbi } from '@/lib/abis';
import { formatPriceInCents, getAssetLogo } from '@/lib/marketUtils';
import type { PricePoint } from '@/lib/priceHistory/types';
import {
  useMarketSnapshot,
  type SnapshotTimeRange,
  type SnapshotTrade,
  getSecondsForRange,
} from '@/lib/useMarketSnapshot';
import { subscribeToSubgraph } from '@/lib/subgraphClient';
import type { TransactionRow, Holder } from '@/lib/marketTransformers';
import { toTransactionRow, toHolder } from '@/lib/marketTransformers';

// Custom Hooks
import { useMarketPriceHistory } from '@/lib/hooks/useMarketPriceHistory';
import { useMarketTransactions } from '@/lib/hooks/useMarketTransactions';
import { useMarketHolders } from '@/lib/hooks/useMarketHolders';

// Tabs
import { PositionTab } from './tabs/PositionTab';
import { CommentsTab } from './tabs/CommentsTab';
import { TransactionsTab } from './tabs/TransactionsTab';
import { ResolutionTab } from './tabs/ResolutionTab';
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
    <div className="min-h-screen bg-[#FAF9FF] relative overflow-hidden">
      <Header />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <Skeleton className="h-6 w-32 mb-6 rounded-full" />
        
        {/* Header Skeleton */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
            <div className="flex-1 w-full space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <div className="flex gap-3">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-[500px] w-full rounded-3xl" />
            <Skeleton className="h-[300px] w-full rounded-3xl" />
          </div>
          <div className="lg:col-span-1 space-y-8">
            <Skeleton className="h-[400px] w-full rounded-3xl" />
            <Skeleton className="h-[300px] w-full rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketDetailPage() {
  const params = useParams();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const rawIdParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const marketId = typeof rawIdParam === 'string' ? rawIdParam : '';
  const marketIdNum = Number(marketId);
  const isMarketIdValid = marketId !== '' && Number.isInteger(marketIdNum) && marketIdNum >= 0;
  const { address, isConnected } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });

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
  const instantBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // Pass market createdAt so chart shows 0.5/0.5 at market creation time immediately
  const {
    livePriceHistory,
    sortedChartData,
    mergePricePoints,
    lastHistoricalTimestampRef,
  } = useMarketPriceHistory(
    marketIdNum,
    timeRange,
    snapshotData,
    snapshotLoading,
    market?.createdAt, // Pass market createdAt from blockchain event (available immediately)
    marketData.currentPrices // Pass current prices to sync chart if history is lagging
  );

  // Merge real-time data from useMarketData with historical data
  useEffect(() => {
    if (marketData.chartData.length > 0) {
      mergePricePoints(marketData.chartData);
    }
  }, [marketData.chartData, mergePricePoints]);

  const {
    transactions,
    mergeTransactionRows,
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
        
        // Check localStorage for newly created market timestamp (available immediately)
        try {
          const storedMarkets = JSON.parse(
            localStorage.getItem('newlyCreatedMarkets') || '[]'
          );
          const storedMarket = storedMarkets.find((m: any) => m.marketId === marketIdNum);
          if (storedMarket?.createdAt) {
            console.log('[MarketDetail] Found stored createdAt for newly created market:', storedMarket.createdAt);
          }
        } catch (error) {
          console.warn('[MarketDetail] Failed to read localStorage:', error);
        }
        
        const onchainData = await getMarket(marketIdBigInt);

        if (!onchainData.yes || onchainData.yes === '0x0000000000000000000000000000000000000000') {
          setError('Market does not exist');
          return;
        }

        // Check if we have a stored createdAt from localStorage (newly created market)
        let marketWithCreatedAt = onchainData as any;
        try {
          const storedMarkets = JSON.parse(
            localStorage.getItem('newlyCreatedMarkets') || '[]'
          );
          const storedMarket = storedMarkets.find((m: any) => m.marketId === marketIdNum);
          if (storedMarket?.createdAt && !marketWithCreatedAt.createdAt) {
            // Use stored createdAt immediately (from market creation transaction)
            marketWithCreatedAt.createdAt = BigInt(storedMarket.createdAt);
            console.log('[MarketDetail] Using stored createdAt from localStorage:', storedMarket.createdAt);
          }
        } catch (error) {
          console.warn('[MarketDetail] Failed to read localStorage:', error);
        }

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

  // Watch for MarketCreated events and fetch historical events to capture createdAt timestamp immediately
  // This ensures createdAt shows immediately even before subgraph indexes it
  useEffect(() => {
    if (!publicClient || !isMarketIdValid) return;
    
    // If we already have createdAt, skip (subgraph already indexed it)
    if (market?.createdAt) return;

    const marketIdBigInt = BigInt(marketIdNum);
    
    // First, check localStorage for newly created market timestamp (fastest)
    try {
      const storedMarkets = JSON.parse(
        localStorage.getItem('newlyCreatedMarkets') || '[]'
      );
      const storedMarket = storedMarkets.find((m: any) => m.marketId === marketIdNum);
      if (storedMarket?.createdAt) {
        const createdAtTimestamp = BigInt(storedMarket.createdAt);
        console.log('[MarketDetail] Using stored createdAt from localStorage:', createdAtTimestamp);
        setMarket((prev: any) => {
          if (!prev) return prev;
          if (prev.createdAt && prev.createdAt === createdAtTimestamp) return prev;
          return { ...prev, createdAt: createdAtTimestamp };
        });
        return; // Found it, exit early
      }
    } catch (error) {
      console.warn('[MarketDetail] Failed to read localStorage:', error);
    }
    
    // First, try to fetch the historical MarketCreated event for this market
    const fetchMarketCreatedEvent = async () => {
      try {
        // Get current block to search backwards
        // Search more recent blocks first (last 10k blocks) for newly created markets
        const currentBlock = await publicClient.getBlockNumber();
        const recentFromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n;
        const fromBlock = currentBlock > 100000n ? currentBlock - 100000n : 0n;
        
        // Try recent blocks first (for newly created markets)
        let logs: any[] = [];
        try {
          logs = await publicClient.getLogs({
            address: addresses.core,
            event: {
              type: 'event',
              name: 'MarketCreated',
              inputs: [
                { type: 'uint256', name: 'id', indexed: true },
                { type: 'address', name: 'yes', indexed: false },
                { type: 'address', name: 'no', indexed: false },
                { type: 'string', name: 'question', indexed: false },
                { type: 'uint256', name: 'initUsdc', indexed: false },
                { type: 'uint256', name: 'expiryTimestamp', indexed: false },
              ],
            } as any,
            args: {
              id: marketIdBigInt,
            } as any,
            fromBlock: recentFromBlock,
            toBlock: 'latest',
          });
        } catch (error) {
          // If recent search fails, try full range
          console.warn('[MarketDetail] Recent block search failed, trying full range:', error);
          logs = await publicClient.getLogs({
            address: addresses.core,
            event: {
              type: 'event',
              name: 'MarketCreated',
              inputs: [
                { type: 'uint256', name: 'id', indexed: true },
                { type: 'address', name: 'yes', indexed: false },
                { type: 'address', name: 'no', indexed: false },
                { type: 'string', name: 'question', indexed: false },
                { type: 'uint256', name: 'initUsdc', indexed: false },
                { type: 'uint256', name: 'expiryTimestamp', indexed: false },
              ],
            } as any,
            args: {
              id: marketIdBigInt,
            } as any,
            fromBlock,
            toBlock: 'latest',
          });
        }

        // Find the event for this market
        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: coreAbi,
              data: log.data,
              topics: log.topics,
            }) as { eventName: string; args: Record<string, unknown> };

            if (decoded.eventName !== 'MarketCreated') continue;
            
            const eventId = decoded.args?.id;
            if (Number(eventId) !== marketIdNum) continue;

            // Get block timestamp for accurate createdAt
            if (log.blockNumber) {
              try {
                const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                if (block?.timestamp) {
                  const createdAtTimestamp = BigInt(Number(block.timestamp));
                  console.log('[MarketDetail] Found MarketCreated event, setting createdAt:', createdAtTimestamp);
                  setMarket((prev: any) => {
                    if (!prev) return prev;
                    if (prev.createdAt && prev.createdAt === createdAtTimestamp) return prev;
                    return { ...prev, createdAt: createdAtTimestamp };
                  });
                  return; // Found it, exit
                }
              } catch (error) {
                console.warn('[MarketDetail] Failed to get block timestamp for MarketCreated', error);
              }
            }
          } catch (error) {
            console.warn('[MarketDetail] Failed to decode MarketCreated log:', error);
          }
        }
      } catch (error) {
        console.warn('[MarketDetail] Failed to fetch MarketCreated event:', error);
      }
    };

    // Fetch historical event
    void fetchMarketCreatedEvent();

    // Also watch for new MarketCreated events (in case market is created while viewing)
    const unwatchMarketCreated = publicClient.watchContractEvent({
      address: addresses.core,
      abi: coreAbi,
      eventName: 'MarketCreated',
      args: {
        id: marketIdBigInt,
      } as any,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: coreAbi,
              data: log.data,
              topics: log.topics,
            }) as { eventName: string; args: Record<string, unknown> };

            if (decoded.eventName !== 'MarketCreated') continue;

            const eventId = decoded.args?.id;
            if (Number(eventId) !== marketIdNum) continue;

            // Get block timestamp for accurate createdAt
            if (log.blockNumber) {
              try {
                const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
                if (block?.timestamp) {
                  const createdAtTimestamp = BigInt(Number(block.timestamp));
                  console.log('[MarketDetail] MarketCreated event detected, setting createdAt:', createdAtTimestamp);
                  setMarket((prev: any) => {
                    if (!prev) return prev;
                    if (prev.createdAt && prev.createdAt === createdAtTimestamp) return prev;
                    return { ...prev, createdAt: createdAtTimestamp };
                  });
                }
              } catch (error) {
                console.warn('[MarketDetail] Failed to get block timestamp for MarketCreated', error);
              }
            }
          } catch (error) {
            console.warn('[MarketDetail] Failed to decode MarketCreated log:', error);
          }
        }
      },
    });

    return () => {
      unwatchMarketCreated?.();
    };
  }, [publicClient, isMarketIdValid, marketIdNum, market?.createdAt]);

  // Set logo when market loads
  useEffect(() => {
    if (market?.question) {
      setLogoSrc(getAssetLogo(String(market.question)));
    }
  }, [market?.question]);

  // Subscription payload
  const subscriptionPayload = useMemo(() => {
    if (!isMarketIdValid) return null;
    const secondsRange = getSecondsForRange(timeRange);
    const since =
      secondsRange !== null
        ? Math.max(0, Math.floor(Date.now() / 1000) - secondsRange)
        : 0;
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

  // Process snapshot data when it arrives
  const processSnapshotData = useCallback(
    (snapshot: any) => {
      if (!snapshot) return;

      // Prices are now managed by centralized hook
      const tradesAsc = snapshot.tradesAsc ?? [];

      // Merge new trades into chart price history (for cross-browser updates)
      if (tradesAsc.length > 0) {
        const newPricePoints = tradesAsc
          .map((trade: any) => {
            if (!trade?.timestamp || trade.priceE6 === null || trade.priceE6 === undefined) {
              return null;
            }
            const timestamp = Number(trade.timestamp);
            const priceYesValue = Number(trade.priceE6) / 1e6;
            if (!Number.isFinite(timestamp) || timestamp <= 0 || !Number.isFinite(priceYesValue)) {
              return null;
            }
            return {
              timestamp,
              priceYes: Math.max(0, Math.min(1, priceYesValue)),
              priceNo: Math.max(0, Math.min(1, 1 - priceYesValue)),
              txHash: trade.txHash ?? undefined,
            };
          })
          .filter((point: PricePoint | null): point is PricePoint => point !== null);
        
        if (newPricePoints.length > 0) {
           // We need to update the history state in useMarketPriceHistory
           // But since we can't directly access the setter from here,
           // and useMarketPriceHistory handles snapshotData updates via useEffect,
           // we might not need to do anything here if snapshotData is updated correctly.
           // However, this callback is for subscription updates.
           // Let's use the mergePricePoints function from useMarketPriceHistory!
           mergePricePoints(newPricePoints);
        }
      }

      // Update createdAt if available
      if (snapshot.createdAt) {
        try {
          const createdAtBigInt = BigInt(snapshot.createdAt);
          setMarket((prev: any) => {
            if (!prev) return prev;
            if (typeof prev.createdAt === 'bigint' && prev.createdAt === createdAtBigInt) {
              return prev;
            }
            return { ...prev, createdAt: createdAtBigInt };
          });
        } catch (error) {
          console.warn('Failed to parse createdAt', error);
        }
      }
    },
    [mergePricePoints]
  );

  // Subscribe to live updates
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
        onError: error => {
          console.error('[MarketDetail] Live subscription error', error);
        },
      },
    );

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [subscriptionPayload, processSnapshotData]);

  // Process initial snapshot data to add createdAt to market
  useEffect(() => {
    if (snapshotData) {
      processSnapshotData(snapshotData);
    }
  }, [snapshotData, processSnapshotData]);

  // Get user balances
  const { data: yesBal } = useReadContract({
    address: market?.yes as `0x${string}` | undefined,
    abi: positionTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!(address && market?.yes),
    },
  });

  const { data: noBal } = useReadContract({
    address: market?.no as `0x${string}` | undefined,
    abi: positionTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!(address && market?.no),
    },
  });

  useEffect(() => {
    if (yesBal) {
      setYesBalance(formatUnits(yesBal as bigint, 18));
    }
    if (noBal) {
      setNoBalance(formatUnits(noBal as bigint, 18));
    }
  }, [yesBal, noBal]);

  // Calculate percentage change
  const currentPrice = chartSide === 'yes' ? marketData.currentPrices.yes : marketData.currentPrices.no;
  let chanceChangePercent = 0;
  if (sortedChartData.length > 0) {
    const firstPrice = chartSide === 'yes' ? sortedChartData[0].priceYes : sortedChartData[0].priceNo;
    if (firstPrice > 0) {
      chanceChangePercent = ((currentPrice - firstPrice) / firstPrice) * 100;
    }
  }

  // Resolved chart data (snap to 0 or 1 when resolved)
  const resolvedChartData = useMemo(() => {
    if (!sortedChartData.length || !market?.resolution?.isResolved) {
      return sortedChartData;
    }

    const yesWins = Boolean(market.resolution.yesWins);
    const lastPoint = sortedChartData[sortedChartData.length - 1];
    const finalTimestamp = (lastPoint?.timestamp ?? Math.floor(Date.now() / 1000)) + 1;
    const snapPoint: PricePoint = {
      timestamp: finalTimestamp,
      priceYes: yesWins ? 1 : 0,
      priceNo: yesWins ? 0 : 1,
      txHash: 'resolution-snap',
    };
    const alreadySnapped =
      Math.abs(lastPoint.priceYes - snapPoint.priceYes) < 1e-6 &&
      Math.abs(lastPoint.priceNo - snapPoint.priceNo) < 1e-6;
    if (alreadySnapped) {
      return sortedChartData;
    }
    return [...sortedChartData, snapPoint];
  }, [sortedChartData, market?.resolution?.isResolved, market?.resolution?.yesWins]);

  // Market status
  const totalVolume = marketData.marketState ? Number(formatUnits(marketData.marketState.vault ?? 0n, 6)) : 0;
  const createdAtDate = (() => {
    if (!market?.createdAt) return null;
    try {
      const numeric = typeof market.createdAt === 'bigint'
        ? Number(market.createdAt)
        : Number(market.createdAt);
      if (!Number.isFinite(numeric) || numeric <= 0) return null;
      return new Date(numeric * 1000);
    } catch {
      return null;
    }
  })();

  const marketStatus = typeof market?.status === 'number' ? market.status : Number(market?.status ?? 0);
  const marketResolution = market?.resolution;
  const marketExpiry = marketResolution?.expiryTimestamp ? Number(marketResolution.expiryTimestamp) : 0;
  const marketIsResolved = Boolean(marketResolution?.isResolved);
  const marketIsExpired = marketExpiry > 0 && marketExpiry < Date.now() / 1000;
  const isChartRefreshing = snapshotLoading && sortedChartData.length > 0;
  const marketIsActive = marketStatus === 0 && !marketIsResolved && !marketIsExpired;

  // Loading state - wait for market metadata, resolution, and market data
  if (marketData.isLoading || !market || !resolution) {
    return <MarketDetailSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF9FF]">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)]">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Market Not Found</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/markets" className="inline-flex items-center px-4 py-2 bg-[#14B8A6] text-white rounded-lg hover:bg-[#14B8A6]/90 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Browse Markets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Invalid market ID
  if (!isMarketIdValid) {
    return (
      <div className="min-h-screen bg-[#FAF9FF]">
        <Header />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center bg-white rounded-2xl p-12 shadow-xl"
          >
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Market Not Found</h2>
            <p className="text-gray-600 mb-6">The market you&apos;re looking for doesn&apos;t exist.</p>
            <Link
              href="/markets"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-bold rounded-lg hover:shadow-lg transition-all"
            >
              Back to Markets
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="min-h-screen bg-[#f5f0ff] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#14B8A6]/10 to-purple-400/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-[#14B8A6]/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, delay: 2 }}
        />
      </div>
      <Header />
   
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Back Link */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          <Link href="/markets" className="inline-flex items-center text-[#14B8A6] hover:text-[#0D9488] mb-4 sm:mb-6 font-semibold group text-sm sm:text-base" data-testid="back-button">
            <motion.svg
              className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:-translate-x-1 transition-transform"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </motion.svg>
            BACK TO MARKETS
          </Link>
        </motion.div>

        {/* Market Header */}
        <MarketHeader
          market={market}
          resolution={resolution}
          totalVolume={totalVolume}
          createdAtDate={createdAtDate}
          logoSrc={logoSrc}
          marketIsActive={marketIsActive}
          onLogoError={() => setLogoSrc('/logos/default.png')}
        />

        {(marketIsResolved || marketIsExpired) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 px-5 py-3 rounded-2xl border border-gray-200 bg-gradient-to-r from-[#fef3c7] to-[#fde68a] text-sm text-amber-900 shadow-inner flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          >
            <span className="font-semibold">
              {marketIsResolved
                ? 'Market resolved — trading is closed.'
                : 'Market expired — trading is closed.'}
            </span>
            {marketIsResolved && (
              <span className="text-[11px] tracking-widest uppercase text-gray-700 bg-white/70 px-3 py-1 rounded-full shadow-sm">
                Winner: {marketResolution?.yesWins ? 'YES' : 'NO'}
              </span>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 md:space-y-8 flex flex-col-reverse lg:block">
            {/* Trading Card - Mobile */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:hidden bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-100"
            >
              {isMarketIdValid && market && (
                <>
                  <TradingCard marketId={marketIdNum} marketData={marketData} />
                  {!marketIsActive && (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Trading for this market is closed.
                    {marketIsResolved
                    ? ' The market has been resolved.'
                    : marketIsExpired
                      ? ' The market has expired.'
                      : ' Trading is currently unavailable.'}
                  </div>
                  )}
                </>
              )}
            </motion.div>

              {/* Chart Card */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Market Price
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${chartSide === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {chartSide}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <motion.div
                      key={chartSide === 'yes' ? marketData.currentPrices.yes : marketData.currentPrices.no}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-5xl sm:text-6xl font-black tracking-tighter text-gray-900"
                    >
                      {formatPriceInCents(chartSide === 'yes' ? marketData.currentPrices.yes : marketData.currentPrices.no)}
                    </motion.div>
                    <div className={`flex items-center font-bold text-lg ${chanceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {chanceChangePercent >= 0 ? '↑' : '↓'} {Math.abs(chanceChangePercent).toFixed(2)}%
                      <span className="text-gray-400 text-xs font-medium ml-2">past {timeRange.toLowerCase()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex bg-gray-100/80 p-1 rounded-xl self-start sm:self-center w-full sm:w-auto backdrop-blur-sm">
                  <button
                    onClick={() => setChartSide('yes')}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${
                      chartSide === 'yes'
                        ? 'bg-white text-green-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setChartSide('no')}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${
                      chartSide === 'no'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Chart Container */}
              <div className="h-[300px] sm:h-[400px] w-full mb-6 relative">
                {snapshotLoading && sortedChartData.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 rounded-xl">
                    <div className="flex flex-col items-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full"
                      />
                      <span className="text-sm font-medium text-gray-500">Loading chart data...</span>
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
                      <div className="absolute top-2 right-2 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full border border-gray-200 shadow-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
                        <span className="text-xs font-medium text-gray-600">Live</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Time Range Controls */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4 overflow-x-auto">
                <div className="flex gap-2 w-full sm:w-auto">
                  {(['1D', '1W', '1M', 'ALL'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                        timeRange === range
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Tabs Section */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden"
            >
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {(['Position', 'Comments', 'Transactions', 'Resolution'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors relative ${
                      activeTab === tab
                        ? 'text-[#14B8A6]'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6 sm:p-8 bg-gray-50/30 min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'Position' && (
                      <PositionTab
                        isConnected={isConnected}
                        yesBalance={yesBalance}
                        noBalance={noBalance}
                        priceYes={marketData.currentPrices.yes}
                        priceNo={marketData.currentPrices.no}
                      />
                    )}
                    {activeTab === 'Comments' && (
                      <CommentsTab
                        marketId={marketId}
                        isConnected={isConnected}
                        address={address}
                      />
                    )}
                    {activeTab === 'Transactions' && (
                      <TransactionsTab
                        transactions={transactions}
                        loading={snapshotLoading && transactions.length === 0}
                      />
                    )}
                    {activeTab === 'Resolution' && (
                      <ResolutionTab resolution={resolution} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Trading Card - Desktop */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="hidden lg:block"
            >
              {isMarketIdValid && market && (
                <div className="sticky top-24 space-y-6">
                  <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                    <TradingCard marketId={marketIdNum} marketData={marketData} />
                  </div>
                  
                  {!marketIsActive && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-medium">
                      ⚠️ Trading for this market is closed.
                    </div>
                  )}

                  {/* Top Holders */}
                  <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
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
                </div>
              )}
            </motion.div>
          </div>
        </div>
                {showInstantUpdateBadge && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="fixed bottom-6 right-6 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-bold shadow-lg flex items-center gap-2 z-50"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
                    Prices updated
                  </motion.div>
                )}
      </div>
    </div>
  );
}
