'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, RefreshCw, ShieldAlert, Vault } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fetchSubgraph } from '@/lib/subgraphClient';
import { getAddresses, getCurrentNetwork, getUsdcDecimals } from '@/lib/contracts';
import { formatUnits } from 'viem';

type ResolverEvent = {
  id: string;
  type: string;
  opId?: string | null;
  tag?: string | null;
  readyAt?: string | null;
  market?: { id: string; question: string } | null;
  feed?: string | null;
  price?: string | null;
  updatedAt?: string | null;
  twapPrice?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  newCore?: string | null;
  newMaxStaleness?: string | null;
  newDelay?: string | null;
  payloadLen?: string | null;
  payloadWord0?: string | null;
  txHash: string;
  blockNumber: string;
  timestamp: string;
};

type TreasuryEvent = {
  id: string;
  type: string;
  opId?: string | null;
  token?: string | null;
  to?: string | null;
  amount?: string | null;
  readyAt?: string | null;
  oldLimit?: string | null;
  newLimit?: string | null;
  txHash: string;
  blockNumber: string;
  timestamp: string;
};

const EVENT_QUERY = /* GraphQL */ `
  query ProtocolEvents($limit: Int!) {
    resolverEvents(first: $limit, orderBy: timestamp, orderDirection: desc) {
      id
      type
      opId
      tag
      readyAt
      market { id question }
      feed
      price
      updatedAt
      twapPrice
      windowStart
      windowEnd
      newCore
      newMaxStaleness
      newDelay
      payloadLen
      payloadWord0
      txHash
      blockNumber
      timestamp
    }
    treasuryEvents(first: $limit, orderBy: timestamp, orderDirection: desc) {
      id
      type
      opId
      token
      to
      amount
      readyAt
      oldLimit
      newLimit
      txHash
      blockNumber
      timestamp
    }
  }
`;

function shortHash(value?: string | null) {
  if (!value) return '—';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatTimestamp(ts?: string | null) {
  if (!ts) return '—';
  const time = Number(ts) * 1000;
  return formatDistanceToNow(time, { addSuffix: true })
    .replace('about ', '')
    .replace('less than a minute ago', 'just now');
}

function getExplorerBase() {
  const network = getCurrentNetwork();
  return network === 'mainnet' ? 'https://bscscan.com' : 'https://testnet.bscscan.com';
}

export default function ProtocolEventLog() {
  const explorerBase = getExplorerBase();
  const addresses = getAddresses();
  const usdcDecimals = getUsdcDecimals();

  const { data, isFetching, refetch } = useQuery<{
    resolverEvents: ResolverEvent[];
    treasuryEvents: TreasuryEvent[];
  }>({
    queryKey: ['protocolEvents', getCurrentNetwork()],
    queryFn: async () => fetchSubgraph(EVENT_QUERY, { limit: 20 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const resolverEvents = data?.resolverEvents ?? [];
  const treasuryEvents = data?.treasuryEvents ?? [];

  const formatAmount = useMemo(() => {
    return (amount?: string | null, token?: string | null) => {
      if (!amount) return '—';
      if (!token) return amount;
      if (token.toLowerCase() !== addresses.usdc.toLowerCase()) {
        return amount;
      }
      try {
        const value = formatUnits(BigInt(amount), usdcDecimals);
        return `${value} USDC`;
      } catch {
        return amount;
      }
    };
  }, [addresses.usdc, usdcDecimals]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Live from subgraph
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/70 dark:bg-gray-900/50 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Resolver Events
          </div>
          <div className="space-y-3">
            {resolverEvents.length === 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                No resolver activity yet.
              </div>
            )}
            {resolverEvents.map(event => (
              <div key={event.id} className="rounded-xl border border-gray-200/70 dark:border-white/5 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-200">
                  <span>{event.type}</span>
                  <a
                    href={`${explorerBase}/tx/${event.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {shortHash(event.txHash)}
                  </a>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {event.market && (
                    <div>
                      Market {event.market.id}: {event.market.question}
                    </div>
                  )}
                  {event.feed && <div>Feed: {shortHash(event.feed)}</div>}
                  {event.price && <div>Price: {event.price}</div>}
                  {event.twapPrice && <div>TWAP: {event.twapPrice}</div>}
                  {event.updatedAt && <div>Updated: {event.updatedAt}</div>}
                  {event.readyAt && <div>Ready At: {event.readyAt}</div>}
                  {event.newCore && <div>New Core: {shortHash(event.newCore)}</div>}
                  {event.newMaxStaleness && <div>Max Staleness: {event.newMaxStaleness}</div>}
                  {event.newDelay && <div>New Delay: {event.newDelay}</div>}
                  {event.payloadLen && <div>Payload Len: {event.payloadLen}</div>}
                  <div>When: {formatTimestamp(event.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/70 dark:bg-gray-900/50 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Vault className="h-4 w-4 text-emerald-500" />
            Treasury Events
          </div>
          <div className="space-y-3">
            {treasuryEvents.length === 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                No treasury activity yet.
              </div>
            )}
            {treasuryEvents.map(event => (
              <div key={event.id} className="rounded-xl border border-gray-200/70 dark:border-white/5 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-200">
                  <span>{event.type}</span>
                  <a
                    href={`${explorerBase}/tx/${event.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {shortHash(event.txHash)}
                  </a>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {event.opId && <div>Op: {shortHash(event.opId)}</div>}
                  {event.token && <div>Token: {shortHash(event.token)}</div>}
                  {event.to && <div>To: {shortHash(event.to)}</div>}
                  {event.amount && <div>Amount: {formatAmount(event.amount, event.token)}</div>}
                  {event.readyAt && <div>Ready At: {event.readyAt}</div>}
                  {event.oldLimit && event.newLimit && (
                    <div>
                      Limit: {formatAmount(event.oldLimit, addresses.usdc)} → {formatAmount(event.newLimit, addresses.usdc)}
                    </div>
                  )}
                  <div>When: {formatTimestamp(event.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

