'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle, AreaSeries } from 'lightweight-charts';
import { useCryptoPrice } from '@/lib/hooks/useCryptoPrice';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ExternalLink, Zap } from 'lucide-react';

interface ReferenceChartProps {
    marketQuestion: string;
    variant?: 'card' | 'embedded';
}

export function ReferencePriceChart({ marketQuestion, variant = 'card' }: ReferenceChartProps) {
    const { symbol, baseToken, data, currentPrice, priceChange24h, isLoading } = useCryptoPrice(marketQuestion);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    // Initial Chart Setup
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                const width = chartContainerRef.current.clientWidth;
                if (width > 0) {
                    chartRef.current.chart.applyOptions({ width });
                    chartRef.current.chart.timeScale().fitContent();
                }
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: 'rgba(156, 163, 175, 0.8)',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            },
            width: chartContainerRef.current.clientWidth || 300,
            height: 180,
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.15, bottom: 0.15 },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                vertLine: {
                    color: 'rgba(245, 158, 11, 0.3)',
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: 'rgba(245, 158, 11, 0.9)',
                },
                horzLine: {
                    color: 'rgba(245, 158, 11, 0.3)',
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: 'rgba(245, 158, 11, 0.9)',
                },
            },
            handleScroll: { mouseWheel: false, pressedMouseMove: false },
            handleScale: { mouseWheel: false, pinch: false },
        });

        // Use AreaSeries for a filled gradient look
        const newSeries = chart.addSeries(AreaSeries, {
            lineColor: '#F59E0B',
            lineWidth: 2,
            topColor: 'rgba(245, 158, 11, 0.4)',
            bottomColor: 'rgba(245, 158, 11, 0.0)',
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 6,
            crosshairMarkerBackgroundColor: '#F59E0B',
            crosshairMarkerBorderColor: '#ffffff',
            crosshairMarkerBorderWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        chartRef.current = { chart, series: newSeries };

        const resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, []);

    // Update Data
    useEffect(() => {
        if (chartRef.current && data.length > 0) {
            try {
                const sortedData = [...data].sort((a, b) => a.time - b.time);
                const deduped: typeof sortedData = [];
                let lastTime = -1;
                for (const d of sortedData) {
                    if (d.time > lastTime) {
                        deduped.push(d);
                        lastTime = d.time;
                    }
                }

                chartRef.current.series.setData(deduped);

                requestAnimationFrame(() => {
                    if (chartRef.current?.chart) {
                        chartRef.current.chart.timeScale().fitContent();
                    }
                });
            } catch (e) {
                console.error("Chart data error", e);
            }
        }
    }, [data]);

    if (!symbol) {
        if (variant === 'embedded') {
            return (
                <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/30 p-4 text-sm text-gray-500 dark:text-gray-400">
                    No reference asset detected for this market question.
                </div>
            );
        }
        return null;
    }

    const isPositive = (priceChange24h || 0) >= 0;
    const formattedPrice = currentPrice?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: currentPrice < 1 ? 6 : 2
    });

    if (variant === 'embedded') {
        return (
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/30 p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-2">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                {baseToken} Price
                            </span>
                        </div>

                        <div className="flex items-baseline gap-3 flex-wrap">
                            <div className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                                {currentPrice ? `$${formattedPrice}` : '—'}
                            </div>

                            {priceChange24h !== null && (
                                <div
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs ${isPositive
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                        }`}
                                >
                                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    <span>{isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%</span>
                                    <span className="opacity-60">24h</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <a
                        href={`https://www.binance.com/en/trade/${symbol}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-amber-500/10 transition-colors"
                        aria-label="Open on Binance"
                    >
                        <ExternalLink className="w-5 h-5 text-gray-400 hover:text-amber-500 transition-colors" />
                    </a>
                </div>

                <div className="relative h-[180px] w-full mt-4 rounded-2xl overflow-hidden bg-gradient-to-b from-transparent via-amber-500/5 to-amber-500/10">
                    <div ref={chartContainerRef} className="w-full h-full" />

                    {isLoading && data.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl"
        >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5 dark:from-amber-500/10 dark:via-orange-500/5 dark:to-yellow-500/10" />

            {/* Glass Card */}
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-amber-200/30 dark:border-amber-500/20 p-6 rounded-3xl shadow-xl shadow-amber-500/5">

                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="relative z-10 flex items-start justify-between mb-4">
                    <div className="flex-1">
                        {/* Label Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-3">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                {baseToken} Live Price
                            </span>
                        </div>

                        {/* Price Display */}
                        {currentPrice ? (
                            <div className="flex items-baseline gap-4 flex-wrap">
                                <motion.div
                                    key={formattedPrice}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent"
                                >
                                    ${formattedPrice}
                                </motion.div>

                                {priceChange24h !== null && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm ${isPositive
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                            }`}
                                    >
                                        {isPositive ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4" />
                                        )}
                                        <span>{isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%</span>
                                        <span className="text-xs opacity-60">24h</span>
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-40 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-xl animate-pulse" />
                            </div>
                        )}
                    </div>

                    {/* External Link */}
                    <a
                        href={`https://www.binance.com/en/trade/${symbol}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-3 bg-white/50 dark:bg-gray-800/50 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 rounded-2xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:border-amber-500/30 shadow-sm hover:shadow-amber-500/10"
                    >
                        <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
                    </a>
                </div>

                {/* Chart Area */}
                <div className="relative h-[180px] w-full mt-6 rounded-2xl overflow-hidden bg-gradient-to-b from-transparent via-amber-500/5 to-amber-500/10">
                    <div ref={chartContainerRef} className="w-full h-full" />

                    {/* Loading State */}
                    {isLoading && data.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                    <div className="absolute inset-0 w-10 h-10 border-3 border-transparent border-b-orange-500/50 rounded-full animate-spin animation-delay-150" />
                                </div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading</span>
                            </div>
                        </div>
                    )}

                    {/* Waiting State */}
                    {!isLoading && data.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                <span className="text-xs text-gray-400 font-medium">Connecting to market data...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-between mt-4 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live via Binance</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Reference only · Not financial advice</span>
                </div>
            </div>
        </motion.div>
    );
}
