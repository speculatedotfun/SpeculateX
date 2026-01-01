'use client';

import { useMemo } from 'react';
import { formatPrice as formatPriceUtil } from '@/lib/format';
import { spotPriceYesE18, SCALE } from '@/lib/lmsrMath';
import { motion } from 'framer-motion';

interface LmsrPriceDepthProps {
    qYes: bigint;
    qNo: bigint;
    b: bigint;
    currentPrice: number;
}

export function LmsrPriceDepth({ qYes, qNo, b, currentPrice }: LmsrPriceDepthProps) {
    // Generate Price Curve Data client-side
    // We want to show how "Price of Yes" changes as we:
    // 1. Buy Yes (Right side, Green) -> qYes increases
    // 2. Buy No (Left side, Red) -> qNo increases, which means Yes Price decreases

    const { dataPoints, maxBuyYes, maxBuyNo } = useMemo(() => {
        if (b === 0n) return { dataPoints: [], maxBuyYes: 0, maxBuyNo: 0 };

        const points = [];
        // We'll simulate buying up to 20% of 'b' worth of shares to show depth
        // Or just a fixed number of steps
        const steps = 40;
        const range = b / 2n; // Show impactful range
        const stepSize = range / BigInt(steps);

        // Negative range (Buying NO / Selling YES)
        // When buying No, qNo increases.
        // priceYes = e^(qYes/b) / (e^(qYes/b) + e^(qNo/b))
        // As qNo increases, priceYes decreases.
        for (let i = steps; i > 0; i--) {
            const delta = stepSize * BigInt(i);
            const newQNo = qNo + delta;
            const priceYesBig = spotPriceYesE18(qYes, newQNo, b);
            const priceYes = Number(priceYesBig) / Number(SCALE);

            points.push({
                x: -Number(delta) / 1e18, // Convert to logical units for chart
                y: priceYes,
                type: 'no'
            });
        }

        // Current Point
        const currentPriceE18 = spotPriceYesE18(qYes, qNo, b);
        points.push({
            x: 0,
            y: Number(currentPriceE18) / Number(SCALE),
            type: 'current'
        });

        // Positive range (Buying YES)
        for (let i = 1; i <= steps; i++) {
            const delta = stepSize * BigInt(i);
            const newQYes = qYes + delta;
            const priceYesBig = spotPriceYesE18(newQYes, qNo, b);
            const priceYes = Number(priceYesBig) / Number(SCALE);

            points.push({
                x: Number(delta) / 1e18,
                y: priceYes,
                type: 'yes'
            });
        }

        const maxBuyYes = Number(range) / 1e18;
        const maxBuyNo = -Number(range) / 1e18;

        return { dataPoints: points, maxBuyYes, maxBuyNo };
    }, [qYes, qNo, b]);

    // SVG Path Generation
    // Scale X: fit min/max range to width
    // Scale Y: fit 0-1 (or tighter bounds) to height
    const width = 400;
    const height = 200;
    const padding = 20;

    // Find min/max price for Y scaling to make curve look significant
    const allY = dataPoints.map(p => p.y);
    const minY = Math.min(...allY) * 0.95;
    const maxY = Math.max(...allY) * 1.05;
    const yRange = maxY - minY || 1;

    // Find min/max X
    const allX = dataPoints.map(p => p.x);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const xRange = maxX - minX || 1;

    const pointsSvg = dataPoints.map(p => {
        const px = padding + ((p.x - minX) / xRange) * (width - 2 * padding);
        const py = height - padding - ((p.y - minY) / yRange) * (height - 2 * padding);
        return { ...p, px, py };
    });

    // Split into two paths: Red (left) and Green (right)
    const midPoint = pointsSvg.find(p => p.type === 'current');
    const midX = midPoint?.px ?? width / 2;
    const midY = midPoint?.py ?? height / 2;

    const pathLeft = pointsSvg.filter(p => p.type !== 'yes').map((p, i) =>
        (i === 0 ? `M ${p.px},${p.py}` : `L ${p.px},${p.py}`)
    ).join(' ') + ` L ${midX},${midY}`;

    const pathRight = `M ${midX},${midY} ` + pointsSvg.filter(p => p.type === 'yes').map(p =>
        `L ${p.px},${p.py}`
    ).join(' ');

    // Area under curve
    const areaLeft = `${pathLeft} L ${midX},${height} L ${pointsSvg[0].px},${height} Z`;
    const areaRight = `${pathRight} L ${pointsSvg[pointsSvg.length - 1].px},${height} L ${midX},${height} Z`;

    return (
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden flex flex-col h-full min-h-[400px]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Market Depth (LMSR)</h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-mono">
                    b: {(Number(b) / 1e18).toFixed(2)}
                </span>
            </div>

            <div className="flex-1 relative flex items-center justify-center p-4">
                <div className="relative w-full h-full">
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                        {/* Grids */}
                        <line x1={midX} y1={0} x2={midX} y2={height} stroke="currentColor" strokeDasharray="4 4" className="text-gray-300 dark:text-gray-700 opacity-50" />
                        <line x1={0} y1={midY} x2={width} y2={midY} stroke="currentColor" strokeDasharray="4 4" className="text-gray-300 dark:text-gray-700 opacity-50" />

                        {/* Areas (Gradient Fills) */}
                        <defs>
                            <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.05" />
                            </linearGradient>
                            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
                            </linearGradient>
                        </defs>
                        <path d={areaLeft} fill="url(#gradRed)" />
                        <path d={areaRight} fill="url(#gradGreen)" />

                        {/* Curve Lines */}
                        <path d={pathLeft} fill="none" strokeWidth="3" className="stroke-red-500" strokeLinecap="round" />
                        <path d={pathRight} fill="none" strokeWidth="3" className="stroke-green-500" strokeLinecap="round" />

                        {/* Center Point */}
                        <circle cx={midX} cy={midY} r="6" className="fill-white dark:fill-gray-900 stroke-gray-900 dark:stroke-white stroke-2" />
                    </svg>

                    {/* Labels */}
                    <div className="absolute top-2 left-2 text-xs font-bold text-red-500">
                        Buy NO
                        <div className="text-[10px] text-gray-400 font-medium">Price Drops</div>
                    </div>
                    <div className="absolute top-2 right-2 text-xs font-bold text-green-500 text-right">
                        Buy YES
                        <div className="text-[10px] text-gray-400 font-medium">Price Rises</div>
                    </div>

                    {/* X-Axis Label */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/80 dark:bg-gray-900/80 px-2 rounded-full backdrop-blur-sm">
                        Trade Size (Shares)
                    </div>

                    {/* Hover Tooltip (Simplified fixed) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl">
                        Current: {currentPrice.toFixed(3)}
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-[10px] text-center text-gray-400">
                Visualize how buying shares impacts the bonding curve price.
            </div>
        </div>
    );
}
