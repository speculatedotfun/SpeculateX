'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { getAddresses } from '@/lib/contracts';
import { usdcAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        role="article"
        aria-label={`Minter status for ${addressToCheck}`}
      >
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`p-2 rounded-xl shadow-sm transition-colors ${isMinter ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}
          >
            {isCheckingMinter ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Key className="w-4 h-4" aria-hidden="true" />
            )}
          </motion.div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{addressToCheck.slice(0, 6)}...{addressToCheck.slice(-4)}</p>
            <p className={`text-xs font-medium flex items-center gap-1 ${isMinter ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {isCheckingMinter ? (
                'Checking...'
              ) : isMinter ? (
                <>
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Active Minter
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" aria-hidden="true" /> No Permissions
                </>
              )}
            </p>
          </div>
        </div>
        {isMinter && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => handleRemoveMinter(addressToCheck)}
              disabled={isRemoving || isConfirmingRemove}
              variant="destructive"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Remove minter permissions from ${addressToCheck}`}
            >
              {isRemoving || isConfirmingRemove ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              )}
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  };

  if (isLoadingAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-12"
      >
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" aria-hidden="true" />
        <span className="ml-3 text-sm font-medium text-gray-600 dark:text-gray-400" role="status">Checking admin access...</span>
      </motion.div>
    );
  }

  if (!isAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 shadow-sm"
        role="region"
        aria-label="Minter permissions information"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
            <p className="font-bold mb-1">Minter Permissions</p>
            <p className="opacity-80 leading-relaxed">
              Minters can generate new MockUSDC tokens. Ensure only trusted addresses (like the Faucet or Admin) have this role.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label htmlFor="minter-address" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">Grant Permission</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                id="minter-address"
                value={newMinterAddress}
                onChange={(e) => setNewMinterAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono pr-10"
                aria-label="Minter Ethereum address"
                aria-invalid={newMinterAddress.length > 0 && !validAddress}
                aria-describedby={newMinterAddress.length > 0 && !validAddress ? "minter-address-error" : undefined}
              />
              <AnimatePresence>
                {validAddress && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button
              onClick={handleAddMinter}
              disabled={isAdding || isConfirmingAdd || !validAddress}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add minter permissions"
            >
              {isAdding || isConfirmingAdd ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  {isAdding ? 'Adding...' : 'Confirming...'}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                  Add
                </>
              )}
            </Button>
          </div>
          {newMinterAddress.length > 0 && !validAddress && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              id="minter-address-error"
              className="text-xs text-red-600 dark:text-red-400 mt-1.5 ml-1"
              role="alert"
            >
              Invalid Ethereum address format
            </motion.p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3"
        >
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Status Check</h4>
          <AnimatePresence mode="popLayout">
            {address && (
              <MinterChecker key={address} addressToCheck={address} />
            )}
            {newMinterAddress && newMinterAddress !== address && validAddress && (
              <MinterChecker key={newMinterAddress} addressToCheck={newMinterAddress} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}