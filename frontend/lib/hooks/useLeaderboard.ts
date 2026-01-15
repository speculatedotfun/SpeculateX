import { useQuery } from '@tanstack/react-query';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { getCurrentNetwork } from '@/lib/contracts';
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
  const network = getCurrentNetwork();
  return useQuery({
    // Include network in queryKey so cache is invalidated when network changes
    queryKey: ['leaderboard', network],
    queryFn: async () => {
      let users: LeaderboardUser[] = [];
      try {
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
          }
          `
        );

        users = (data.users || []).map((user) => {
          let volume = 0;
          let tradeCount = 0;
          const marketIds = new Set<string>();
          const liquidityProvided = 0; // TODO: Add LiquidityAdded entity to subgraph to track this

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
            points,
            rank: 0, // assigned after sort
          };
        });
      } catch (e) {
        console.warn('Leaderboard fetch failed, using mock data:', e);
      }

      // Fallback: Generate Mock Data if empty (for UI demo), BUT ONLY ON TESTNET
      // On Mainnet, we want to show real data (or empty state if no traders yet)
      const currentNetwork = getCurrentNetwork();
      if (users.length === 0 && currentNetwork !== 'mainnet') {
        const mockAddresses = [
          '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
          '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
          '0xb5d85CBf7cB3EE0D56b3bB207D5Fc4B82f43F511',
          '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
          '0x8872615D1a55bcC2695C58ba16FB37d819B0A4ee',
          '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
        ];

        users = mockAddresses.map((addr) => {
          const vol = Math.floor(Math.random() * 50000) + 1000;
          const trades = Math.floor(Math.random() * 200) + 5;
          const markets = Math.floor(Math.random() * 20) + 1;
          return {
            address: addr,
            totalVolume: vol,
            totalTrades: trades,
            uniqueMarkets: markets,
            liquidityProvided: 0,
            points: Math.floor((vol * 1) + (markets * 10)),
            rank: 0
          };
        });
      }

      // Sort by points descending
      users.sort((a, b) => b.points - a.points);

      // Assign ranks
      return users.map((u, i) => ({ ...u, rank: i + 1 }));
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
