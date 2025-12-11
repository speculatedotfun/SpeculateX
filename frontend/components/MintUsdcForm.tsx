'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { addresses } from '@/lib/contracts';
import { usdcAbi, coreAbi } from '@/lib/abis';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, CheckCircle2 } from 'lucide-react';

export default function MintUsdcForm() {
  const { address } = useAccount();
  const { pushToast } = useToast();
  const [mintAmount, setMintAmount] = useState('1000');
  const [userBalance, setUserBalance] = useState('0');
  
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: addresses.usdc,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: isConfirming ? 1000 : false },
  });

  useEffect(() => {
    if (balance) setUserBalance(formatUnits(balance as bigint, 6));
  }, [balance]);

  useEffect(() => {
    if (isSuccess) {
      pushToast({ title: 'Success', description: `Minted ${Number(mintAmount).toLocaleString()} USDC`, type: 'success' });
      refetchBalance();
    }
  }, [isSuccess, mintAmount, pushToast, refetchBalance]);

  const handleMint = async () => {
    if (!address || !mintAmount) return;
    try {
      const amount = parseUnits(mintAmount, 6);
      writeContract({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'faucet',
        args: [amount],
      });
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message || 'Mint failed', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {address ? (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-5 border border-blue-200/50 dark:border-blue-800/30">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Coins className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Balance</span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white mt-2">
            {parseFloat(userBalance).toLocaleString()} <span className="text-lg text-gray-400">USDC</span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 text-center text-amber-800 dark:text-amber-200 font-medium text-sm">
          Connect wallet to view balance
        </div>
      )}

      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Mint Amount</label>
        <div className="relative">
          <Input 
            type="number" 
            value={mintAmount} 
            onChange={(e) => setMintAmount(e.target.value)} 
            className="pr-16 font-mono font-bold text-lg"
            placeholder="1000"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">USDC</div>
        </div>
        <div className="flex gap-2">
          {['1000', '5000', '10000'].map(amt => (
            <button
              key={amt}
              onClick={() => setMintAmount(amt)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              +{Number(amt).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <Button 
        onClick={handleMint} 
        disabled={isPending || isConfirming || !address} 
        className="w-full h-12 text-base shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-500 text-white"
      >
        {isPending || isConfirming ? (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
        ) : (
          'Mint Testnet USDC'
        )}
      </Button>
    </div>
  );
}