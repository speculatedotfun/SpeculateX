'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { getAddresses } from '@/lib/contracts';
import { usdcAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/accessControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ShieldCheck, Plus, Trash2, Key, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function USDCMinterManager() {
  const { address } = useAccount();
  const { pushToast } = useToast();
  const [newMinterAddress, setNewMinterAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [validAddress, setValidAddress] = useState(false);

  // Get addresses for current network
  const addresses = getAddresses();

  // Real-time address validation
  useEffect(() => {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(newMinterAddress);
    setValidAddress(isValid);
  }, [newMinterAddress]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (address) {
        setIsLoadingAdmin(true);
        const adminStatus = await checkIsAdmin(address);
        setIsAdmin(adminStatus);
        setIsLoadingAdmin(false);
      } else {
        setIsLoadingAdmin(false);
      }
    };
    checkAdminStatus();
  }, [address]);

  const { data: addHash, writeContract: addMinter, isPending: isAdding } = useWriteContract();
  const { isLoading: isConfirmingAdd, isSuccess: isAddSuccess } = useWaitForTransactionReceipt({ hash: addHash });

  const { data: removeHash, writeContract: removeMinter, isPending: isRemoving } = useWriteContract();
  const { isLoading: isConfirmingRemove, isSuccess: isRemoveSuccess } = useWaitForTransactionReceipt({ hash: removeHash });

  useEffect(() => {
    if (isAddSuccess) {
      pushToast({ title: 'Success', description: 'Minter added successfully!', type: 'success' });
      setNewMinterAddress('');
    }
  }, [isAddSuccess, pushToast]);

  useEffect(() => {
    if (isRemoveSuccess) {
      pushToast({ title: 'Success', description: 'Minter removed successfully!', type: 'success' });
    }
  }, [isRemoveSuccess, pushToast]);

  const handleAddMinter = async () => {
    if (!newMinterAddress || !newMinterAddress.startsWith('0x') || newMinterAddress.length !== 42) {
      pushToast({ title: 'Invalid Address', description: 'Please enter a valid Ethereum address', type: 'error' });
      return;
    }
    try {
      await addMinter({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'addMinter',
        args: [newMinterAddress as `0x${string}`],
      });
    } catch (error: any) {
      pushToast({ title: 'Error', description: error?.message || 'Failed to add minter', type: 'error' });
    }
  };

  const handleRemoveMinter = async (minterAddress: string) => {
    if (!confirm(`Remove minter ${minterAddress}?`)) return;
    try {
      await removeMinter({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'removeMinter',
        args: [minterAddress as `0x${string}`],
      });
    } catch (error: any) {
      pushToast({ title: 'Error', description: error?.message || 'Failed to remove minter', type: 'error' });
    }
  };

  const MinterChecker = ({ addressToCheck }: { addressToCheck: string }) => {
    const { data: isMinterData, isLoading: isCheckingMinter } = useReadContract({
      address: addresses.usdc,
      abi: usdcAbi,
      functionName: 'minters',
      args: [addressToCheck as `0x${string}`],
      query: { enabled: !!addressToCheck },
    });

    const isMinter = Boolean(isMinterData);

    return (
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isMinter ? 'bg-green-100 dark:bg-green-400/10 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
            {isCheckingMinter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-200 font-mono">{addressToCheck.slice(0, 6)}...{addressToCheck.slice(-4)}</p>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
              {isCheckingMinter ? 'Checking...' : isMinter ? 'Active Minter' : 'No Access'}
            </p>
          </div>
        </div>
        {isMinter && (
          <Button
            onClick={() => handleRemoveMinter(addressToCheck)}
            disabled={isRemoving || isConfirmingRemove}
            variant="destructive"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-200 dark:hover:bg-red-500/20"
          >
            {isRemoving || isConfirmingRemove ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        )}
      </div>
    );
  };

  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase ml-1">Grant Permission</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={newMinterAddress}
              onChange={(e) => setNewMinterAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono bg-white dark:bg-gray-900/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-amber-500"
            />
            <AnimatePresence>
              {validAddress && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={handleAddMinter}
            disabled={isAdding || isConfirmingAdd || !validAddress}
            className="bg-amber-600 hover:bg-amber-700 text-white min-w-[80px]"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-2">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase ml-1">Status Check</label>
        <div className="space-y-2">
          {address && <MinterChecker addressToCheck={address} />}
          {newMinterAddress && newMinterAddress !== address && validAddress && (
            <MinterChecker addressToCheck={newMinterAddress} />
          )}
        </div>
      </div>
    </div>
  );
}