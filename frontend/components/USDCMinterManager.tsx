'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { addresses } from '@/lib/contracts';
import { usdcAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export default function USDCMinterManager() {
  const { address } = useAccount();
  const { pushToast } = useToast();
  const [newMinterAddress, setNewMinterAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (address) {
        const adminStatus = await checkIsAdmin(address);
        setIsAdmin(adminStatus);
      }
    };
    checkAdminStatus();
  }, [address]);

  // Write contract for adding minter
  const { 
    data: addHash, 
    writeContract: addMinter, 
    isPending: isAdding,
    error: addError
  } = useWriteContract();
  
  const { isLoading: isConfirmingAdd, isSuccess: isAddSuccess } = useWaitForTransactionReceipt({ 
    hash: addHash 
  });

  // Write contract for removing minter
  const { 
    data: removeHash, 
    writeContract: removeMinter, 
    isPending: isRemoving,
    error: removeError
  } = useWriteContract();
  
  const { isLoading: isConfirmingRemove, isSuccess: isRemoveSuccess } = useWaitForTransactionReceipt({ 
    hash: removeHash 
  });

  // Check if an address is a minter
  const checkMinterStatus = async (minterAddress: string) => {
    try {
      const result = await fetch(`/api/check-minter?address=${minterAddress}`);
      // For now, we'll just show the UI without checking
      return false;
    } catch {
      return false;
    }
  };

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
      pushToast({ title: 'Invalid Address', description: 'Please enter a valid Ethereum address (0x...)', type: 'error' });
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
      console.error('Error adding minter:', error);
      pushToast({ title: 'Error', description: `Failed to add minter: ${error?.message || 'Unknown error'}`, type: 'error' });
    }
  };

  const handleRemoveMinter = async (minterAddress: string) => {
    if (!confirm(`Are you sure you want to remove minter ${minterAddress}?`)) {
      return;
    }

    try {
      await removeMinter({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'removeMinter',
        args: [minterAddress as `0x${string}`],
      });
    } catch (error: any) {
      console.error('Error removing minter:', error);
      pushToast({ title: 'Error', description: `Failed to remove minter: ${error?.message || 'Unknown error'}`, type: 'error' });
    }
  };

  // Check if a specific address is a minter
  const MinterChecker = ({ addressToCheck }: { addressToCheck: string }) => {
    const { data: isMinterData } = useReadContract({
      address: addresses.usdc,
      abi: usdcAbi,
      functionName: 'minters',
      args: [addressToCheck as `0x${string}`],
      query: {
        enabled: !!addressToCheck && addressToCheck.startsWith('0x'),
      },
    });

    const isMinter: boolean = Boolean(isMinterData);

    return (
      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100 mb-2">
        <div>
          <p className="text-sm font-medium text-purple-900">{addressToCheck}</p>
          <p className="text-xs text-purple-600">
            {isMinter ? 'Has minting permissions' : 'No minting permissions'}
          </p>
        </div>
        {isMinter ? (
          <Button
            onClick={() => handleRemoveMinter(addressToCheck)}
            disabled={isRemoving || isConfirmingRemove}
            variant="destructive"
            size="sm"
            className="h-8"
          >
            Remove
          </Button>
        ) : null}
      </div>
    );
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>USDC Minter Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">About Minters</h4>
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2 border border-gray-100">
            <p>Minters can mint USDC tokens directly. There are two ways to grant minting permissions:</p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li><strong>Add as Minter:</strong> Grant direct minting permissions (requires MockUSDC owner)</li>
              <li><strong>SpeculateCore Admin:</strong> Admins from SpeculateCore can mint if SpeculateCore address is set on MockUSDC</li>
            </ul>
            <p className="text-gray-500 italic">Note: Only the owner of MockUSDC can add/remove minters.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New Minter
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                value={newMinterAddress}
                onChange={(e) => setNewMinterAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1"
              />
              <Button
                onClick={handleAddMinter}
                disabled={isAdding || isConfirmingAdd || !newMinterAddress}
                className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
              >
                {(isAdding || isConfirmingAdd) ? 'Adding...' : 'Add Minter'}
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Enter the Ethereum address to grant minting permissions on MockUSDC
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Check Minter Status</h4>
            <MinterChecker addressToCheck={addresses.admin} />
            {newMinterAddress && newMinterAddress !== addresses.admin && (
              <MinterChecker addressToCheck={newMinterAddress} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

