import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { readContracts } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { useAddresses, getCurrentNetwork, getChainId } from '@/lib/contracts';
import { getCoreAbi } from '@/lib/abis';
import { formatUnits } from 'viem';
import type { MarketCardData } from '@/components/market/MarketCard';

// Helper for chunking
function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

export function useMarketsListOptimized() {
    const addresses = useAddresses();
    const network = getCurrentNetwork();
    const chainId = getChainId();
    const coreAbi = getCoreAbi(network);
    
    return useQuery({
        // Include core address in queryKey so cache is invalidated when network changes
        queryKey: ['marketsListOptimized', addresses.core],
        queryFn: async () => {
            // 1. Fetch Subgraph Data (List of markets + Sparkline history)
            // fetching more than needed to allow for client-side filtering
            const graphData = await fetchSubgraph<{
                markets: Array<{
                    id: string;
                    question: string;
                    trades: Array<{ priceE6: string; timestamp: string }>;
                }>;
            }>(
                `
        query MarketsList {
          markets(first: 100, orderBy: id, orderDirection: desc) {
            id
            question
            trades(orderBy: timestamp, orderDirection: desc, first: 20) {
              priceE6
              timestamp
            }
          }
        }
        `
            );

            const marketsRaw = graphData.markets || [];
            const marketIds = marketsRaw.map(m => Number(m.id));

            if (marketIds.length === 0) return [];

            // 2. Multicall for Live Data (State, Resolution, Metadata if needed)
            // We need: getMarket (for question if missing, etc), getMarketResolution, getMarketState
            // Actually subgraph has question, but let's confirm metadata from chain if we want "source of truth" or just trust subgraph for strings.
            // Optimizing: Use subgraph for Strings (Question), Chain for Status/Price/Config

            const chunks = chunkArray(marketIds, 10); // Batch of 10 markets = ~30 calls
            const marketDataMap = new Map<number, { state: any; resolution: any; metadata: any }>();

            for (const chunk of chunks) {
                const calls = chunk.flatMap(id => [
                    { address: addresses.core, abi: coreAbi, functionName: 'getMarketState', args: [BigInt(id)] },
                    { address: addresses.core, abi: coreAbi, functionName: 'getMarketResolution', args: [BigInt(id)] },
                    { address: addresses.core, abi: coreAbi, functionName: 'markets', args: [BigInt(id)] }, // Metadata like vault address, etc.
                    { address: addresses.core, abi: coreAbi, functionName: 'spotPriceYesE6', args: [BigInt(id)] } // Explicit price fetch for Diamond contracts
                ]);

                const results = await readContracts(config, {
                    contracts: calls.map(call => ({ ...call, chainId })),
                    allowFailure: true
                });

                chunk.forEach((id, index) => {
                    const stateRes = results[index * 4];
                    const resolutionRes = results[index * 4 + 1];
                    const metaRes = results[index * 4 + 2];
                    const priceRes = results[index * 4 + 3];

                    if (stateRes.status === 'success' && resolutionRes.status === 'success' && metaRes.status === 'success') {
                        marketDataMap.set(id, {
                            state: stateRes.result,
                            resolution: resolutionRes.result,
                            metadata: metaRes.result,
                            priceE6: priceRes.status === 'success' ? priceRes.result : undefined
                        });
                    }
                });
            }

            // 3. Merge and Format
            const formattedMarkets: MarketCardData[] = [];
            const now = Math.floor(Date.now() / 1000);

            // We iterate over the subgraph list to preserve order (newest first)
            for (const mRaw of marketsRaw) {
                const id = Number(mRaw.id);
                const chainData = marketDataMap.get(id);
                if (!chainData) continue; // Skip if chain fetch failed

                const { state, resolution, metadata, priceE6 } = chainData;

                // Parse Chain Data
                // state: tuple(active, resolutionTime, resolved, paused, pYesE6, uniqueTraders, vault, volume) ... depends on struct
                // Actually getMarketState usually returns a struct or tuple. 
                // Based on previous files, we accessed properties or array indices. 
                // Let's assume standard object access if wagmi ABI parsing works, or use safe access.

                // Resolution timestamps
                const expiryTimestamp = resolution.expiryTimestamp ? BigInt(resolution.expiryTimestamp) : 0n;
                const startTime = resolution.startTime ? BigInt(resolution.startTime) : 0n;

                // Status Logic
                const isExpired = expiryTimestamp > 0n && Number(expiryTimestamp) < now;
                const isScheduled = startTime > 0n && Number(startTime) > now;
                const isResolved = resolution.isResolved;
                const isCancelled = state.status === 2; // Assuming status enum in state or separate? 
                // Actually in previous code: `marketStatusNum = state?.status ...`

                let status: 'LIVE TRADING' | 'SCHEDULED' | 'EXPIRED' | 'RESOLVED' | 'CANCELLED' = 'LIVE TRADING';

                // Check Metadata status
                // metadata might have status too?
                // Let 'metadata' be the result of 'markets(id)'
                const metaStatus = (metadata as any).status;

                if (metaStatus === 2) status = 'CANCELLED';
                else if (isResolved) status = 'RESOLVED';
                else if (isScheduled) status = 'SCHEDULED';
                else if (isExpired) status = 'EXPIRED';

                // Price Logic
                // Use explicit priceE6 from separate call first (for Diamond contracts)
                // Fallback to state parsing for legacy contracts
                let pYesE6 = 500000n; // default 0.5

                if (priceE6 !== undefined) {
                    pYesE6 = BigInt(priceE6 as any);
                } else if ((state as any).pYes !== undefined) {
                    pYesE6 = (state as any).pYes;
                } else if (Array.isArray(state) && state[4] !== undefined) {
                    // CAUTION: In Diamond ABI, index 4 is status. 
                    // But we only fallback here if priceE6 failed, implying non-diamond or error?
                    // Safer to default to 50/50 if explicit price call failed and we can't confirm state shape
                    // But for legacy checks:
                    if (state.length < 6) { // Heuristic: Legacy usually has 5 items
                        pYesE6 = state[4];
                    }
                }

                // formatted price
                let yesPrice = Number(pYesE6) / 1e6;
                let noPrice = 1 - yesPrice;

                // Force resolved prices
                if (isResolved) {
                    if (resolution.yesWins) { yesPrice = 1; noPrice = 0; }
                    else { yesPrice = 0; noPrice = 1; }
                }

                // Vault / Volume / Liquidity
                // Use metadata (markets struct) for reliable vault value
                // struct: yes, no, qYes, qNo, bE18, usdcVault ...
                const metaVault = (metadata as any).usdcVault;
                const metaVaultArr = Array.isArray(metadata) ? metadata[5] : undefined;
                const vaultVal = typeof metaVault === 'bigint' ? metaVault : (typeof metaVaultArr === 'bigint' ? metaVaultArr : 0n);

                const totalPairs = Number(formatUnits(vaultVal, 6));

                // History for Sparkline
                // trades from subgraph are { priceE6 }
                const priceHistory = mRaw.trades
                    .map(t => Number(t.priceE6) / 1e6)
                    .reverse();

                // Percentages
                const yesPercent = Math.round(yesPrice * 100);
                const noPercent = 100 - yesPercent;

                formattedMarkets.push({
                    id,
                    question: mRaw.question || (metadata as any).question || `Market #${id}`,
                    yesPrice,
                    noPrice,
                    volume: totalPairs, // using vault as volume proxy or liquidity proxy as before
                    yesPercent,
                    noPercent,
                    status,
                    totalPairsUSDC: vaultVal,
                    expiryTimestamp,
                    startTime,
                    oracleType: resolution.oracleType || 0,
                    isResolved,
                    yesWins: resolution.yesWins,
                    isCancelled,
                    priceHistory
                });
            }

            return formattedMarkets;
        },
        refetchInterval: 15000, // Frequent updates for markets
    });
}
