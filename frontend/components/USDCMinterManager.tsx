'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { addresses } from '@/lib/contracts';
import { usdcAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ShieldCheck, Plus, Trash2, Key } from 'lucide-react';

export default function USDCMinterManager() {
  const { address } = useAccount();
  const { pushToast } = useToast();
  const [newMinterAddress, setNewMinterAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (address) {
        const adminStatus = await checkIsAdmin(address);
        setIsAdmin(adminStatus);
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
    const { data: isMinterData } = useReadContract({
      address: addresses.usdc,
      abi: usdcAbi,
      functionName: 'minters',
      args: [addressToCheck as `0x${string}`],
      query: { enabled: !!addressToCheck },
    });

    const isMinter = Boolean(isMinterData);

    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isMinter ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
            <Key className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{addressToCheck.slice(0, 6)}...{addressToCheck.slice(-4)}</p>
            <p className={`text-xs font-medium ${isMinter ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {isMinter ? 'Active Minter' : 'No Permissions'}
            </p>
          </div>
        </div>
        {isMinter && (
          <Button
            onClick={() => handleRemoveMinter(addressToCheck)}
            disabled={isRemoving || isConfirmingRemove}
            variant="destructive"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
            <p className="font-bold">Minter Permissions</p>
            <p className="opacity-80 leading-relaxed">
              Minters can generate new MockUSDC tokens. Ensure only trusted addresses (like the Faucet or Admin) have this role.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">Grant Permission</label>
          <div className="flex gap-3">
            <Input
              value={newMinterAddress}
              onChange={(e) => setNewMinterAddress(e.target.value)}
              placeholder="0x..."
              className="font-mono"
            />
            <Button
              onClick={handleAddMinter}
              disabled={isAdding || isConfirmingAdd || !newMinterAddress}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Status Check</h4>
          <MinterChecker addressToCheck={addresses.admin} />
          {newMinterAddress && newMinterAddress !== addresses.admin && (
            <MinterChecker addressToCheck={newMinterAddress} />
          )}
        </div>
      </div>
    </div>
  );
}