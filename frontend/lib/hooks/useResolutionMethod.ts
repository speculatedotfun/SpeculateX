'use client';
import { usePublicClient } from 'wagmi';
import { useEffect, useState } from 'react';
import { decodeEventLog } from 'viem';
import { getAddresses, getCurrentNetwork } from '@/lib/contracts';
import { getChainlinkResolverAbi } from '@/lib/abis';

export type ResolutionMethod = 'FIRST_AFTER' | 'TWAP_5M' | 'FIRST_AFTER_LATE' | null;

interface ResolutionMetadata {
  method: ResolutionMethod;
  resolvedAt: number | null;
  oracleUpdatedAt: number | null;
  twapWindowStart: number | null;
  twapWindowEnd: number | null;
}

export function useResolutionMethod(marketId: number, isResolved: boolean): ResolutionMetadata {
  const publicClient = usePublicClient();
  const [metadata, setMetadata] = useState<ResolutionMetadata>({
    method: null,
    resolvedAt: null,
    oracleUpdatedAt: null,
    twapWindowStart: null,
    twapWindowEnd: null,
  });

  useEffect(() => {
    if (!publicClient || !isResolved || !marketId) {
      setMetadata({
        method: null,
        resolvedAt: null,
        oracleUpdatedAt: null,
        twapWindowStart: null,
        twapWindowEnd: null,
      });
      return;
    }

    async function fetchResolutionMethod() {
      try {
        const addresses = getAddresses();
        const network = getCurrentNetwork();
        const resolverAddress = addresses.chainlinkResolver;

        if (!resolverAddress) {
          return;
        }

        const resolverAbi = getChainlinkResolverAbi(network);
        const fromBlock = 0n; // Start from contract deployment
        const toBlock = 'latest';

        // Get all logs from resolver and decode them
        const logs = await publicClient.getLogs({
          address: resolverAddress as `0x${string}`,
          fromBlock,
          toBlock,
        });

        // Filter and decode events for this market
        const marketIdBigInt = BigInt(marketId);
        let twapEvent: any = null;
        let lateEvent: any = null;
        let resolvedEvent: any = null;

        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: resolverAbi,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === 'MarketResolvedTwap' && decoded.args.marketId === marketIdBigInt) {
              twapEvent = { ...decoded, blockNumber: log.blockNumber };
            } else if (decoded.eventName === 'MarketResolvedLate' && decoded.args.marketId === marketIdBigInt) {
              lateEvent = { ...decoded, blockNumber: log.blockNumber };
            } else if (decoded.eventName === 'MarketResolved' && decoded.args.marketId === marketIdBigInt) {
              resolvedEvent = { ...decoded, blockNumber: log.blockNumber };
            }
          } catch (e) {
            // Not a resolver event, skip
            continue;
          }
        }

        // Priority: TWAP > Late > First After
        if (twapEvent) {
          setMetadata({
            method: 'TWAP_5M',
            resolvedAt: Number(twapEvent.blockNumber),
            oracleUpdatedAt: null,
            twapWindowStart: Number(twapEvent.args.windowStart),
            twapWindowEnd: Number(twapEvent.args.windowEnd),
          });
          return;
        }

        if (lateEvent) {
          setMetadata({
            method: 'FIRST_AFTER_LATE',
            resolvedAt: Number(lateEvent.blockNumber),
            oracleUpdatedAt: Number(lateEvent.args.updatedAt),
            twapWindowStart: null,
            twapWindowEnd: null,
          });
          return;
        }

        if (resolvedEvent) {
          setMetadata({
            method: 'FIRST_AFTER',
            resolvedAt: Number(resolvedEvent.blockNumber),
            oracleUpdatedAt: Number(resolvedEvent.args.updatedAt),
            twapWindowStart: null,
            twapWindowEnd: null,
          });
          return;
        }

        // If no events found, default to null
        setMetadata({
          method: null,
          resolvedAt: null,
          oracleUpdatedAt: null,
          twapWindowStart: null,
          twapWindowEnd: null,
        });
      } catch (error) {
        console.error('Error fetching resolution method:', error);
        setMetadata({
          method: null,
          resolvedAt: null,
          oracleUpdatedAt: null,
          twapWindowStart: null,
          twapWindowEnd: null,
        });
      }
    }

    fetchResolutionMethod();
  }, [publicClient, marketId, isResolved]);

  return metadata;
}

