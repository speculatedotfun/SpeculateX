'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { getAddresses, getChainId, getNetwork } from '@/lib/contracts';
import { usdcAbi, getCoreAbi } from '@/lib/abis';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Sparkles, TrendingUp } from 'lucide-react';

export default function MintUsdcForm() {
  const { address, chain } = useAccount();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { pushToast } = useToast();
  const [mintAmount, setMintAmount] = useState('1000');
  const [userBalance, setUserBalance] = useState('0');
  const [prevBalance, setPrevBalance] = useState('0');
  const [showBalanceIncrease, setShowBalanceIncrease] = useState(false);
  const network = getNetwork();
  const addresses = getAddresses();
  const expectedChainId = getChainId();
  const isChainMismatch = !!chain && chain.id !== expectedChainId;
  
  // All hooks must be called before any early returns
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: addresses.usdc,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { 
      enabled: network === 'testnet' && !!address, 
      refetchInterval: isConfirming ? 1000 : false 
    },
  });

  useEffect(() => {
    if (balance) {
      const newBalance = formatUnits(balance as bigint, 6);
      if (parseFloat(newBalance) > parseFloat(userBalance)) {
        setPrevBalance(userBalance);
        setShowBalanceIncrease(true);
        setTimeout(() => setShowBalanceIncrease(false), 3000);
      }
      setUserBalance(newBalance);
    }
  }, [balance, userBalance]);

  useEffect(() => {
    if (isSuccess) {
      pushToast({ title: 'Success', description: `Minted ${Number(mintAmount).toLocaleString()} USDC`, type: 'success' });
      refetchBalance();
    }
  }, [isSuccess, mintAmount, pushToast, refetchBalance]);
  
  // Only show faucet on testnet
  if (network === 'mainnet') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 text-center">
        <p className="text-blue-800 dark:text-blue-200 font-medium">
          Faucet is only available on Testnet. Switch to Testnet to mint test USDC.
        </p>
      </div>
    );
  }

  const handleMint = async () => {
    if (!address || !mintAmount) return;
    if (isChainMismatch) {
      pushToast({
        title: 'Wrong network',
        description: `Please switch your wallet to chain ${expectedChainId} to mint test USDC.`,
        type: 'warning',
      });
      return;
    }
    try {
      const amount = parseUnits(mintAmount, 6);
      // Call faucet directly on MockUSDC (testnet only)
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
    <div className="space-y-6" role="region" aria-label="Mint testnet USDC">
      {isChainMismatch && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800" role="alert">
          <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Wrong network in wallet. This faucet works on <b>Testnet</b> only.
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => switchChain?.({ chainId: expectedChainId })}
              disabled={!switchChain || isSwitchingChain}
              className="h-10"
            >
              {isSwitchingChain ? 'Switching…' : 'Switch Wallet Network'}
            </Button>
          </div>
        </div>
      )}
      {address ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-5 border border-blue-200/50 dark:border-blue-800/30 overflow-hidden"
        >
          {/* Sparkle effect on balance increase */}
          <AnimatePresence>
            {showBalanceIncrease && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              >
                <Sparkles className="absolute top-2 right-2 w-5 h-5 text-blue-500 animate-pulse" aria-hidden="true" />
                <Sparkles className="absolute bottom-2 left-2 w-4 h-4 text-purple-500 animate-pulse" aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <Coins className="w-5 h-5 text-blue-500" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Balance</span>
            </div>
            {showBalanceIncrease && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-bold"
              >
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
                +{(parseFloat(userBalance) - parseFloat(prevBalance)).toLocaleString()}
              </motion.div>
            )}
          </div>
          <motion.div
            key={userBalance}
            initial={{ scale: showBalanceIncrease ? 1.1 : 1 }}
            animate={{ scale: 1 }}
            className="text-3xl font-black text-gray-900 dark:text-white mt-2"
          >
            {parseFloat(userBalance).toLocaleString()} <span className="text-lg text-gray-400">USDC</span>
          </motion.div>
        </motion.div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 text-center text-amber-800 dark:text-amber-200 font-medium text-sm" role="status">
          Connect wallet to view balance
        </div>
      )}

      <div className="space-y-3">
        <label htmlFor="mint-amount-input" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">
          Mint Amount
        </label>
        <div className="relative">
          <Input
            id="mint-amount-input"
            type="number"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
            className="pr-16 font-mono font-bold text-lg"
            placeholder="1000"
            aria-label="Amount of testnet USDC to mint"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400" aria-hidden="true">USDC</div>
        </div>
        <div className="flex gap-2" role="group" aria-label="Quick amount selection">
          {['1000', '5000', '10000'].map(amt => (
            <motion.button
              key={amt}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMintAmount(amt)}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              aria-label={`Set amount to ${Number(amt).toLocaleString()} USDC`}
            >
              +{Number(amt).toLocaleString()}
            </motion.button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleMint}
        disabled={isPending || isConfirming || !address || isChainMismatch}
        className="w-full h-12 text-base shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label={isPending || isConfirming ? 'Minting USDC in progress' : 'Mint testnet USDC'}
      >
        {isPending || isConfirming ? (
          <span className="flex items-center justify-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              aria-hidden="true"
            />
            {isPending ? 'Confirming...' : 'Minting...'}
          </span>
        ) : (
          'Mint Testnet USDC'
        )}
      </Button>
    </div>
  );
}