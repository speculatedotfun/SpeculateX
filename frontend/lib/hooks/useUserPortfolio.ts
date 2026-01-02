import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { formatUnits } from 'viem';
import { getMarketState, getSpotPriceYesE6, getMarket, getMarketCount, getMarketResolution } from '@/lib/hooks';
import { readContract } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { addresses } from '@/lib/contracts';
import { positionTokenAbi } from '@/lib/abis';

export interface PortfolioPosition {
  marketId: number;
  question: string;
  side: 'YES' | 'NO';
  balance: number; // formatted
  currentPrice: number;
  value: number;
  status: 'Active' | 'Resolved';
  won?: boolean;
  marketResolved: boolean;
  yesWins?: boolean;
}

export interface PortfolioTrade {
  id: string;
  marketId: number;
  question: string;
  action: string;
  side: string;
  tokenAmount: number;
  usdcAmount: number;
  price: number;
  timestamp: number;
  txHash: string;
}

export interface PortfolioRedemption {
  id: string;
  marketId: number;
  question: string;
  amount: number;
  timestamp: number;
  txHash: string;
  yesWins: boolean | null;
}

export function useUserPortfolio() {
  const { address } = useAccount();
  const userId = address?.toLowerCase();

  return useQuery({
    queryKey: ['userPortfolio', userId],
    enabled: !!userId && !!address,
    queryFn: async () => {
      if (!userId || !address) throw new Error('No user');
      const userAddress = address as `0x${string}`;

      const data = await fetchSubgraph<{
        user: {
          balances: Array<{
            side: string;
            tokenBalance: string;
            market: {
              id: string;
              question: string;
              isResolved: boolean;
              yesWins: boolean | null;
            };
          }>;
          trades: Array<{
            id: string;
            timestamp: string;
            action: string;
            side: string;
            tokenDelta: string;
            usdcDelta: string;
            priceE6: string;
            txHash: string;
            market: {
              id: string;
              question: string;
            };
          }>;
          redemptions: Array<{
            id: string;
            amount: string;
            timestamp: string;
            txHash: string;
            market: {
              id: string;
              question: string;
              yesWins: boolean | null;
            };
          }>;
        } | null;
      }>(
        `
        query UserPortfolio($user: ID!) {
          user(id: $user) {
            balances(where: { tokenBalance_gt: "0" }) {
              side
              tokenBalance
              market {
                id
                question
                isResolved
                yesWins
              }
            }
            trades(orderBy: timestamp, orderDirection: desc, first: 50) {
              id
              timestamp
              action
              side
              tokenDelta
              usdcDelta
              priceE6
              txHash
              market {
                id
                question
              }
            }
            redemptions(orderBy: timestamp, orderDirection: desc, first: 50) {
              id
              amount
              timestamp
              txHash
              market {
                id
                question
                yesWins
              }
            }
          }
        }
        `,
        { user: userId }
      );

      const balancesRaw = data.user?.balances || [];
      const tradesRaw = data.user?.trades || [];
      const redemptionsRaw = data.user?.redemptions || [];

      // Get all markets to check for positions not in subgraph
      const marketCount = await getMarketCount();
      const allMarketIds = Array.from({ length: Number(marketCount) }, (_, i) => i + 1);

      // Create a set of market IDs we already have from subgraph
      const subgraphMarketIds = new Set(balancesRaw.map(b => Number(b.market.id)));

      // Check all markets on-chain for user positions
      const onChainPositions: PortfolioPosition[] = [];
      const checkedMarkets = new Set<number>();

      // First, verify and enhance subgraph positions with on-chain data
      const verifiedPositions = await Promise.all(
        balancesRaw.map(async (b) => {
          const marketId = Number(b.market.id);
          checkedMarkets.add(marketId);

          try {
            // Get on-chain market data
            const market = await getMarket(BigInt(marketId));
            const resolution = await getMarketResolution(BigInt(marketId));

            if (!market.exists) return null;

            const side = b.side === 'yes' ? 'YES' : 'NO';
            const tokenAddress = side === 'YES' ? market.yes : market.no;

            // Get actual on-chain balance
            let onChainBalance = 0n;
            try {
              onChainBalance = await readContract(config, {
                address: tokenAddress as `0x${string}`,
                abi: positionTokenAbi,
                functionName: 'balanceOf',
                args: [userAddress],
              }) as bigint;
            } catch (e) {
              console.error(`Failed to get balance for market ${marketId}`, e);
              onChainBalance = BigInt(b.tokenBalance);
            }

            const balance = Number(formatUnits(onChainBalance, 18));

            // Use on-chain resolution data (more reliable)
            const isResolved = resolution.isResolved;
            const yesWins = resolution.yesWins;

            let currentPrice = 0;
            let won = false;

            if (isResolved) {
              if (yesWins === true && side === 'YES') {
                currentPrice = 1;
                won = true;
              } else if (yesWins === false && side === 'NO') {
                currentPrice = 1;
                won = true;
              } else {
                currentPrice = 0;
                won = false;
              }
            } else {
              try {
                const priceYesE6 = await getSpotPriceYesE6(BigInt(marketId));
                const pYes = Number(priceYesE6) / 1e6;
                currentPrice = side === 'YES' ? pYes : (1 - pYes);
              } catch (e) {
                console.error(`Failed to fetch price for market ${marketId}`, e);
                currentPrice = 0;
              }
            }

            return {
              marketId,
              question: market.question || b.market.question,
              side,
              balance,
              currentPrice,
              value: balance * currentPrice,
              status: isResolved ? 'Resolved' : 'Active',
              marketResolved: isResolved,
              yesWins: yesWins ?? undefined,
              won
            };
          } catch (e) {
            console.error(`Error processing market ${marketId}:`, e);
            // Fallback to subgraph data
            const balance = Number(formatUnits(BigInt(b.tokenBalance), 18));
            const side = b.side === 'yes' ? 'YES' : 'NO';
            let currentPrice = 0;
            let won = false;

            if (b.market.isResolved) {
              if (b.market.yesWins === true && side === 'YES') {
                currentPrice = 1;
                won = true;
              } else if (b.market.yesWins === false && side === 'NO') {
                currentPrice = 1;
                won = true;
              } else {
                currentPrice = 0;
                won = false;
              }
            }

            return {
              marketId,
              question: b.market.question,
              side,
              balance,
              currentPrice,
              value: balance * currentPrice,
              status: b.market.isResolved ? 'Resolved' : 'Active',
              marketResolved: b.market.isResolved,
              yesWins: b.market.yesWins ?? undefined,
              won
            };
          }
        })
      );

      // Filter out nulls and positions with 0 balance
      const positions = (verifiedPositions.filter(p => p !== null) as PortfolioPosition[])
        .filter((p: PortfolioPosition) => p.balance > 0.000001);

      // Check additional markets that might not be in subgraph yet
      // Limit to checking last 20 markets to avoid too many calls
      const marketsToCheck = allMarketIds
        .filter(id => !checkedMarkets.has(id))
        .slice(-20);

      for (const marketId of marketsToCheck) {
        try {
          const market = await getMarket(BigInt(marketId));
          if (!market.exists) continue;

          const resolution = await getMarketResolution(BigInt(marketId));
          const isResolved = resolution.isResolved;

          // Check both YES and NO token balances
          for (const side of ['YES', 'NO'] as const) {
            const tokenAddress = side === 'YES' ? market.yes : market.no;
            try {
              const balance = await readContract(config, {
                address: tokenAddress as `0x${string}`,
                abi: positionTokenAbi,
                functionName: 'balanceOf',
                args: [userAddress],
              }) as bigint;

              const balanceNum = Number(formatUnits(balance, 18));
              if (balanceNum > 0.000001) {
                // Found a position not in subgraph!
                const yesWins = resolution.yesWins;
                let currentPrice = 0;
                let won = false;

                if (isResolved) {
                  if (yesWins === true && side === 'YES') {
                    currentPrice = 1;
                    won = true;
                  } else if (yesWins === false && side === 'NO') {
                    currentPrice = 1;
                    won = true;
                  } else {
                    currentPrice = 0;
                    won = false;
                  }
                } else {
                  try {
                    const priceYesE6 = await getSpotPriceYesE6(BigInt(marketId));
                    const pYes = Number(priceYesE6) / 1e6;
                    currentPrice = side === 'YES' ? pYes : (1 - pYes);
                  } catch (e) {
                    currentPrice = 0;
                  }
                }

                positions.push({
                  marketId,
                  question: market.question,
                  side,
                  balance: balanceNum,
                  currentPrice,
                  value: balanceNum * currentPrice,
                  status: isResolved ? 'Resolved' : 'Active',
                  marketResolved: isResolved,
                  yesWins: yesWins ?? undefined,
                  won
                });
              }
            } catch (e) {
              // Skip if can't read balance
              continue;
            }
          }
        } catch (e) {
          // Skip if can't read market
          continue;
        }
      }

      positions.sort((a, b) => b.value - a.value);

      // Process trades
      const trades: PortfolioTrade[] = tradesRaw.map((t) => ({
        id: t.id,
        marketId: Number(t.market.id),
        question: t.market.question,
        action: t.action,
        side: t.side.toUpperCase(),
        tokenAmount: Math.abs(Number(formatUnits(BigInt(t.tokenDelta), 18))),
        usdcAmount: Math.abs(Number(formatUnits(BigInt(t.usdcDelta), 6))),
        price: Number(t.priceE6) / 1e6,
        timestamp: Number(t.timestamp),
        txHash: t.txHash,
      }));

      // Process redemptions from subgraph
      let redemptions: PortfolioRedemption[] = redemptionsRaw.map((r) => ({
        id: r.id,
        marketId: Number(r.market.id),
        question: r.market.question,
        amount: Number(formatUnits(BigInt(r.amount), 6)),
        timestamp: Number(r.timestamp),
        txHash: r.txHash,
        yesWins: r.market.yesWins ?? null,
      }));

      // Reuse marketCount from above
      const maxMarketId = Number(marketCount);

      // Filter out redemptions from markets that don't exist on current Core contract
      redemptions = redemptions.filter(r =>
        r.marketId > 0 && r.marketId <= maxMarketId
      );

      // Merge with local redemptions (optimistic updates)
      try {
        if (typeof window !== 'undefined' && address) {
          // Key local storage by user address to prevent seeing other users' data
          const storageKey = `userRedemptions_${address.toLowerCase()}`;
          const legacyKey = 'userRedemptions';

          // Migrate legacy data if exists (one-time cleanup)
          const legacyData = localStorage.getItem(legacyKey);
          if (legacyData) {
            // We can't safely migrate because we don't know who owned it.
            // Safest to just delete it to prevent data leak between accounts.
            localStorage.removeItem(legacyKey);
          }

          const localRedemptionsRaw = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const subgraphTxHashes = new Set(redemptions.map(r => r.txHash.toLowerCase()));

          const localRedemptions = localRedemptionsRaw
            .filter((r: any) => {
              const notInSubgraph = !subgraphTxHashes.has(r.txHash?.toLowerCase() || '');
              const marketExists = r.marketId && Number(r.marketId) > 0 && Number(r.marketId) <= maxMarketId;
              return notInSubgraph && marketExists;
            })
            .map((r: any) => ({
              id: r.id,
              marketId: r.marketId,
              question: r.question,
              amount: r.amount,
              timestamp: r.timestamp,
              txHash: r.txHash,
              yesWins: r.yesWins
            }));

          if (localRedemptions.length > 0) {
            redemptions.unshift(...localRedemptions);
            redemptions.sort((a, b) => b.timestamp - a.timestamp);
          }
        }
      } catch (e) {
        console.warn('Failed to load local redemptions', e);
      }

      return { positions, trades, redemptions };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
