'use client';
import { useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getAddresses } from '@/lib/contracts';
import { coreAbi } from '@/lib/abis';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { CheckCircle, XCircle, DollarSign, Trophy, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface Market {
  id: number;
  question: string;
  status: 'active' | 'resolved' | 'expired';
  vault: number;
  residual: number;
  yesWins: boolean;
  isResolved: boolean;
  winningSupply: bigint;
}

export default function AdminMarketManager({ markets }: { markets: Market[] }) {
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { pushToast } = useToast();
  const addresses = getAddresses();

  const handleResolve = (id: number, yesWins: boolean) => {
    writeContract({
      address: addresses.core,
      abi: coreAbi,
      functionName: 'resolveMarket',
      args: [BigInt(id), yesWins],
    });
  };

  const handleFinalize = (id: number) => {
    writeContract({
      address: addresses.core,
      abi: coreAbi,
      functionName: 'finalizeResidual',
      args: [BigInt(id)],
    });
  };

  useEffect(() => {
    if (isSuccess) {
      pushToast({ title: 'Success', description: 'Action confirmed', type: 'success' });
      setTimeout(() => window.location.reload(), 1500);
    }
  }, [isSuccess, pushToast]);

  return (
    <div className="space-y-4">
      {markets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No markets found</div>
      ) : (
        markets.map((market) => (
          <motion.div
            key={market.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-[#14B8A6] transition-all"
          >
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">#{market.id}</Badge>
                  <Badge variant={market.isResolved ? "secondary" : "default"}>
                    {market.status}
                  </Badge>
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{market.question}</h4>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-500">Vault</div>
                <div className="font-mono font-bold">${market.vault.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              {!market.isResolved && market.status !== 'expired' ? (
                <>
                  <Button size="sm" onClick={() => handleResolve(market.id, true)} disabled={isPending} className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="w-4 h-4 mr-2" /> Yes Wins
                  </Button>
                  <Button size="sm" onClick={() => handleResolve(market.id, false)} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
                    <XCircle className="w-4 h-4 mr-2" /> No Wins
                  </Button>
                </>
              ) : market.isResolved ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 rounded-lg">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Winner: <span className="font-bold">{market.yesWins ? 'YES' : 'NO'}</span>
                  </div>
                  {market.residual > 0 && (
                     <Button size="sm" onClick={() => handleFinalize(market.id)} disabled={isPending} variant="outline">
                       <DollarSign className="w-4 h-4 mr-2" /> Finalize (${market.residual.toFixed(2)})
                     </Button>
                  )}
                </div>
              ) : market.status === 'expired' ? (
                <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                  <Activity className="w-4 h-4" />
                  Market expired - awaiting Chainlink resolution
                </div>
              ) : null}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}