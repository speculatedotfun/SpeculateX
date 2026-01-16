// Data transformers for market data
import { formatUnits } from 'viem';
import { getUsdcDecimals } from './contracts';
import type { SnapshotTrade, SnapshotBalance } from './useMarketSnapshot';
import { absString } from './marketUtils';

export interface Holder {
  address: string;
  balance: string;
  balanceUsd: number;
}

export type TransactionRow = {
  id: string;
  type: 'BuyYes' | 'BuyNo' | 'SellYes' | 'SellNo';
  user: string;
  amount: string;
  output: string;
  price: string;
  timestamp: number;
  txHash: string;
};

export const toTransactionRow = (trade: SnapshotTrade): TransactionRow | null => {
  const usdcDecimals = getUsdcDecimals();
  const txHash = trade.txHash ?? '';
  const user = trade.user?.id?.toLowerCase() ?? '';
  if (!txHash || !user) return null;

  const action = trade.action === 'sell' ? 'sell' : 'buy';
  const side = trade.side === 'no' ? 'no' : 'yes';

  const tokenDeltaBI = BigInt(trade.tokenDelta || '0');
  const usdcDeltaBI = BigInt(trade.usdcDelta || '0');
  const absToken = tokenDeltaBI < 0n ? -tokenDeltaBI : tokenDeltaBI;
  const absUsdc = usdcDeltaBI < 0n ? -usdcDeltaBI : usdcDeltaBI;

  const amount =
    action === 'buy'
      ? formatUnits(absUsdc, usdcDecimals)
      : formatUnits(absToken, 18);

  const output =
    action === 'buy'
      ? formatUnits(absToken, 18)
      : formatUnits(absUsdc, usdcDecimals);

  // Formatting for display (2 decimals) handled in UI, but here we provide "raw" human readable float string.
  // Actually the UI calls parseFloat().toFixed(2). So returning "59.0" is fine.

  const price =
    Number.isFinite(Number(trade.priceE6))
      ? (Number(trade.priceE6) / 1e6).toString()
      : '0';
  const timestamp = Number(trade.timestamp ?? 0);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

  const type =
    action === 'buy'
      ? side === 'yes'
        ? 'BuyYes'
        : 'BuyNo'
      : side === 'yes'
        ? 'SellYes'
        : 'SellNo';

  return {
    id: `${txHash}-${type}`,
    type,
    user,
    amount,
    output,
    price,
    timestamp,
    txHash,
  };
};

export const toHolder = (balance: SnapshotBalance, price: number): Holder | null => {
  const address = balance.user?.id?.toLowerCase() ?? '';
  const rawBalance = balance.tokenBalance;
  if (!address || !rawBalance) return null;
  try {
    const tokenBalance = Number(formatUnits(BigInt(rawBalance), 18));
    if (!Number.isFinite(tokenBalance) || tokenBalance <= 0) return null;
    return {
      address,
      balance: tokenBalance.toString(),
      balanceUsd: tokenBalance * price,
    };
  } catch (error) {
    console.warn('[Transformer] Failed to parse holder balance', error);
    return null;
  }
};









