'use client';

import { useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { addresses } from '@/lib/contracts';
import { coreAbi as SpeculateCoreABI } from '@/lib/abis';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { CheckCircle, XCircle, AlertTriangle, DollarSign, Trophy, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface Market {
  id: number;
  question: string;
  status: 'active' | 'resolved';
  vault: number;
  residual: number;
  yesToken: `0x${string}`;
  noToken: `0x${string}`;
  yesWins: boolean;
  isResolved: boolean;
  winningSupply: bigint;
}

interface AdminMarketManagerProps {
  markets: Market[];
}

export default function AdminMarketManager({ markets }: AdminMarketManagerProps) {
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { pushToast } = useToast();

  const handleResolve = async (marketId: number, yesWins: boolean) => {
    try {
      writeContract({
        address: addresses.core,
        abi: SpeculateCoreABI,
        functionName: 'resolveMarket',
        args: [BigInt(marketId), yesWins],
      });
    } catch (error) {
      console.error('Error resolving market:', error);
      pushToast({
        title: 'Error',
        description: 'Failed to resolve market',
        type: 'error',
      });
    }
  };

  const handleFinalizeResidual = async (marketId: number) => {
    try {
      writeContract({
        address: addresses.core,
        abi: SpeculateCoreABI,
        functionName: 'finalizeResidual',
        args: [BigInt(marketId)],
      });
    } catch (error) {
      console.error('Error finalizing residual:', error);
      pushToast({
        title: 'Error',
        description: 'Failed to finalize residual',
        type: 'error',
      });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      pushToast({
        title: 'Success',
        description: 'Transaction confirmed successfully',
        type: 'success',
      });
      // Small delay to allow toast to be seen before reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }, [isSuccess, pushToast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0f0a2e]">Manage Markets</h2>
          <p className="text-gray-500 text-sm mt-1">Monitor and resolve active markets</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
          <Activity className="w-4 h-4 text-[#14B8A6]" />
          <span className="text-sm font-medium text-gray-700">{markets.length} Total Markets</span>
        </div>
      </div>

      <div className="grid gap-4">
        {markets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">No markets found</p>
          </div>
        ) : (
          markets.map((market) => {
            const isResolved = market.status === 'resolved';
            const winnersRemaining = market.winningSupply > 0n;
            const winningSupplyDisplay = Number(formatUnits(market.winningSupply, 18));
            
            // Logic for smart residual finalization
            // Required payout = winningSupply (since 1 token = 1 USDC)
            const requiredVault = winningSupplyDisplay;
            const availableResidual = Math.max(0, market.vault - requiredVault);
            
            // Enable button if there is strictly more money in the vault than needed for winners
            const canFinalizeResidual = isResolved && availableResidual > 0.000001;
            const finalizeDisabled = !canFinalizeResidual || isPending || isConfirming;
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={market.id}
                className={`rounded-2xl border p-5 transition-all duration-300 ${
                  isResolved 
                    ? 'bg-gray-50/50 border-gray-100' 
                    : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-[#14B8A6]/20'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                         isResolved ? 'bg-gray-200 text-gray-500' : 'bg-[#14B8A6]/10 text-[#14B8A6]'
                      }`}>
                        #{market.id}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight text-lg">{market.question}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant={isResolved ? "secondary" : "default"} className={isResolved ? "bg-gray-200 text-gray-600" : "bg-[#14B8A6] hover:bg-[#0D9488]"}>
                            {isResolved ? 'Resolved' : 'Live Trading'}
                          </Badge>
                          <Badge variant="outline" className="bg-white">
                            Vault: ${market.vault.toFixed(2)}
                          </Badge>
                          {market.residual > 0 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Finalized Residual: ${market.residual.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {isResolved && (
                      <div className="ml-11 bg-white rounded-xl p-3 border border-gray-100 text-sm space-y-2">
                        <div className="flex items-center gap-2 font-medium text-gray-900">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          Winning Side: <span className={market.yesWins ? "text-green-600" : "text-red-600"}>{market.yesWins ? 'YES' : 'NO'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                          <div>
                            <p className="font-medium text-gray-700">Unclaimed Winnings</p>
                            <p>${winningSupplyDisplay.toFixed(2)} needed</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Available Residual</p>
                            <p className={availableResidual > 0 ? "text-green-600 font-bold" : ""}>${availableResidual.toFixed(2)}</p>
                          </div>
                        </div>
                        
                        {canFinalizeResidual && (
                          <div className="flex items-start gap-2 mt-2 text-blue-600 bg-blue-50 p-2 rounded-lg text-xs">
                            <DollarSign className="w-3 h-3 mt-0.5 shrink-0" />
                            <p>You can finalize ${availableResidual.toFixed(2)} for LPs while keeping ${winningSupplyDisplay.toFixed(2)} reserved for winners.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 ml-11 lg:ml-0">
                    {!isResolved ? (
                      <>
                        <Button
                          onClick={() => handleResolve(market.id, true)}
                          disabled={isPending || isConfirming}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Resolve YES
                        </Button>
                        <Button
                          onClick={() => handleResolve(market.id, false)}
                          disabled={isPending || isConfirming}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Resolve NO
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleFinalizeResidual(market.id)}
                        disabled={finalizeDisabled}
                        variant={finalizeDisabled ? "outline" : "default"}
                        className={finalizeDisabled ? "text-gray-400" : "bg-blue-600 hover:bg-blue-700 text-white"}
                        size="sm"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Finalize Residual
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
