'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Droplets,
  ChevronDown,
  AlertCircle,
  Info,
  Loader2
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';

import {
  clamp,
  formatBalanceDisplay,
  toBigIntSafe
} from '@/lib/tradingUtils';
import { hapticFeedback } from '@/lib/haptics';

// --- Sub-Components ---
import { SplitOrderModal } from './trading/SplitOrderModal';
import { TradePreview } from './trading/TradePreview';
import { LiquiditySection } from './trading/LiquiditySection';
import { RedeemSection } from './trading/RedeemSection';
import { TradeModeToggle } from './trading/TradeModeToggle';
import { OutcomeSelector } from './trading/OutcomeSelector';
import { TradeAmountInput } from './trading/TradeAmountInput';
import { TradeActionButtons } from './trading/TradeActionButtons';

// --- Hooks ---
import { useMarketContractData } from './trading/useMarketContractData';
import { useMarketLogic } from './trading/useMarketLogic';
import { useTrading } from './trading/useTrading';
import { useTradePreview } from './trading/useTradePreview';
import { useLiquidity } from './trading/useLiquidity';
import { useRedeem } from './trading/useRedeem';

interface TradingCardProps {
  marketId: number;
  onTradeSuccess?: (trade: any) => void;
}

export default function TradingCard({ marketId, onTradeSuccess }: TradingCardProps) {
  const { address, isConnected } = useAccount();
  const marketIdBI = useMemo(() => BigInt(marketId), [marketId]);

  // --- UI State ---
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');

  // --- Data Hook ---
  const {
    contractData,
    marketStateData,
    resolutionData,
    usdcBalanceData,
    usdcAllowanceData,
    yesBalanceData,
    noBalanceData,
    lpSharesData,
    pendingFeesData,
    pendingResidualData,
    refetchAll,
    isLoading,
  } = useMarketContractData(marketId, marketIdBI);

  // --- Logic Hook ---
  const {
    qYes,
    qNo,
    bE18,
    totalLpUsdc,
    feeTreasuryBps,
    feeLpBps,
    feeVaultBps,
    totalFeeBps,
    isResolved,
    isCancelled,
    isTradeable,
    tradeDisabledReason,
    maxJumpE6,
    jumpLimitE18,
  } = useMarketLogic({ contractData, marketStateData, resolutionData });

  // --- Derived State ---
  const usdcBalanceRaw = toBigIntSafe(usdcBalanceData);
  const yesBalanceRaw = toBigIntSafe(yesBalanceData);
  const noBalanceRaw = toBigIntSafe(noBalanceData);
  const usdcAllowanceValue = toBigIntSafe(usdcAllowanceData);
  const lpSharesValue = toBigIntSafe(lpSharesData);
  const pendingFeesValue = toBigIntSafe(pendingFeesData);
  const pendingResidualValue = toBigIntSafe(pendingResidualData);

  const usdcBalance = formatBalanceDisplay(usdcBalanceRaw, 6);
  const yesBalance = formatBalanceDisplay(yesBalanceRaw, 18);
  const noBalance = formatBalanceDisplay(noBalanceRaw, 18);

  const amountDecimals = tradeMode === 'buy' ? 6 : 18;
  const amountRegex = useMemo(() => new RegExp(`^\\d*(?:\\.\\d{0,${amountDecimals}})?$`), [amountDecimals]);
  const amountBigInt = useMemo(() => {
    try {
      return amount ? parseUnits(amount, amountDecimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, amountDecimals]);

  const canBuy = tradeMode === 'buy' && usdcBalanceRaw >= amountBigInt;
  const canSell = tradeMode === 'sell' && (side === 'yes' ? yesBalanceRaw >= amountBigInt : noBalanceRaw >= amountBigInt);
  const overJumpCap = tradeMode === 'buy' && maxJumpE6 > 0n && amountBigInt > maxJumpE6;

  // --- Trading Hook ---
  const {
    pendingTrade,
    busyLabel: tradeBusyLabel,
    showSplitConfirm,
    setShowSplitConfirm,
    pendingSplitAmount,
    handleTrade,
    handleConfirmSplit,
  } = useTrading({
    marketId,
    marketIdBI,
    tradeMode,
    side,
    amount,
    amountBigInt,
    isTradeable,
    tradeDisabledReason,
    maxJumpE6,
    qYes,
    qNo,
    bE18,
    feeTreasuryBps,
    feeVaultBps,
    feeVaultBps, // duplicate key issue check? corrected in replacement
    feeLpBps,
    usdcAllowanceValue,
    refetchAll,
    setAmount,
    onTradeSuccess, // NEW
  });

  // --- Preview Hook ---
  const {
    currentPrice,
    newPrice,
    shares,
    avgPrice,
    costUsd,
    feeUsd,
    feePercent,
    maxProfit,
    maxProfitPct,
    maxPayout,
  } = useTradePreview({
    amount,
    tradeMode,
    side,
    qYes,
    qNo,
    bE18,
    feeTreasuryBps,
    feeVaultBps,
    feeLpBps,
    totalFeeBps,
    getActualBasePrice: () => {
      const priceE18 = spotPriceYesE18(qYes, qNo, bE18);
      return parseFloat(formatUnits(priceE18, 18));
    }
  });

  // --- Liquidity Hook ---
  const {
    addLiquidityAmount,
    setAddLiquidityAmount,
    removeLiquidityAmount,
    setRemoveLiquidityAmount,
    isLpProcessing,
    pendingLpAction,
    handleAddLiquidity,
    handleRemoveLiquidity,
    handleClaimAllLp,
  } = useLiquidity({
    marketIdBI,
    lpSharesValue,
    usdcAllowanceValue,
    refetchAll,
  });

  // --- Redeem Hook ---
  const {
    isRedeeming,
    handleRedeem,
  } = useRedeem({
    marketIdBI,
    refetchAll,
  });

  const isBusy = pendingTrade || isLpProcessing || isRedeeming;
  const busyLabel = tradeBusyLabel || pendingLpAction || (isRedeeming ? 'Redeeming...' : '');

  return (
    <>
      <SplitOrderModal
        show={showSplitConfirm}
        totalSplitDisplay={formatUnits(pendingSplitAmount, 6)}
        splitChunkAmountDisplay={formatUnits(maxJumpE6, 6)}
        splitChunkCountDisplay={maxJumpE6 > 0n ? Number(pendingSplitAmount / maxJumpE6) + 1 : 0}
        isTradeable={isTradeable}
        isBusy={isBusy}
        onCancel={() => setShowSplitConfirm(false)}
        onConfirm={handleConfirmSplit}
      />

      {isLoading ? (
        <div className="p-6 space-y-6 bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[28px] shadow-sm">
          <Skeleton className="h-12 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            <Skeleton className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          </div>
          <Skeleton className="h-20 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <Skeleton className="h-14 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
        </div>
      ) : (
        <div className="p-1 space-y-6 bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[28px] shadow-sm dark:shadow-none" data-testid="trading-card" role="main" aria-label="Trading interface">
          {!isTradeable && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 flex gap-3 items-start"
              role="alert"
              aria-live="polite"
            >
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400 mt-0.5">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="text-sm text-amber-800 dark:text-amber-200 font-medium leading-relaxed">{tradeDisabledReason}</div>
            </motion.div>
          )}

          <TradeModeToggle
            tradeMode={tradeMode}
            setTradeMode={setTradeMode}
            isBusy={isBusy}
            isTradeable={isTradeable}
          />

          <OutcomeSelector
            side={side}
            setSide={setSide}
            priceYes={parseFloat(formatUnits(spotPriceYesE18(qYes, qNo, bE18), 18))}
            priceNo={1 - parseFloat(formatUnits(spotPriceYesE18(qYes, qNo, bE18), 18))}
            yesBalance={yesBalance}
            noBalance={noBalance}
            isBusy={isBusy}
            isTradeable={isTradeable}
          />

          <div className="space-y-4">
            <TradeAmountInput
              amount={amount}
              setAmount={setAmount}
              tradeMode={tradeMode}
              side={side}
              usdcBalance={usdcBalance}
              yesBalance={yesBalance}
              noBalance={noBalance}
              usdcBalanceRaw={usdcBalanceRaw}
              yesBalanceRaw={yesBalanceRaw}
              noBalanceRaw={noBalanceRaw}
              canBuy={canBuy}
              canSell={canSell}
              isTradeable={isTradeable}
              amountRegex={amountRegex}
            />

            <AnimatePresence>
              {amount && parseFloat(amount) > 0 && !(tradeMode === 'buy' ? canBuy : canSell) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800" role="alert">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div className="text-xs font-medium text-red-700 dark:text-red-300">
                      Insufficient balance.
                    </div>
                  </div>
                </motion.div>
              )}
              {overJumpCap && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800" role="alert">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      This order will be split into multiple transactions.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {amount && parseFloat(amount) > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                <TradePreview
                  amount={amount} tradeMode={tradeMode} currentPrice={currentPrice} newPrice={newPrice} shares={shares} avgPrice={avgPrice}
                  costUsd={costUsd} feeUsd={feeUsd} feePercent={feePercent} maxProfit={maxProfit} maxProfitPct={maxProfitPct} maxPayout={maxPayout}
                  gasEstimate={null} feeTreasuryBps={feeTreasuryBps} feeVaultBps={feeVaultBps} feeLpBps={feeLpBps} tradeMultiple={0}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <TradeActionButtons
            isConnected={isConnected}
            isBusy={isBusy}
            isTradeable={isTradeable}
            tradeMode={tradeMode}
            amount={amount}
            canBuy={canBuy}
            canSell={canSell}
            usdcAllowanceValue={usdcAllowanceValue}
            amountBigInt={amountBigInt}
            busyLabel={busyLabel}
            handleTrade={handleTrade}
          />

          <div className="pt-2 space-y-4">
            {(isResolved || isCancelled) && (
              <RedeemSection
                isResolved={isResolved}
                isCancelled={isCancelled}
                yesBalance={yesBalance}
                noBalance={noBalance}
                yesBalanceRaw={yesBalanceRaw}
                noBalanceRaw={noBalanceRaw}
                resolution={contractData?.resolution}
                isBusy={isBusy}
                handleRedeem={handleRedeem}
              />
            )}

            <div className="mt-4">
              <details className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
                <summary
                  className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors select-none focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50 focus:ring-offset-2"
                  role="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500 dark:text-blue-400">
                      <Droplets className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-sm">Liquidity Provider</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Earn trading fees</div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-open:bg-gray-200 dark:group-open:bg-gray-600 transition-colors">
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
                  </div>
                </summary>

                <div className="px-4 pb-4">
                  <LiquiditySection
                    vaultBase={parseFloat(formatUnits(toBigIntSafe(marketStateData?.[2]), 6))}
                    lpShareFloat={parseFloat(formatUnits(lpSharesValue, 6))}
                    userSharePct={(parseFloat(formatUnits(lpSharesValue, 6)) / parseFloat(formatUnits(totalLpUsdc, 6))) * 100 || 0}
                    pendingFeesFloat={parseFloat(formatUnits(pendingFeesValue, 6))}
                    pendingResidualFloat={parseFloat(formatUnits(pendingResidualValue, 6))}
                    lpFeePoolFloat={parseFloat(formatUnits(toBigIntSafe(
                      Array.isArray(contractData) ? contractData?.[14] : contractData?.lpFeesUSDC
                    ), 6))}
                    isResolved={isResolved}
                    addLiquidityAmount={addLiquidityAmount}
                    setAddLiquidityAmount={setAddLiquidityAmount}
                    removeLiquidityAmount={removeLiquidityAmount}
                    setRemoveLiquidityAmount={setRemoveLiquidityAmount}
                    liquidityRegex={new RegExp(`^\\d*(?:\\.\\d{0,6})?$`)}
                    formatLiquidity={(n) => n.toFixed(6)}
                    maxBuyAmount={parseFloat(usdcBalance)}
                    canAddLiquidity={parseFloat(addLiquidityAmount) > 0}
                    canRemoveLiquidity={parseFloat(removeLiquidityAmount) > 0 && parseFloat(removeLiquidityAmount) <= parseFloat(formatUnits(lpSharesValue, 6))}
                    isLpProcessing={isLpProcessing}
                    isBusy={isBusy}
                    isTradeable={isTradeable}
                    pendingLpAction={pendingLpAction}
                    pendingLpFeesValue={pendingFeesValue}
                    pendingLpResidualValue={pendingResidualValue}
                    handleAddLiquidity={handleAddLiquidity}
                    handleRemoveLiquidity={handleRemoveLiquidity}
                    handleClaimAllLp={() => handleClaimAllLp(pendingFeesValue > 0n, pendingResidualValue > 0n)}
                    expiryTimestamp={toBigIntSafe(
                      Array.isArray(contractData)
                        ? contractData?.[18]?.expiryTimestamp
                        : contractData?.resolution?.expiryTimestamp
                    )}
                    currentTimestamp={Math.floor(Date.now() / 1000)}
                  />
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// LMSR local helper
function spotPriceYesE18(qYes: bigint, qNo: bigint, bE18: bigint): bigint {
  if (bE18 === 0n) return 5n * 10n ** 17n;
  const qYesNum = Number(qYes) / 1e18;
  const qNoNum = Number(qNo) / 1e18;
  const bNum = Number(bE18) / 1e18;
  const expYes = Math.exp(qYesNum / bNum);
  const expNo = Math.exp(qNoNum / bNum);
  return BigInt(Math.floor((expYes / (expYes + expNo)) * 1e18));
}