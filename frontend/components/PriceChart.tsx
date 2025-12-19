'use client';

import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
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

export const PriceChart = memo(function PriceChart({ data, selectedSide, height = 340 }: PriceChartProps) {
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

        const { createChart, ColorType, CrosshairMode, LineStyle, AreaSeries, LineType } = moduleRef.current;

        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth || 600, // Fallback to a reasonable width if 0
          height,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: isDark ? '#94a3b8' : '#64748b',
            fontSize: 11,
            fontFamily: "'Geist', 'Inter', sans-serif",
          },
          grid: {
            vertLines: { visible: false },
            horzLines: { color: isDark ? '#334155' : '#f1f5f9', style: LineStyle.Solid, visible: true },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              width: 1,
              color: isDark ? '#64748b' : '#94a3b8',
              style: LineStyle.Dashed,
              labelBackgroundColor: isDark ? '#0f172a' : '#1e293b',
            },
            horzLine: {
              width: 1,
              color: isDark ? '#64748b' : '#94a3b8',
              style: LineStyle.Dashed,
              labelBackgroundColor: isDark ? '#0f172a' : '#1e293b',
            },
          },
          rightPriceScale: {
            borderColor: 'transparent',
            scaleMargins: { top: 0.2, bottom: 0.1 },
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
            minBarSpacing: 10,
          },
          localization: {
            priceFormatter: (price: number) => `${(price * 100).toFixed(1)}¢`,
            timeFormatter: (timestamp: number) => {
              return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            },
          },
          handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
          handleScale: { axisPressedMouseMove: true, mouseWheel: false, pinch: true },
        });

        const yesSeries = chart.addSeries(AreaSeries, {
          lineColor: '#22c55e',
          topColor: 'rgba(34, 197, 94, 0.4)',
          bottomColor: 'rgba(34, 197, 94, 0.0)',
          lineWidth: 3,
          lineType: LineType.Curved,
          priceLineVisible: true,
          priceLineWidth: 1,
          priceLineColor: '#22c55e',
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerBorderColor: '#ffffff',
          crosshairMarkerBackgroundColor: '#22c55e',
          crosshairMarkerRadius: 5,
        } as any);

        const noSeries = chart.addSeries(AreaSeries, {
          lineColor: '#ef4444',
          topColor: 'rgba(239, 68, 68, 0.4)',
          bottomColor: 'rgba(239, 68, 68, 0.0)',
          lineWidth: 3,
          lineType: LineType.Curved,
          priceLineVisible: true,
          priceLineWidth: 1,
          priceLineColor: '#ef4444',
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerBorderColor: '#ffffff',
          crosshairMarkerBackgroundColor: '#ef4444',
          crosshairMarkerRadius: 5,
        } as any);

        chartRef.current = chart;
        yesSeriesRef.current = yesSeries as any;
        noSeriesRef.current = noSeries as any;
        setIsChartReady(true);

        // If we already have data, update the chart immediately
        if (data.length > 0) {
          const { yesData, noData } = processDataWithBreaks(data);
          yesSeries.setData(yesData as any);
          noSeries.setData(noData as any);
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
  }, [height, isDark]);

  const updateChartData = useCallback(() => {
    if (!yesSeriesRef.current || !noSeriesRef.current) return;
    const { yesData, noData } = processedData;
    yesSeriesRef.current.setData(yesData);
    noSeriesRef.current.setData(noData);
    setTimeout(() => { chartRef.current?.timeScale().fitContent(); }, 50);
  }, [processedData]);

  const updateSeriesStyling = useCallback(() => {
    if (!yesSeriesRef.current || !noSeriesRef.current) return;
    
    try {
      yesSeriesRef.current.applyOptions({
        lineWidth: selectedSide === 'yes' ? 3 : 2,
        topColor: selectedSide === 'yes' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.05)',
        bottomColor: selectedSide === 'yes' ? 'rgba(34, 197, 94, 0.0)' : 'rgba(34, 197, 94, 0.0)',
        lineColor: selectedSide === 'yes' ? '#22c55e' : '#22c55e40',
      } as any);

      noSeriesRef.current.applyOptions({
        lineWidth: selectedSide === 'no' ? 3 : 2,
        topColor: selectedSide === 'no' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.05)',
        bottomColor: selectedSide === 'no' ? 'rgba(239, 68, 68, 0.0)' : 'rgba(239, 68, 68, 0.0)',
        lineColor: selectedSide === 'no' ? '#ef4444' : '#ef444440',
      } as any);
    } catch (e) {
      console.warn('Styling update failed', e);
    }
  }, [selectedSide]);

  useEffect(() => {
    if (data.length > 0 && isChartReady) updateChartData();
  }, [data, updateChartData, isChartReady]);

  useEffect(() => {
    updateSeriesStyling();
  }, [selectedSide, updateSeriesStyling]);

  if (chartError) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6" role="alert" aria-live="polite">
        <svg className="w-12 h-12 text-red-500 dark:text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold text-sm mb-1">Unable to load chart</p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: height }} data-testid="price-chart" role="img" aria-label={`Price chart showing ${selectedSide === 'yes' ? 'YES' : 'NO'} outcome price over time`}>
      <div ref={containerRef} className="w-full h-full" aria-hidden={showLoadingOverlay} />

      {showLoadingOverlay && (
        <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800 rounded-xl z-10 overflow-hidden" role="status" aria-live="polite" aria-label="Loading chart data">
          {/* Skeleton Loader */}
          <div className="w-full h-full p-4 space-y-3">
            {/* Y-axis labels skeleton */}
            <div className="flex justify-between items-start h-8">
              <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>

            {/* Chart bars skeleton */}
            <div className="flex items-end justify-between h-48 gap-1 sm:gap-2">
              {[...Array(12)].map((_, i) => {
                const heights = [60, 75, 55, 80, 70, 65, 85, 60, 75, 70, 80, 65];
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${heights[i]}%`, opacity: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="flex-1 bg-gradient-to-t from-gray-300 dark:from-gray-600 to-gray-200 dark:to-gray-700 rounded-t"
                    style={{ maxWidth: '40px' }}
                  />
                );
              })}
            </div>

            {/* X-axis labels skeleton */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-12 h-2.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>

            {/* Loading text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-[#14B8A6] border-t-transparent rounded-full"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Loading chart data...</span>
                </div>
              </div>
            </div>
          </div>
          <span className="sr-only">Loading price chart</span>
        </div>
      )}
    </div>
  );
});