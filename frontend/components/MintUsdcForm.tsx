'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { getAddresses, getNetwork } from '@/lib/contracts';
import { usdcAbi } from '@/lib/abis';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';

export default function MintUsdcForm() {
  const { address } = useAccount();
  const { pushToast } = useToast();
  const [mintAmount, setMintAmount] = useState('1000');
  const [userBalance, setUserBalance] = useState('0');
  const [prevBalance, setPrevBalance] = useState('0');
  const [showBalanceIncrease, setShowBalanceIncrease] = useState(false);
  const network = getNetwork();
  const addresses = getAddresses();

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: addresses.usdc,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: network === 'testnet' && !!address,
      refetchInterval: isConfirming || isPending ? 1000 : false
    },
  });

  useEffect(() => {
    if (balance !== undefined) {
      const newBalance = formatUnits(balance as bigint, 6);
      if (parseFloat(newBalance) > parseFloat(userBalance)) {
        setPrevBalance(userBalance);
        setShowBalanceIncrease(true);
        setTimeout(() => setShowBalanceIncrease(false), 3000);
      }
      setUserBalance(newBalance);
    } else if (network === 'testnet' && address) {
      // Initialize to 0 if balance is undefined but we should have a value
      setUserBalance('0');
    }
  }, [balance, userBalance, network, address]);

  useEffect(() => {
    if (isSuccess) {
      pushToast({ title: 'Success', description: `Minted ${Number(mintAmount).toLocaleString()} USDC`, type: 'success' });
      // Wait a bit for the transaction to be indexed, then refetch
      setTimeout(() => {
        refetchBalance();
      }, 2000);
    }
  }, [isSuccess, mintAmount, pushToast, refetchBalance]);

  if (network === 'mainnet') {
    return (
      <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20 text-center">
        <p className="text-blue-400 font-medium text-sm">
          Faucet is only available on Testnet.
        </p>
      </div>
    );
  }

  const handleMint = async () => {
    if (!address || !mintAmount) return;
    try {
      const amount = parseUnits(mintAmount, 6);
      writeContract({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'faucet',
        args: [amount],
      });
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message || 'Mint failed', type: 'error' });
    }
  };

  return (
    <div className="h-full flex flex-col justify-between">
      <div>
        {address ? (
          <div className="relative mb-6">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">My Balance</div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                {parseFloat(userBalance).toLocaleString()} <span className="text-lg text-gray-400 dark:text-gray-500 font-medium">USDC</span>
              </div>
              {showBalanceIncrease && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +{(parseFloat(userBalance) - parseFloat(prevBalance)).toLocaleString()}
                </motion.div>
              )}
            </div>
            <AnimatePresence>
              {showBalanceIncrease && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
                  <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-emerald-400/20 animate-spin-slow" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-500 text-xs font-bold mb-6">
            <AlertCircle className="w-4 h-4" /> Connect wallet
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase ml-1">Amount</label>
          <div className="relative">
            <Input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              className="bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-mono text-lg h-12 pr-16 focus:ring-blue-500"
              placeholder="1000"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">USDC</div>
          </div>
          <div className="flex gap-2">
            {['1000', '5000', '10000'].map(amt => (
              <button
                key={amt}
                onClick={() => setMintAmount(amt)}
                className="flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10"
              >
                +{Number(amt).toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleMint}
          disabled={isPending || isConfirming || !address}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/20 rounded-xl"
        >
          {isPending || isConfirming ? 'Minting...' : 'Mint Testnet USDC'}
        </Button>
      </div>
    </div>
  );
}