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

interface PriceChartProps {
  data: PricePoint[];
  selectedSide: 'yes' | 'no';
  height?: number;
  marketId?: number;
  useCentralizedData?: boolean;
}

export const PriceChart = memo(function PriceChart({ data, selectedSide, height = 340, marketId, useCentralizedData = false }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const yesSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const noSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const throttledResizeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moduleRef = useRef<typeof import('lightweight-charts') | null>(null);
  const hasData = Array.isArray(data) && data.length > 0;
  // Relax the loading condition: if we have ANY data (even just seed/sync points), show the chart
  // This prevents the "Loading..." spinner from persisting when we have valid sync points
  const showLoadingOverlay = !hasData;
  const [chartError, setChartError] = useState<string | null>(null);

  // Process data with visual breaks for gaps
  const processDataWithBreaks = useCallback((rawData: PricePoint[]): { yesData: LineData[], noData: LineData[] } => {
    if (!rawData.length) return { yesData: [], noData: [] };

    // Sort by timestamp, then deduplicate by timestamp (keep last occurrence)
    const sortedData = [...rawData].sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      // If timestamps are equal, sort by txHash to ensure consistent ordering
      return (a.txHash || '').localeCompare(b.txHash || '');
    });
    
    // Deduplicate: keep only the last point for each timestamp
    const dedupedData: PricePoint[] = [];
    const timestampMap = new Map<number, PricePoint>();
    for (const point of sortedData) {
      timestampMap.set(point.timestamp, point);
    }
    // Convert back to array, sorted by timestamp
    dedupedData.push(...Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp));
    
    const sortedDataFinal = dedupedData;

    const yesData: LineData[] = [];
    const noData: LineData[] = [];

    // Always add first point
    const firstPoint = sortedDataFinal[0];
    yesData.push({ time: firstPoint.timestamp as Time, value: firstPoint.priceYes });
    noData.push({ time: firstPoint.timestamp as Time, value: firstPoint.priceNo });

    // Process remaining points with gap detection
    for (let i = 1; i < sortedDataFinal.length; i++) {
      const current = sortedDataFinal[i];
      const previous = sortedDataFinal[i - 1];

      // Ensure timestamp is strictly greater than previous (fix any remaining duplicates)
      let currentTimestamp = current.timestamp;
      if (currentTimestamp <= previous.timestamp) {
        currentTimestamp = previous.timestamp + 1;
        console.warn('[PriceChart] Fixed duplicate timestamp:', { 
          original: current.timestamp, 
          fixed: currentTimestamp,
          previous: previous.timestamp 
        });
      }

      // Check for time gaps (> 2 minutes = significant break)
      // Skip gap if previous point was 'seed' (always connect seed to first point)
      const timeGap = currentTimestamp - previous.timestamp;
      const isSeedPoint = previous.txHash === 'seed';
      
      if (timeGap > 120 && !isSeedPoint) { // 2 minutes gap, unless connecting from seed
        // Add break points (undefined creates visual gap)
        const breakTime = previous.timestamp + 30; // 30 seconds after last point
        yesData.push({ time: breakTime as Time, value: undefined as any });
        noData.push({ time: breakTime as Time, value: undefined as any });

        // Add another break point to ensure clear separation
        const breakTime2 = currentTimestamp - 30; // 30 seconds before new point
        yesData.push({ time: breakTime2 as Time, value: undefined as any });
        noData.push({ time: breakTime2 as Time, value: undefined as any });
      }

      // Add current data point with ensured unique timestamp
      yesData.push({ time: currentTimestamp as Time, value: current.priceYes });
      noData.push({ time: currentTimestamp as Time, value: current.priceNo });
    }

    return { yesData, noData };
  }, []);

  // Memoize processed data to prevent expensive recalculations
  const processedData = useMemo(() => {
    return processDataWithBreaks(data);
  }, [data, processDataWithBreaks]);

  // Setup chart and series (runs once)
  useEffect(() => {
    let disposed = false;

    const setupChart = async () => {
      if (!containerRef.current || disposed) return;

      try {
        setChartError(null);
        // Load lightweight-charts
        if (!moduleRef.current) {
          const mod = await import('lightweight-charts');
          moduleRef.current = ((mod as unknown as { default?: unknown }).default ??
            mod) as typeof import('lightweight-charts');
        }

        const { createChart, ColorType, CrosshairMode, LineStyle, LineSeries, LineType } = moduleRef.current;

        // Create chart with professional styling
        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height,
          layout: {
            background: { type: ColorType.Solid, color: '#ffffff' },
            textColor: '#64748b',
            fontSize: 12,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          },
          grid: {
            vertLines: { color: '#f1f5f9', style: LineStyle.Solid, visible: true },
            horzLines: { color: '#f1f5f9', style: LineStyle.Solid, visible: true },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              width: 1,
              color: '#64748b',
              style: LineStyle.Dashed,
              labelBackgroundColor: '#ffffff'
            },
            horzLine: {
              width: 1,
              color: '#64748b',
              style: LineStyle.Dashed,
              labelBackgroundColor: '#ffffff'
            },
          },
          rightPriceScale: {
            borderColor: '#e2e8f0',
            scaleMargins: { top: 0.1, bottom: 0.1 },
            borderVisible: false,
            entireTextOnly: true,
            ticksVisible: true,
          },
          timeScale: {
            borderColor: '#e2e8f0',
            timeVisible: true,
            secondsVisible: false,
            borderVisible: false,
            fixLeftEdge: true,
            fixRightEdge: true,
          },
          localization: {
            priceFormatter: (price: number) => `${(price * 100).toFixed(2)}¢`,
            timeFormatter: (timestamp: number) => {
              return new Date(timestamp * 1000).toLocaleString();
            },
          },
          watermark: {
            visible: false,
          },
          handleScroll: { mouseWheel: true, pressedMouseMove: true },
          handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
        });

        // Create professional line series with enhanced styling
        const yesLineWidth = selectedSide === 'yes' ? 3 : 2;
        const noLineWidth = selectedSide === 'no' ? 3 : 2;

        const yesSeries = chart.addSeries(LineSeries, {
          lineWidth: yesLineWidth,
          lineType: LineType.Curved,
          pointMarkersVisible: false,
          priceLineVisible: true,
          priceLineWidth: 1,
          priceLineColor: '#22c55e',
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerBorderColor: '#ffffff',
          crosshairMarkerBackgroundColor: '#22c55e',
          crosshairMarkerRadius: 4,
          color: '#22c55e',
        } as any);

        const noSeries = chart.addSeries(LineSeries, {
          lineWidth: noLineWidth,
          lineType: LineType.Curved,
          pointMarkersVisible: false,
          priceLineVisible: true,
          priceLineWidth: 1,
          priceLineColor: '#ef4444',
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerBorderColor: '#ffffff',
          crosshairMarkerBackgroundColor: '#ef4444',
          crosshairMarkerRadius: 4,
          color: '#ef4444',
        } as any);

        // Store references
        chartRef.current = chart;
        yesSeriesRef.current = yesSeries;
        noSeriesRef.current = noSeries;

        // Setup resize observer with throttling
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
        if (!disposed) {
          setChartError('Failed to initialize chart');
        }
      }
    };

    void setupChart();

    return () => {
      disposed = true;
      if (throttledResizeRef.current) {
        clearTimeout(throttledResizeRef.current);
        throttledResizeRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
      yesSeriesRef.current = null;
      noSeriesRef.current = null;
    };
  }, []); // Empty dependency array - setup runs once

  // Update chart height when prop changes
  useEffect(() => {
    if (chartRef.current && height > 0) {
      chartRef.current.applyOptions({ height });
    }
  }, [height]);

  const updateChartData = useCallback((chartData: PricePoint[]) => {
    if (!yesSeriesRef.current || !noSeriesRef.current) return;

    const { yesData, noData } = processedData;

    // Update data with smooth transition
    yesSeriesRef.current.setData(yesData);
    noSeriesRef.current.setData(noData);

    // Smooth fit content after a brief delay to allow visual updates
    setTimeout(() => {
      chartRef.current?.timeScale().fitContent();
    }, 50);
  }, [processedData]);

  // Update chart data with visual breaks
  const updateSeriesStyling = useCallback(() => {
    if (!yesSeriesRef.current || !noSeriesRef.current) return;

    const yesLineWidth = selectedSide === 'yes' ? 3 : 2;
    const noLineWidth = selectedSide === 'no' ? 3 : 2;

    try {
      const lineType = moduleRef.current?.LineType?.Curved;

      const yesOptions: any = {
        lineWidth: yesLineWidth,
        priceLineWidth: 1,
        priceLineColor: '#22c55e',
        color: '#22c55e',
        pointMarkersVisible: false,
      };

      const noOptions: any = {
        lineWidth: noLineWidth,
        priceLineWidth: 1,
        priceLineColor: '#ef4444',
        color: '#ef4444',
        pointMarkersVisible: false,
      };

      if (lineType !== undefined) {
        yesOptions.lineType = lineType;
        noOptions.lineType = lineType;
      }

      yesSeriesRef.current.applyOptions({
        ...yesOptions,
      });

      noSeriesRef.current.applyOptions({
        ...noOptions,
      });

    } catch (error) {
      console.warn('[PriceChart] Failed to apply styling:', error);
    }
  }, [selectedSide]);

  // Update data when data prop changes
  useEffect(() => {
    if (data.length > 0) {
      updateChartData(data);
    }
  }, [data, updateChartData]);

  // Update styling when selectedSide changes (separate from data updates)
  useEffect(() => {
    updateSeriesStyling();
  }, [selectedSide, updateSeriesStyling]);

  // Error fallback UI
  if (chartError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-50 rounded-xl">
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">Chart Error</div>
          <div className="text-sm text-gray-500">{chartError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: height }} data-testid="price-chart">
      <div ref={containerRef} className="w-full h-full" />
      {showLoadingOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
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
