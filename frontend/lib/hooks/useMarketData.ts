import { useState, useEffect, useCallback, useRef } from 'react';
import { useBlockNumber, usePublicClient } from 'wagmi';
import { getMarketState as fetchMarketState, getSpotPriceYesE6, getMarketResolution } from '@/lib/hooks';
import type { PricePoint } from '@/lib/priceHistory/types';

export interface MarketPrices {
  yes: number;
  no: number;
}

export interface InstantPrices {
  yes: number;
  no: number;
}

export interface MarketState {
  qYes: bigint;
  qNo: bigint;
  vault: bigint;
  b: bigint;
  priceYes: bigint;
}

export interface UseMarketDataResult {
  // Current prices
  currentPrices: MarketPrices;
  instantPrices: InstantPrices;

  // Chart data
  chartData: PricePoint[];

  // Market state
  marketState: MarketState | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  refetch: () => Promise<void>;
}

export function useMarketData(marketId: number): UseMarketDataResult {
  const marketIdBigInt = BigInt(marketId);
  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // State
  const [currentPrices, setCurrentPrices] = useState<MarketPrices>({ yes: 0.5, no: 0.5 });
  const [instantPrices, setInstantPrices] = useState<InstantPrices>({ yes: 0.5, no: 0.5 });
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [marketState, setMarketState] = useState<MarketState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for polling
  const lastCheckedBlockRef = useRef<bigint | null>(null);
  const lastPriceUpdateTimeRef = useRef<number>(0);
  const processedTxHashesRef = useRef<Set<string>>(new Set());

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!publicClient || marketId <= 0) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load market state
      const stateResult = await fetchMarketState(marketIdBigInt);

      // Also check resolution status
      const resolution = await getMarketResolution(marketIdBigInt);

      if (stateResult) {
        const { qYes, qNo, vault, bE18: b, priceYesE6 } = stateResult;
        setMarketState({ qYes, qNo, vault, b, priceYes: priceYesE6 });

        let yesPrice = Number(priceYesE6) / 1e6;
        let noPrice = 1 - yesPrice;

        // Override prices if resolved
        if (resolution && resolution.isResolved) {
          if (resolution.yesWins) {
            yesPrice = 1;
            noPrice = 0;
          } else {
            yesPrice = 0;
            noPrice = 1;
          }
        }

        setCurrentPrices({ yes: yesPrice, no: noPrice });
        setInstantPrices({ yes: yesPrice, no: noPrice });
      }

    } catch (err) {
      console.error('[useMarketData] Failed to load initial data:', err);
      setError('Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, marketId, marketIdBigInt]);

  // Block polling for price changes
  useEffect(() => {
    if (!blockNumber || !publicClient || marketId <= 0) return;

    // Check every block
    // Explicitly cast to BigInt to avoid "Cannot mix BigInt and other types" if blockNumber is a number
    const currentBlock = BigInt(blockNumber);
    if (lastCheckedBlockRef.current && currentBlock - lastCheckedBlockRef.current < 1n) {
      return;
    }

    lastCheckedBlockRef.current = currentBlock;

    // Throttle updates
    const now = Date.now();
    if (now - lastPriceUpdateTimeRef.current < 2000) {
      return;
    }

    const pollPrices = async () => {
      try {
        // Check resolution status first
        const resolution = await getMarketResolution(marketIdBigInt);
        if (resolution && resolution.isResolved) {
          // If resolved, stop polling and set final prices
          let yesPrice = 0;
          let noPrice = 0;
          if (resolution.yesWins) {
            yesPrice = 1;
            noPrice = 0;
          } else {
            yesPrice = 0;
            noPrice = 1;
          }

          if (currentPrices.yes !== yesPrice) {
            setCurrentPrices({ yes: yesPrice, no: noPrice });
            setInstantPrices({ yes: yesPrice, no: noPrice });
          }
          return;
        }

        const priceYesE6 = await getSpotPriceYesE6(marketIdBigInt);
        if (!priceYesE6) return;

        const newPriceYes = Number(priceYesE6) / 1e6;
        const newPriceNo = 1 - newPriceYes;

        // Only update if price changed significantly
        const priceChange = Math.abs(currentPrices.yes - newPriceYes);
        if (priceChange > 0.00001) {
          // ... (rest of existing polling logic)
          console.log('[useMarketData] 📊 Price change detected:', {
            oldPrice: currentPrices.yes,
            newPrice: newPriceYes,
            change: priceChange
          });

          // Update current prices
          setCurrentPrices({ yes: newPriceYes, no: newPriceNo });
          setInstantPrices({ yes: newPriceYes, no: newPriceNo });

          // Create synthetic transaction hash for deduplication
          const syntheticTxHash = `block-polled-${blockNumber}-${newPriceYes.toFixed(6)}`;

          // Dispatch instant-trade-update event for useMarketPriceHistory
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('instant-trade-update', {
              detail: {
                marketId: marketId,
                newPriceYes: newPriceYes,
                newPriceNo: newPriceNo,
                timestamp: Math.floor(Date.now() / 1000),
                txHash: syntheticTxHash,
                source: 'block-fallback'
              }
            });
            window.dispatchEvent(event);
            console.log('[useMarketData] 🚀 Dispatched instant-trade-update event');
          }

          // Add to chart data if not already processed
          if (!processedTxHashesRef.current.has(syntheticTxHash)) {
            processedTxHashesRef.current.add(syntheticTxHash);

            const newPoint: PricePoint = {
              timestamp: Math.floor(Date.now() / 1000),
              priceYes: newPriceYes,
              priceNo: newPriceNo,
              txHash: syntheticTxHash,
            };

            setChartData(prev => {
              const updated = [...prev, newPoint];
              // Keep only last 1000 points for performance
              return updated.slice(-1000);
            });

            console.log('[useMarketData] 📈 Added chart point:', newPoint);
          }

          lastPriceUpdateTimeRef.current = now;
        }
      } catch (err) {
        console.error('[useMarketData] Polling error:', err);
      }
    };

    pollPrices();
  }, [blockNumber, publicClient, marketId, currentPrices.yes, marketIdBigInt]);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refetch function
  const refetch = useCallback(async () => {
    await loadInitialData();
  }, [loadInitialData]);

  return {
    currentPrices,
    instantPrices,
    chartData,
    marketState,
    isLoading,
    error,
    refetch,
  };
}
