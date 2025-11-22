import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { formatUnits } from 'viem';

export interface LeaderboardUser {
  address: string;
  totalVolume: number;
  totalTrades: number;
  uniqueMarkets: number;
  liquidityProvided: number;
  points: number;
  rank: number;
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const data = await fetchSubgraph<{
        users: Array<{
          id: string;
          trades: Array<{
            usdcDelta: string;
            action: string;
            market: {
              id: string;
            };
          }>;
        }>;
        liquidityAddeds: Array<{
          user: string;
          amount: string;
        }>;
      }>(
        `
        query LeaderboardData {
          users(first: 1000) {
            id
            trades {
              usdcDelta
              action
              market {
                id
              }
            }
          }
          # Note: We need to add LiquidityAdded to schema to track this perfectly.
          # For now, we can try to approximate or just leave it 0 until subgraph updates.
          # Using trades for now.
        }
        `
      );

      const users = (data.users || []).map((user) => {
        let volume = 0;
        let tradeCount = 0;
        const marketIds = new Set<string>();
        let liquidityProvided = 0; // TODO: Add LiquidityAdded entity to subgraph to track this

        user.trades.forEach((trade) => {
          // Parse USDC amount (6 decimals)
          const amount = parseFloat(formatUnits(BigInt(trade.usdcDelta), 6));
          volume += Math.abs(amount);
          tradeCount++;
          marketIds.add(trade.market.id);
        });

        const uniqueMarkets = marketIds.size;

        // Weighted Formula:
        // 1. Volume: 1 point per 1 USDC
        // 2. Markets: 10 points per unique market traded
        // 3. Liquidity: 2 points per 1 USDC provided (Placeholder for future)
        const points = (volume * 1) + (uniqueMarkets * 10) + (liquidityProvided * 2);

        return {
          address: user.id,
          totalVolume: volume,
          totalTrades: tradeCount,
          uniqueMarkets,
          liquidityProvided,
          points: points,
          rank: 0, // assigned after sort
        };
      });

      // Sort by points descending
      users.sort((a, b) => b.points - a.points);

      // Assign ranks
      return users.map((u, i) => ({ ...u, rank: i + 1 }));
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

