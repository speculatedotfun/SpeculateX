import { useState, useEffect, useMemo } from 'react';

// Maps common names/tickers to Binance symbols
const SYMBOL_MAP: Record<string, string> = {
    'btc': 'BTCUSDT',
    'bitcoin': 'BTCUSDT',
    'eth': 'ETHUSDT',
    'ethereum': 'ETHUSDT',
    'sol': 'SOLUSDT',
    'solana': 'SOLUSDT',
    'bnb': 'BNBUSDT',
    'binance coin': 'BNBUSDT',
    'xrp': 'XRPUSDT',
    'ripple': 'XRPUSDT',
    'doge': 'DOGEUSDT',
    'dogecoin': 'DOGEUSDT',
    'ada': 'ADAUSDT',
    'cardano': 'ADAUSDT',
    'avax': 'AVAXUSDT',
    'avalanche': 'AVAXUSDT',
    'dot': 'DOTUSDT',
    'polkadot': 'DOTUSDT',
    'link': 'LINKUSDT',
    'chainlink': 'LINKUSDT',
    'matic': 'MATICUSDT',
    'polygon': 'MATICUSDT',
};

export interface CryptoPricePoint {
    time: number;
    value: number;
}

export type CryptoTimeRange = '1D' | '1W' | '1M' | 'ALL';

export function detectCryptoSymbol(marketQuestion: string): { symbol: string | null; baseToken: string | null } {
    if (!marketQuestion) return { symbol: null, baseToken: null };

    const lowerQuestion = marketQuestion.toLowerCase();

    for (const [key, binanceSymbol] of Object.entries(SYMBOL_MAP)) {
        const regex = new RegExp(`\\b${key}\\b`, 'i');
        if (regex.test(lowerQuestion)) {
            return { symbol: binanceSymbol, baseToken: key.toUpperCase() };
        }
    }

    return { symbol: null, baseToken: null };
}

export function useCryptoPrice(marketQuestion: string, timeRange: CryptoTimeRange = '1W') {
    const [data, setData] = useState<CryptoPricePoint[]>([]);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Detect symbol from question - synchronous to prevent flash of null
    const { symbol, baseToken } = useMemo(() => {
        return detectCryptoSymbol(marketQuestion);
    }, [marketQuestion]);

    // Fetch initial data (refetches when time range changes)
    useEffect(() => {
        if (!symbol) return;

        let disposed = false;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch 24h ticker for change stats
                const tickerRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
                const tickerData = await tickerRes.json();

                if (disposed) return;

                if (tickerData.lastPrice) {
                    setCurrentPrice(parseFloat(tickerData.lastPrice));
                    setPriceChange24h(parseFloat(tickerData.priceChangePercent));
                }

                // Fetch klines (candles) for chart history (tuned by time range)
                // Note: Binance max `limit` is 1000.
                const range = timeRange ?? '1W';
                const klineParams =
                    range === '1D'
                        ? { interval: '5m', limit: 288 }   // 24h
                        : range === '1W'
                          ? { interval: '1h', limit: 168 }  // 7d
                          : range === '1M'
                            ? { interval: '4h', limit: 180 } // ~30d
                            : { interval: '1d', limit: 365 }; // ~1y "ALL"

                const klinesRes = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${klineParams.interval}&limit=${klineParams.limit}`
                );
                const klinesData = await klinesRes.json();

                if (disposed) return;

                if (Array.isArray(klinesData)) {
                    const formattedData = klinesData.map((k: any) => ({
                        time: k[0] / 1000, // API returns ms, chart wants seconds
                        value: parseFloat(k[4]), // Close price
                    }));
                    if (formattedData.length > 0) {
                        setData(formattedData);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch crypto price:', e);
            } finally {
                if (!disposed) setIsLoading(false);
            }
        };

        fetchData();

        return () => {
            disposed = true;
        };
    }, [symbol, timeRange]);

    // WebSocket for live updates
    useEffect(() => {
        if (!symbol) return;

        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@miniTicker`);

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.c) { // c is the close price in miniTicker
                    const newPrice = parseFloat(message.c);
                    setCurrentPrice(newPrice);

                    // Live update chart data
                    setData(prev => {
                        const currentTime = Math.floor(Date.now() / 1000);

                        // If no history, start fresh with current point
                        if (prev.length === 0) {
                            return [{ time: currentTime, value: newPrice }];
                        }

                        const last = prev[prev.length - 1];

                        // Don't duplicate if time hasn't advanced enough (basic throttle)
                        if (currentTime > last.time) {
                            return [...prev, { time: currentTime, value: newPrice }];
                        }

                        // Or update the last candle if it's the "current" candle (simplified)
                        return [...prev.slice(0, -1), { time: currentTime, value: newPrice }];
                    });
                }
            } catch (e) {
                // ignore parse errors
            }
        };

        return () => {
            ws.close();
        };
    }, [symbol]);

    return {
        symbol,
        baseToken,
        data,
        currentPrice,
        priceChange24h,
        isLoading
    };
}
