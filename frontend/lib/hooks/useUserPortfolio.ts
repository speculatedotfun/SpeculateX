import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { formatUnits } from 'viem';
import { getMarketState, getSpotPriceYesE6, getMarket, getMarketCount, getMarketResolution } from '@/lib/hooks';
import { readContracts } from 'wagmi/actions';
import { config } from '@/lib/wagmi';
import { useAddresses, getCurrentNetwork, getChainId } from '@/lib/contracts';
import { positionTokenAbi, getCoreAbi } from '@/lib/abis';

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

function useAddressesSnapshot() {
  // Alias to make intent explicit inside hook usage
  return useAddresses();
}

// Helper for chunking
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export function useUserPortfolio() {
  const { address } = useAccount();
  const addresses = useAddressesSnapshot();
  const network = getCurrentNetwork();
  const chainId = getChainId();
  const coreAbi = getCoreAbi(network);
  const userId = address?.toLowerCase();

  return useQuery({
    // Include core address in queryKey so cache is invalidated when network changes
    queryKey: ['userPortfolioOptimized', userId, addresses.core],
    enabled: !!userId && !!address,
    queryFn: async () => {
      if (!userId || !address) throw new Error('No user');
      const userAddress = address as `0x${string}`;

      // 1. Fetch Subgraph Data
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

      // 2. Identify Markets to Check
      const marketCount = await getMarketCount();
      const maxMarketId = Number(marketCount);

      const subgraphMarketIds = balancesRaw.map(b => Number(b.market.id));
      const recentMarketIds = Array.from({ length: Math.min(20, maxMarketId) }, (_, i) => maxMarketId - i);

      const relevantMarketIds = Array.from(new Set([...subgraphMarketIds, ...recentMarketIds]))
        .filter(id => id > 0)
        .sort((a, b) => b - a);

      // 3. Batch 1: Get Market Metadata, Resolution, and Price State
      // Chunking to avoid RPC limits
      const chunks = chunkArray(relevantMarketIds, 10);
      const marketInfoMap = new Map<number, { market: any, resolution: any, priceYes: number }>();

      for (const chunk of chunks) {
        const calls = chunk.flatMap(id => [
          { address: addresses.core, abi: coreAbi, functionName: 'markets', args: [BigInt(id)] },
          { address: addresses.core, abi: coreAbi, functionName: 'getMarketResolution', args: [BigInt(id)] },
          { address: addresses.core, abi: coreAbi, functionName: 'getMarketState', args: [BigInt(id)] },
          { address: addresses.core, abi: coreAbi, functionName: 'spotPriceYesE6', args: [BigInt(id)] } // Explicit price fetch
        ]);

        const results = await readContracts(config, {
          contracts: calls.map(call => ({ ...call, chainId })),
          allowFailure: true
        });

        chunk.forEach((id, index) => {
          const marketRes = results[index * 4];
          const resolutionRes = results[index * 4 + 1];
          const stateRes = results[index * 4 + 2];
          const priceRes = results[index * 4 + 3];

          if (marketRes.status === 'success' && resolutionRes.status === 'success') {
            let price = 0.5;

            // Priority: Explicit price call -> State tuple (legacy) -> Default
            if (priceRes.status === 'success') {
              price = Number(priceRes.result) / 1e6;
            } else if (stateRes.status === 'success' && Array.isArray(stateRes.result)) {
              // Fallback for legacy contracts
              // Check if it looks like the old struct (length 5+)
              // In Diamond, length might be different or indices shifted
              if (stateRes.result.length === 5) {
                const pYesE6 = stateRes.result[4];
                if (pYesE6 !== undefined) {
                  price = Number(pYesE6) / 1e6;
                }
              }
            }

            marketInfoMap.set(id, {
              market: marketRes.result,
              resolution: resolutionRes.result,
              priceYes: price
            });
          }
        });
      }

      // 4. Batch 2: Get Balances
      const balanceCalls: any[] = [];
      const balanceLookup: { id: number, side: 'yes' | 'no' }[] = [];

      relevantMarketIds.forEach(id => {
        const info = marketInfoMap.get(id);
        if (!info) return;
        const { market } = info;
        // The markets function returns a struct/tuple. Assuming wagmi returns an array or object.
        // We handle both cases to be safe.
        const m = market as any;
        // Array index 0 is yes, 1 is no. Object keys are yes, no.
        const yesAddr = m.yes || (Array.isArray(m) ? m[0] : undefined);
        const noAddr = m.no || (Array.isArray(m) ? m[1] : undefined);

        if (yesAddr) {
          balanceCalls.push({ address: yesAddr, abi: positionTokenAbi, functionName: 'balanceOf', args: [userAddress] });
          balanceLookup.push({ id, side: 'yes' });
        }
        if (noAddr) {
          balanceCalls.push({ address: noAddr, abi: positionTokenAbi, functionName: 'balanceOf', args: [userAddress] });
          balanceLookup.push({ id, side: 'no' });
        }
      });

      // Chunk balance calls too
      const balanceChunks = chunkArray(balanceCalls, 20);
      const balanceResults: any[] = [];

      for (const chunk of balanceChunks) {
        const res = await readContracts(config, { contracts: chunk.map(c => ({ ...c, chainId })), allowFailure: true });
        balanceResults.push(...res);
      }

      // 5. Construct Final Positions List
      const positions: PortfolioPosition[] = [];

      const normalizeBool = (v: any): boolean | undefined => {
        if (v === null || v === undefined) return undefined;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v !== 0;
        if (typeof v === 'bigint') return v !== 0n;
        return undefined;
      };

      // Map back results
      balanceResults.forEach((res, idx) => {
        const { id, side } = balanceLookup[idx];
        const bal = res.status === 'success' ? Number(formatUnits(res.result as bigint, 18)) : 0;

        if (bal > 0.000001) {
          const info = marketInfoMap.get(id);
          if (info) {
            const { market, resolution, priceYes } = info;
            const isResolved = normalizeBool((resolution as any).isResolved) ?? false;
            const yesWins = normalizeBool((resolution as any).yesWins);

            let currentPrice = 0;
            let won = false;

            const sideUpper = side === 'yes' ? 'YES' : 'NO';

            if (isResolved) {
              if (yesWins === true && sideUpper === 'YES') {
                currentPrice = 1;
                won = true;
              } else if (yesWins === false && sideUpper === 'NO') {
                currentPrice = 1;
                won = true;
              } else {
                currentPrice = 0;
                won = false;
              }
            } else {
              currentPrice = sideUpper === 'YES' ? priceYes : (1 - priceYes);
            }

            const question = balancesRaw.find(b => Number(b.market.id) === id)?.market.question
              ?? redemptionsRaw.find(r => Number(r.market.id) === id)?.market.question
              ?? `Market #${id}`;

            positions.push({
              marketId: id,
              question,
              side: sideUpper,
              balance: bal,
              currentPrice,
              value: bal * currentPrice,
              status: isResolved ? 'Resolved' : 'Active',
              marketResolved: isResolved,
              yesWins,
              won
            });
          }
        }
      });

      positions.sort((a, b) => b.value - a.value);

      // 6. Process Trades
      const formattedTrades: PortfolioTrade[] = tradesRaw.map((t) => ({
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

      // 7. Process Redemptions
      let formattedRedemptions: PortfolioRedemption[] = redemptionsRaw.map((r) => ({
        id: r.id,
        marketId: Number(r.market.id),
        question: r.market.question,
        amount: Number(formatUnits(BigInt(r.amount), 6)),
        timestamp: Number(r.timestamp),
        txHash: r.txHash,
        yesWins: r.market.yesWins ?? null,
      }));

      formattedRedemptions = formattedRedemptions.filter(r => r.marketId > 0 && r.marketId <= maxMarketId);

      try {
        if (typeof window !== 'undefined' && address) {
          const storageKey = `userRedemptions_${address.toLowerCase()}`;
          const localRedemptionsRaw = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const subgraphTxHashes = new Set(formattedRedemptions.map(r => r.txHash.toLowerCase()));
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
            formattedRedemptions.unshift(...localRedemptions);
            formattedRedemptions.sort((a, b) => b.timestamp - a.timestamp);
          }
        }
      } catch (e) {
        console.warn('Failed to load local redemptions', e);
      }

      return { positions, trades: formattedTrades, redemptions: formattedRedemptions };
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}
