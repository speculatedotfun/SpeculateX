'use client';

import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts';
import type { PricePoint } from '@/lib/priceHistory/types';
import { useTheme } from '@/lib/theme';

interface PriceChartProps {
  data: PricePoint[];
  selectedSide: 'yes' | 'no';
  height?: number;
  marketId?: number;
  useCentralizedData?: boolean;
}

export const PriceChart = memo(function PriceChart({ data, selectedSide, height = 350 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const yesSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const noSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const throttledResizeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moduleRef = useRef<typeof import('lightweight-charts') | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  const hasData = Array.isArray(data) && data.length > 0;
  const showLoadingOverlay = !hasData;
  const [chartError, setChartError] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Enhanced color palette
  const colors = useMemo(() => ({
    yes: {
      line: '#10B981', // Emerald 500
      lineGlow: '#34D399',
      areaTop: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)',
      areaBottom: 'rgba(16, 185, 129, 0.0)',
      areaTopFaded: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
      marker: '#10B981',
    },
    no: {
      line: '#F43F5E', // Rose 500
      lineGlow: '#FB7185',
      areaTop: isDark ? 'rgba(244, 63, 94, 0.35)' : 'rgba(244, 63, 94, 0.25)',
      areaBottom: 'rgba(244, 63, 94, 0.0)',
      areaTopFaded: isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.05)',
      marker: '#F43F5E',
    },
    grid: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)',
    text: isDark ? '#94A3B8' : '#64748B',
    crosshair: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.4)',
    crosshairLabel: isDark ? '#0F172A' : '#1E293B',
  }), [isDark]);

  const processDataWithBreaks = useCallback((rawData: PricePoint[]) => {
    if (!rawData.length) return { yesData: [], noData: [] };

    const sortedData = [...rawData].sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      return (a.txHash || '').localeCompare(b.txHash || '');
    });

    const dedupedData: PricePoint[] = [];
    const timestampMap = new Map<number, PricePoint>();
    for (const point of sortedData) timestampMap.set(point.timestamp, point);
    dedupedData.push(...Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp));

    const sortedDataFinal = dedupedData;
    const yesData: (LineData | { time: Time; value: undefined })[] = [];
    const noData: (LineData | { time: Time; value: undefined })[] = [];

    const firstPoint = sortedDataFinal[0];
    yesData.push({ time: firstPoint.timestamp as Time, value: firstPoint.priceYes });
    noData.push({ time: firstPoint.timestamp as Time, value: firstPoint.priceNo });

    for (let i = 1; i < sortedDataFinal.length; i++) {
      const current = sortedDataFinal[i];
      const previous = sortedDataFinal[i - 1];
      let currentTimestamp = current.timestamp;
      if (currentTimestamp <= previous.timestamp) currentTimestamp = previous.timestamp + 1;

      const timeGap = currentTimestamp - previous.timestamp;
      const isSeedPoint = previous.txHash === 'seed';

      if (timeGap > 120 && !isSeedPoint) {
        const breakTime = previous.timestamp + 30;
        yesData.push({ time: breakTime as Time, value: undefined as any });
        noData.push({ time: breakTime as Time, value: undefined as any });

        const breakTime2 = currentTimestamp - 30;
        yesData.push({ time: breakTime2 as Time, value: undefined as any });
        noData.push({ time: breakTime2 as Time, value: undefined as any });
      }

      yesData.push({ time: currentTimestamp as Time, value: current.priceYes });
      noData.push({ time: currentTimestamp as Time, value: current.priceNo });
    }

    return { yesData, noData };
  }, []);

  const processedData = useMemo(() => processDataWithBreaks(data), [data, processDataWithBreaks]);

  useEffect(() => {
    let disposed = false;

    const setupChart = async () => {
      if (!containerRef.current || disposed) return;

      try {
        setChartError(null);
        if (!moduleRef.current) {
          const mod = await import('lightweight-charts');
          moduleRef.current = ((mod as unknown as { default?: unknown }).default ?? mod) as typeof import('lightweight-charts');
        }

        const { createChart, ColorType, CrosshairMode, LineStyle, BaselineSeries, LineType } = moduleRef.current;

        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth || 600,
          height,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: colors.text,
            fontSize: 11,
            fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          grid: {
            vertLines: { visible: false },
            horzLines: {
              color: colors.grid,
              style: LineStyle.Solid,
              visible: true,
            },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              width: 1,
              color: colors.crosshair,
              style: LineStyle.Dashed,
              labelBackgroundColor: colors.crosshairLabel,
            },
            horzLine: {
              width: 1,
              color: colors.crosshair,
              style: LineStyle.Dashed,
              labelBackgroundColor: colors.crosshairLabel,
            },
          },
          rightPriceScale: {
            borderColor: 'transparent',
            scaleMargins: { top: 0.1, bottom: 0.1 },
            borderVisible: false,
            entireTextOnly: true,
            ticksVisible: false,
          },
          timeScale: {
            borderColor: 'transparent',
            timeVisible: true,
            secondsVisible: false,
            borderVisible: false,
            fixLeftEdge: true,
            fixRightEdge: true,
            minBarSpacing: 8,
          },
          localization: {
            locale: 'en-US',
            priceFormatter: (price: number) => `${Math.round(price * 100)}%`,
            timeFormatter: (timestamp: number) => {
              return new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            },
          },
          handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
          handleScale: { axisPressedMouseMove: true, mouseWheel: false, pinch: true },
        });

        // Single BaselineSeries with 50% baseline
        const mainSeries = chart.addSeries(BaselineSeries, {
          baseValue: { type: 'price', price: 0.5 },
          topLineColor: 'rgba(16, 185, 129, 1)', // emerald-500
          topFillColor1: 'rgba(16, 185, 129, 0.4)',
          topFillColor2: 'rgba(16, 185, 129, 0.05)',
          bottomLineColor: 'rgba(244, 63, 94, 1)', // rose-500
          bottomFillColor1: 'rgba(244, 63, 94, 0.05)',
          bottomFillColor2: 'rgba(244, 63, 94, 0.4)',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 6,
        });

        // Add 50% reference line
        mainSeries.createPriceLine({
          price: 0.5,
          color: 'rgba(156, 163, 175, 0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '',
        });

        chartRef.current = chart;
        yesSeriesRef.current = mainSeries as any;
        noSeriesRef.current = mainSeries as any; // Share same series (No is 1 - Yes)
        setIsChartReady(true);

        if (data.length > 0) {
          const { yesData } = processDataWithBreaks(data);
          mainSeries.setData(yesData as any);
          setTimeout(() => {
            if (!disposed && chartRef.current) {
              chartRef.current.timeScale().fitContent();
            }
          }, 100);
        }

        const observer = new ResizeObserver(entries => {
          if (throttledResizeRef.current) return;
          throttledResizeRef.current = setTimeout(() => {
            if (entries[0]?.target === containerRef.current && chartRef.current) {
              const newWidth = entries[0].contentRect.width;
              chartRef.current.applyOptions({ width: newWidth });
            }
            throttledResizeRef.current = null;
          }, 100);
        });
        observer.observe(containerRef.current);
        resizeObserverRef.current = observer;

      } catch (error) {
        console.error('[PriceChart] Failed to setup chart:', error);
        if (!disposed) setChartError('Failed to initialize chart');
      }
    };

    void setupChart();

    return () => {
      disposed = true;
      if (throttledResizeRef.current) clearTimeout(throttledResizeRef.current);
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, isDark, colors, processDataWithBreaks]);

  const updateChartData = useCallback(() => {
    if (!yesSeriesRef.current) return;
    const { yesData } = processedData;
    yesSeriesRef.current.setData(yesData);
    setTimeout(() => { chartRef.current?.timeScale().fitContent(); }, 50);
  }, [processedData]);

  // No per-side styling needed anymore since we use a single BaselineSeries

  useEffect(() => {
    if (data.length > 0 && isChartReady) updateChartData();
  }, [data, updateChartData, isChartReady]);

  if (chartError) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8" role="alert" aria-live="polite">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-600 dark:text-red-400 font-bold text-sm mb-1">Unable to load chart</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full"
      style={{ minHeight: height }}
      data-testid="price-chart"
      role="img"
      aria-label={`Price chart showing ${selectedSide === 'yes' ? 'YES' : 'NO'} outcome price over time`}
    >
      {/* Chart Container */}
      <div ref={containerRef} className="w-full h-full" aria-hidden={showLoadingOverlay} />

      {/* Loading Overlay */}
      <AnimatePresence>
        {showLoadingOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-gray-50/95 via-white/90 to-gray-50/95 dark:from-gray-900/95 dark:via-gray-800/90 dark:to-gray-900/95 backdrop-blur-sm rounded-2xl z-10 overflow-hidden"
            role="status"
            aria-live="polite"
            aria-label="Loading chart data"
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl animate-pulse animation-delay-500" />
            </div>

            {/* Skeleton Chart */}
            <div className="relative w-full h-full p-6 flex flex-col">
              {/* Y-axis skeleton */}
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-8">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 0.5, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="w-8 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Wave Animation */}
              <div className="flex-1 flex items-end px-4">
                <svg className="w-full h-32" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <motion.path
                    d="M0,50 Q50,20 100,50 T200,50 T300,50 T400,50"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.3 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#F43F5E" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* X-axis skeleton */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0.5, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="w-10 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Loading Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-2xl shadow-black/10 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-4">
                  {/* Animated Loader */}
                  <div className="relative w-10 h-10">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-1 border-2 border-rose-500/30 border-b-rose-500 rounded-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Loading Chart</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fetching market data...</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});