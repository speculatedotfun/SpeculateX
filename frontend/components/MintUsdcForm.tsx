'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { addresses } from '@/lib/contracts';
import { usdcAbi, coreAbi } from '@/lib/abis';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MintUsdcForm() {
  const { address } = useAccount();
  const { pushToast } = useToast();
  const [mintAmount, setMintAmount] = useState('1000');
  const [userBalance, setUserBalance] = useState('0');
  
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get user's USDC balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: addresses.usdc,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!(address && addresses.usdc),
      // Refetch while transaction is confirming
      refetchInterval: (isConfirming || isPending) ? 2000 : false,
    },
  });

  useEffect(() => {
    if (balance) {
      setUserBalance(formatUnits(balance as bigint, 6));
    }
  }, [balance]);

  useEffect(() => {
    if (isSuccess) {
      // Small delay to ensure blockchain state is updated, then refetch
      const timeoutId = setTimeout(() => {
        refetchBalance();
      }, 1000);
      
      pushToast({
        title: 'Minted Successfully',
        description: `Successfully minted ${Number(mintAmount).toLocaleString()} USDC`,
        type: 'success'
      });
      setMintAmount('1000');
      
      return () => clearTimeout(timeoutId);
    }
  }, [isSuccess, refetchBalance, pushToast, mintAmount]);

  useEffect(() => {
    if (error) {
      console.error('Error minting USDC:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      pushToast({
        title: 'Mint Failed',
        description: errorMessage,
        type: 'error'
      });
    }
  }, [error, pushToast]);

  const handleMint = async () => {
    if (!mintAmount) {
      pushToast({ title: 'Invalid Amount', description: 'Please enter an amount', type: 'warning' });
      return;
    }

    if (!address) {
      pushToast({ title: 'Wallet not connected', description: 'Please connect your wallet', type: 'warning' });
      return;
    }

    if (!addresses.usdc || addresses.usdc === '0x0000000000000000000000000000000000000000') {
      pushToast({ title: 'Configuration Error', description: 'USDC address not configured', type: 'error' });
      return;
    }

    try {
      const amount = parseUnits(mintAmount, 6);
      
      // Call faucet function on SpeculateCore
      // NOTE: This requires SpeculateCore to have minter role on the USDC token
      writeContract({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'faucet',
        args: [amount],
      });
      
    } catch (error: any) {
      console.error('Error in handleMint:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      pushToast({ title: 'Transaction Failed', description: errorMessage, type: 'error' });
    }
  };

  return (
    <Card className="p-6 sm:p-8 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#14B8A6]/10 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Testnet Faucet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mint free USDC for testing</p>
          </div>
        </div>
        
        {address ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Your Balance</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {parseFloat(userBalance).toLocaleString()} <span className="text-sm font-bold text-gray-400 dark:text-gray-500">USDC</span>
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-6 border border-amber-100 dark:border-amber-800 flex items-center gap-3">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Connect wallet to mint tokens</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Amount
            </label>
            <div className="relative">
              <Input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                min="1"
                className="pr-16 font-mono font-bold text-lg h-12"
                placeholder="1000"
                disabled={isPending || isConfirming || !address}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 dark:text-gray-500 pointer-events-none">
                USDC
              </div>
            </div>
            {/* Quick Selectors */}
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
              {['100', '1000', '5000', '10000'].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setMintAmount(amt)}
                  disabled={isPending || isConfirming || !address}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-[#14B8A6]/10 dark:hover:bg-[#14B8A6]/20 hover:text-[#14B8A6] transition-colors"
                >
                  {Number(amt).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleMint}
            disabled={isPending || isConfirming || !address}
            className="w-full h-14 text-base bg-[#14B8A6] hover:bg-[#0D9488] shadow-lg shadow-[#14B8A6]/20"
          >
            {(isPending || isConfirming) ? (
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                <span>Minting...</span>
              </div>
            ) : (
              'Mint USDC'
            )}
          </Button>

          {hash && (
            <a 
              href={`https://testnet.bscscan.com/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-center text-gray-400 dark:text-gray-500 hover:text-[#14B8A6] transition-colors truncate px-4"
            >
              View Transaction: {hash}
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

