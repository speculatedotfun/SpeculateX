'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { formatUnits } from 'viem';
import { useAddresses, getCurrentNetwork, getChainId } from '@/lib/contracts';
import { getCoreAbi } from '@/lib/abis';
import { useMemo, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { readContracts } from 'wagmi/actions';
import { config } from '@/lib/wagmi';

export interface LpPosition {
    marketId: number;
    question: string;
    lpShares: number;
    lpSharesRaw: bigint;
    pendingFees: number;
    pendingFeesRaw: bigint;
    pendingResidual: number;
    pendingResidualRaw: bigint;
    totalClaimable: number;
    userSharePct: number;
    isResolved: boolean;
    claimedFees: number;
    claimedResidual: number;
    totalClaimed: number;
}

interface MarketBasicInfo {
    id: string;
    question: string;
    isResolved: boolean;
}

interface SubgraphResponse {
    markets: MarketBasicInfo[];
}

// Helper to wait for receipt
async function waitForReceipt(publicClient: any, txHash: `0x${string}`) {
    if (!publicClient) return;
    await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
}

// Helper for chunking
function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

export function useLpPositions() {
    const { address, isConnected } = useAccount();
    const addresses = useAddresses();
    const network = getCurrentNetwork();
    const chainId = getChainId();
    const coreAbi = getCoreAbi(network);
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const { pushToast } = useToast();
    const usdcDecimals = addresses?.usdcDecimals ?? 6;

    const [claimingMarketId, setClaimingMarketId] = useState<number | null>(null);

    // Fetch all markets from subgraph, then check LP shares for each
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['lpPositionsV2', address?.toLowerCase(), chainId],
        queryFn: async () => {
            if (!address || !addresses?.core) return { positions: [], totals: { totalLpValue: 0, totalPendingFees: 0, totalPendingResidual: 0, totalClaimedFees: 0, totalClaimedResidual: 0, totalClaimable: 0, positionCount: 0 } };

            // Step 1: Get all markets, claimed amounts, AND liquidity events from subgraph
            const query = `
        query GetAllMarketsAndClaims($user: Bytes!) {
          markets(first: 1000, orderBy: createdAt, orderDirection: desc) {
            id
            question
            isResolved
          }
          lpFeeClaims(where: { user: $user }) {
            market { id }
            amount
            timestamp
          }
          lpResidualClaims(where: { lp: $user }) {
            market { id }
            amount
            timestamp
          }
          liquidityEvents(where: { user: $user }) {
            market { id }
            action
            usdcAmount
          }
        }
      `;

            let allMarkets: MarketBasicInfo[] = [];
            const claimedFeesByMarket: Record<string, bigint> = {};
            const claimedResidualByMarket: Record<string, bigint> = {};

            try {
                const result = await fetchSubgraph<any>(query, { user: address.toLowerCase() });
                allMarkets = result.markets || [];

                // Collect unique market IDs from claims AND liquidity events
                const claimedMarketIds = new Set<string>();
                const liquidityMarketIds = new Set<string>();

                // Aggregate claimed fees
                if (result.lpFeeClaims) {
                    for (const claim of result.lpFeeClaims) {
                        const mId = claim.market.id;
                        const amount = BigInt(claim.amount);
                        claimedFeesByMarket[mId] = (claimedFeesByMarket[mId] || 0n) + amount;
                        claimedMarketIds.add(mId);
                    }
                }

                // Aggregate claimed residual
                if (result.lpResidualClaims) {
                    for (const claim of result.lpResidualClaims) {
                        const mId = claim.market.id;
                        const amount = BigInt(claim.amount);
                        claimedResidualByMarket[mId] = (claimedResidualByMarket[mId] || 0n) + amount;
                        claimedMarketIds.add(mId);
                    }
                }

                // Collect market IDs from liquidity events (where user added/removed liquidity)
                if (result.liquidityEvents) {
                    for (const event of result.liquidityEvents) {
                        liquidityMarketIds.add(event.market.id);
                    }
                }

                // Combine all market IDs that need to be fetched
                const allRelevantMarketIds = new Set([...claimedMarketIds, ...liquidityMarketIds]);
                const existingMarketIds = new Set(allMarkets.map(m => m.id));
                const missingMarketIds = Array.from(allRelevantMarketIds).filter(id => !existingMarketIds.has(id));

                // Fetch markets that have claims or liquidity events but weren't in the first 1000
                if (missingMarketIds.length > 0) {
                    try {
                        const missingMarketsQuery = `
                            query GetMissingMarkets($ids: [ID!]!) {
                                markets(where: { id_in: $ids }) {
                                    id
                                    question
                                    isResolved
                                }
                            }
                        `;
                        const missingMarketsResult = await fetchSubgraph<any>(missingMarketsQuery, { ids: missingMarketIds });
                        if (missingMarketsResult.markets && missingMarketsResult.markets.length > 0) {
                            allMarkets = [...allMarkets, ...missingMarketsResult.markets];
                        }
                    } catch (e) {
                        console.error('[useLpPositions] Failed to fetch missing markets:', e);
                        // Continue with existing markets - better than failing completely
                    }
                }
            } catch (e) {
                console.error('[useLpPositions] Subgraph query failed:', e);
                return {
                    positions: [],
                    totals: {
                        totalLpValue: 0,
                        totalPendingFees: 0,
                        totalPendingResidual: 0,
                        totalClaimedFees: 0,
                        totalClaimedResidual: 0,
                        totalClaimable: 0,
                        positionCount: 0
                    }
                };
            }

            // Step 2: Also check a range of market IDs (1-1000) for LP shares
            // This catches markets that might not be in the first 1000 by createdAt
            // or markets where the user is the creator (no LiquidityEvent emitted)
            const existingMarketIds = new Set(allMarkets.map(m => m.id));
            const marketIdsToCheck: number[] = [];
            
            // Check market IDs 1-1000 for LP shares
            // Skip markets we already have in allMarkets
            for (let i = 1; i <= 1000; i++) {
                if (!existingMarketIds.has(i.toString())) {
                    marketIdsToCheck.push(i);
                }
            }

            // Query lpShares for markets we haven't checked yet
            const additionalLpSharesCalls = marketIdsToCheck.map(marketId => ({
                address: addresses.core as `0x${string}`,
                abi: coreAbi,
                functionName: 'lpShares' as const,
                args: [BigInt(marketId), address],
                chainId,
            }));

            const additionalLpShares: Map<number, bigint> = new Map();
            if (additionalLpSharesCalls.length > 0) {
                const additionalChunks = chunkArray(additionalLpSharesCalls, 50);
                let globalIndex = 0;
                for (const chunk of additionalChunks) {
                    try {
                        const results = await readContracts(config, { contracts: chunk });
                        for (let i = 0; i < results.length; i++) {
                            const res = results[i];
                            const marketId = marketIdsToCheck[globalIndex];
                            globalIndex++;
                            if (res.status === 'success' && res.result) {
                                const shares = BigInt(res.result as any);
                                if (shares > 0n) {
                                    additionalLpShares.set(marketId, shares);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[useLpPositions] Additional lpShares batch failed:', e);
                        // Skip the market IDs that failed
                        globalIndex += chunk.length;
                    }
                }
            }

            // Fetch market details for markets with LP shares that we don't have yet
            if (additionalLpShares.size > 0) {
                const missingMarketIds = Array.from(additionalLpShares.keys()).map(id => id.toString());
                try {
                    const missingMarketsQuery = `
                        query GetMissingMarketsWithLp($ids: [ID!]!) {
                            markets(where: { id_in: $ids }) {
                                id
                                question
                                isResolved
                            }
                        }
                    `;
                    const missingMarketsResult = await fetchSubgraph<any>(missingMarketsQuery, { ids: missingMarketIds });
                    if (missingMarketsResult.markets && missingMarketsResult.markets.length > 0) {
                        allMarkets = [...allMarkets, ...missingMarketsResult.markets];
                    }
                } catch (e) {
                    console.error('[useLpPositions] Failed to fetch missing markets with LP:', e);
                }
            }

            if (allMarkets.length === 0) {
                return { positions: [], totals: { totalLpValue: 0, totalPendingFees: 0, totalPendingResidual: 0, totalClaimedFees: 0, totalClaimedResidual: 0, totalClaimable: 0, positionCount: 0 } };
            }

            // Step 3: Batch query lpShares for all markets for this user
            const lpSharesCalls = allMarkets.map(m => ({
                address: addresses.core as `0x${string}`,
                abi: coreAbi,
                functionName: 'lpShares' as const,
                args: [BigInt(m.id), address],
                chainId,
            }));

            // Chunk into batches of 50 to avoid RPC limits
            const chunks = chunkArray(lpSharesCalls, 50);
            const allLpShares: (bigint | null)[] = [];

            for (const chunk of chunks) {
                try {
                    const results = await readContracts(config, { contracts: chunk });
                    for (const res of results) {
                        if (res.status === 'success') {
                            allLpShares.push(BigInt(res.result as any));
                        } else {
                            allLpShares.push(null);
                        }
                    }
                } catch (e) {
                    console.error('[useLpPositions] lpShares batch failed:', e);
                    // Fill with nulls
                    for (let i = 0; i < chunk.length; i++) allLpShares.push(null);
                }
            }

            // For markets we found via additional check, use those LP share values
            for (let i = 0; i < allMarkets.length; i++) {
                const marketId = parseInt(allMarkets[i].id);
                if (additionalLpShares.has(marketId)) {
                    allLpShares[i] = additionalLpShares.get(marketId)!;
                }
            }

            // Step 4: Filter to markets where user has LP OR claimed amounts
            const marketsWithLp: { marketId: number; question: string; isResolved: boolean; lpSharesRaw: bigint }[] = [];
            for (let i = 0; i < allMarkets.length; i++) {
                const mIdStr = allMarkets[i].id;
                const lpShares = allLpShares[i];
                const hasShares = lpShares && lpShares > 0n;
                const hasClaims = (claimedFeesByMarket[mIdStr] || 0n) > 0n || (claimedResidualByMarket[mIdStr] || 0n) > 0n;

                if (hasShares || hasClaims) {
                    marketsWithLp.push({
                        marketId: parseInt(allMarkets[i].id),
                        question: allMarkets[i].question,
                        isResolved: allMarkets[i].isResolved,
                        lpSharesRaw: lpShares || 0n,
                    });
                }
            }

            if (marketsWithLp.length === 0) {
                return { positions: [], totals: { totalLpValue: 0, totalPendingFees: 0, totalPendingResidual: 0, totalClaimedFees: 0, totalClaimedResidual: 0, totalClaimable: 0, positionCount: 0 } };
            }

            // Step 5: For markets with LP, fetch accFeePerUSDCE18, lpFeeDebt, pendingLpResidual, and totalLpUsdc
            // pendingFees = (lpShares * accFeePerUSDCE18) / 1e18 - lpFeeDebt
            const detailCalls: any[] = [];
            for (const m of marketsWithLp) {
                // accFeePerUSDCE18 - global fee accumulator for this market
                detailCalls.push({
                    address: addresses.core as `0x${string}`,
                    abi: coreAbi,
                    functionName: 'accFeePerUSDCE18',
                    args: [BigInt(m.marketId)],
                    chainId,
                });
                // lpFeeDebt - user's already credited fees
                detailCalls.push({
                    address: addresses.core as `0x${string}`,
                    abi: coreAbi,
                    functionName: 'lpFeeDebt',
                    args: [BigInt(m.marketId), address],
                    chainId,
                });
                // pendingLpResidual
                detailCalls.push({
                    address: addresses.core as `0x${string}`,
                    abi: coreAbi,
                    functionName: 'pendingLpResidual',
                    args: [BigInt(m.marketId), address],
                    chainId,
                });
                // markets (for totalLpUsdc at index 13)
                detailCalls.push({
                    address: addresses.core as `0x${string}`,
                    abi: coreAbi,
                    functionName: 'markets',
                    args: [BigInt(m.marketId)],
                    chainId,
                });
            }

            let detailResults: any[] = [];
            const detailChunks = chunkArray(detailCalls, 50);
            for (const chunk of detailChunks) {
                try {
                    const results = await readContracts(config, { contracts: chunk });
                    detailResults = detailResults.concat(results);
                } catch (e) {
                    console.error('[useLpPositions] detail batch failed:', e);
                    for (let i = 0; i < chunk.length; i++) detailResults.push({ status: 'failure' });
                }
            }

            // Step 6: Build LP positions
            const positions: LpPosition[] = [];
            for (let i = 0; i < marketsWithLp.length; i++) {
                const m = marketsWithLp[i];
                const baseIdx = i * 4; // Now 4 calls per market

                const accFeeResult = detailResults[baseIdx];
                const lpFeeDebtResult = detailResults[baseIdx + 1];
                const pendingResidualResult = detailResults[baseIdx + 2];
                const marketResult = detailResults[baseIdx + 3];

                // Get raw values
                const accFeePerUSDCE18 = accFeeResult?.status === 'success' ? BigInt(accFeeResult.result as any) : 0n;
                const lpFeeDebt = lpFeeDebtResult?.status === 'success' ? BigInt(lpFeeDebtResult.result as any) : 0n;
                const pendingResidualRaw = pendingResidualResult?.status === 'success' ? BigInt(pendingResidualResult.result as any) : 0n;

                // Calculate actual pending fees: (lpShares * accFeePerUSDCE18) / 1e18 - lpFeeDebt
                // lpShares is 6 decimals, accFeePerUSDCE18 is 18 decimals
                // Result (6 * 18) / 18 -> 6 decimals (USDC precision), which matches lpFeeDebt
                const calculatedFees = (m.lpSharesRaw * accFeePerUSDCE18) / (10n ** 18n);
                const pendingFeesRaw = calculatedFees > lpFeeDebt ? calculatedFees - lpFeeDebt : 0n;

                let totalLpUsdcRaw = 0n;
                if (marketResult?.status === 'success' && Array.isArray(marketResult.result)) {
                    totalLpUsdcRaw = BigInt(marketResult.result[13] || 0);
                }

                const lpShares = parseFloat(formatUnits(m.lpSharesRaw, usdcDecimals));
                // pendingFeesRaw is now in 6 decimals (USDC), no need to divide by 1e12
                const pendingFees = parseFloat(formatUnits(pendingFeesRaw, usdcDecimals));
                const pendingResidual = parseFloat(formatUnits(pendingResidualRaw, usdcDecimals));
                const totalLpUsdc = parseFloat(formatUnits(totalLpUsdcRaw, usdcDecimals));
                const userSharePct = totalLpUsdc > 0 ? (lpShares / totalLpUsdc) * 100 : 0;

                // Retrieve claimed amounts
                const claimedFeesRaw = claimedFeesByMarket[m.marketId.toString()] || 0n;
                const claimedResidualRaw = claimedResidualByMarket[m.marketId.toString()] || 0n;
                const claimedFees = parseFloat(formatUnits(claimedFeesRaw, usdcDecimals));
                const claimedResidual = parseFloat(formatUnits(claimedResidualRaw, usdcDecimals));

                positions.push({
                    marketId: m.marketId,
                    question: m.question,
                    lpShares,
                    lpSharesRaw: m.lpSharesRaw,
                    pendingFees,
                    pendingFeesRaw, // Store in 6 decimals
                    pendingResidual,
                    pendingResidualRaw,
                    claimedFees,
                    claimedResidual,
                    totalClaimed: claimedFees + claimedResidual,
                    totalClaimable: pendingFees + pendingResidual,
                    userSharePct,
                    isResolved: m.isResolved,
                });
            }

            // Step 7: Calculate totals
            const totals = positions.reduce((acc, p) => {
                acc.totalLpValue += p.lpShares; // Assuming 1 LP share ~= 1 USDC approx (simplified)
                acc.totalPendingFees += p.pendingFees;
                acc.totalPendingResidual += p.pendingResidual;
                acc.totalClaimedFees += p.claimedFees;
                acc.totalClaimedResidual += p.claimedResidual;
                acc.totalClaimable += p.totalClaimable;
                return acc;
            }, {
                totalLpValue: 0,
                totalPendingFees: 0,
                totalPendingResidual: 0,
                totalClaimedFees: 0,
                totalClaimedResidual: 0,
                totalClaimable: 0,
                positionCount: positions.length
            });

            return { positions, totals };
        },
        enabled: !!address && isConnected && !!addresses?.core,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const lpPositions = data?.positions ?? [];
    const totals = data?.totals ?? { totalLpValue: 0, totalPendingFees: 0, totalPendingResidual: 0, totalClaimedFees: 0, totalClaimedResidual: 0, totalClaimable: 0, positionCount: 0 };

    const queryClient = useQueryClient();

    // Claim functions
    const claimLpRewards = useCallback(async (marketId: number, hasFees: boolean, hasResidual: boolean) => {
        if (!hasFees && !hasResidual) return;
        if (!addresses?.core) return;

        try {
            setClaimingMarketId(marketId);
            const marketIdBI = BigInt(marketId);

            if (hasFees) {
                const tx1 = await writeContractAsync({
                    address: addresses.core,
                    abi: coreAbi,
                    functionName: 'claimLpFees',
                    args: [marketIdBI],
                });
                await waitForReceipt(publicClient, tx1);
            }

            if (hasResidual) {
                const tx2 = await writeContractAsync({
                    address: addresses.core,
                    abi: coreAbi,
                    functionName: 'claimLpResidual',
                    args: [marketIdBI],
                });
                await waitForReceipt(publicClient, tx2);
            }

            // Wait for block propagation + indexer
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Invalidate the query to force a fresh fetch from the network
            await queryClient.invalidateQueries({ queryKey: ['lpPositionsV2'] });
            await refetch();

            pushToast({ title: 'Success', description: 'LP rewards claimed successfully', type: 'success' });
        } catch (e: any) {
            console.error('[useLpPositions] Claim failed:', e);
            const msg = e?.message?.split('\n')[0] || 'Failed to claim rewards';
            pushToast({ title: 'Error', description: msg, type: 'error' });
        } finally {
            setClaimingMarketId(null);
        }
    }, [writeContractAsync, publicClient, addresses?.core, coreAbi, refetch, pushToast]);

    return {
        lpPositions,
        totals,
        isLoading,
        claimingMarketId,
        claimLpRewards,
        refetch,
    };
}
