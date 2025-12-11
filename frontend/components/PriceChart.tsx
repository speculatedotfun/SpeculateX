'use client';

import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import type {
  IChartApi,
  ISeriesApi,
  LineData,
  Time,
} from 'lightweight-charts';
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
  
  const hasData = Array.isArray(data) && data.length > 0;
  const showLoadingOverlay = !hasData;
  const [chartError, setChartError] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Process data with visual breaks for gaps
  const processDataWithBreaks = useCallback((rawData: PricePoint[]) => {
    if (!rawData.length) return { yesData: [], noData: [] };

    // Sort by timestamp, then deduplicate
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

    // Always add first point
    const firstPoint = sortedDataFinal[0];
    yesData.push({ time: firstPoint.timestamp as Time, value: firstPoint.priceYes });
    noData.push({ time: firstPoint.timestamp as Time, value: firstPoint.priceNo });

    // Process remaining points with gap detection
    for (let i = 1; i < sortedDataFinal.length; i++) {
      const current = sortedDataFinal[i];
      const previous = sortedDataFinal[i - 1];

      // Ensure timestamp is strictly greater than previous
      let currentTimestamp = current.timestamp;
      if (currentTimestamp <= previous.timestamp) currentTimestamp = previous.timestamp + 1;

      // Check for time gaps (> 2 minutes = significant break)
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

  // Setup chart
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
          width: containerRef.current.clientWidth,
          height,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' }, // Transparent for better integration
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

  // Update data
  const updateChartData = useCallback(() => {
    if (!yesSeriesRef.current || !noSeriesRef.current) return;
    const { yesData, noData } = processedData;
    yesSeriesRef.current.setData(yesData);
    noSeriesRef.current.setData(noData);
    setTimeout(() => { chartRef.current?.timeScale().fitContent(); }, 50);
  }, [processedData]);

  // Update styling based on selected side
  const updateSeriesStyling = useCallback(() => {
    if (!yesSeriesRef.current || !noSeriesRef.current) return;
    
    try {
      yesSeriesRef.current.applyOptions({
        lineWidth: selectedSide === 'yes' ? 3 : 2,
        topColor: selectedSide === 'yes' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.05)',
        bottomColor: selectedSide === 'yes' ? 'rgba(34, 197, 94, 0.0)' : 'rgba(34, 197, 94, 0.0)',
        lineColor: selectedSide === 'yes' ? '#22c55e' : '#22c55e40', // Fade out inactive line
      } as any);

      noSeriesRef.current.applyOptions({
        lineWidth: selectedSide === 'no' ? 3 : 2,
        topColor: selectedSide === 'no' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.05)',
        bottomColor: selectedSide === 'no' ? 'rgba(239, 68, 68, 0.0)' : 'rgba(239, 68, 68, 0.0)',
        lineColor: selectedSide === 'no' ? '#ef4444' : '#ef444440', // Fade out inactive line
      } as any);
    } catch (e) {
      console.warn('Styling update failed', e);
    }
  }, [selectedSide]);

  useEffect(() => {
    if (data.length > 0) updateChartData();
  }, [data, updateChartData]);

  useEffect(() => {
    updateSeriesStyling();
  }, [selectedSide, updateSeriesStyling]);

  if (chartError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl">
        <div className="text-center p-4 text-red-500 text-sm">Chart Error</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: height }} data-testid="price-chart">
      <div ref={containerRef} className="w-full h-full" />
      {showLoadingOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full"
          />
        </div>
      )}
    </div>
  );
});