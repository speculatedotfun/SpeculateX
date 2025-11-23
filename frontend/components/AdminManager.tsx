'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { addresses } from '@/lib/contracts';
import { coreAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export default function AdminManager() {
  const { address } = useAccount();
  const { pushToast } = useToast();
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdmins, setCurrentAdmins] = useState<string[]>([]);
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

  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

  const { data: marketCreatorRoleId } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'MARKET_CREATOR_ROLE',
  });

  const { data: deployerHasRole } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'hasRole',
    args: [DEFAULT_ADMIN_ROLE as `0x${string}`, addresses.admin],
  });

  const {
    data: addHash,
    writeContract: addAdmin,
    isPending: isAdding,
  } = useWriteContract();

  const {
    data: grantHash,
    writeContract: grantRole,
    isPending: isGranting,
  } = useWriteContract();

  const { isLoading: isConfirmingAdd, isSuccess: isAddSuccess } = useWaitForTransactionReceipt({
    hash: addHash,
  });

  const { isLoading: isConfirmingGrant, isSuccess: isGrantSuccess } = useWaitForTransactionReceipt({
    hash: grantHash,
  });

  const {
    data: removeHash,
    writeContract: removeAdmin,
    isPending: isRemoving,
  } = useWriteContract();

  const { isLoading: isConfirmingRemove, isSuccess: isRemoveSuccess } = useWaitForTransactionReceipt({
    hash: removeHash,
  });

  useEffect(() => {
    const loadAdmins = async () => {
      setLoading(true);
      try {
        const adminsList: string[] = [];
        if (deployerHasRole) {
          adminsList.push(addresses.admin.toLowerCase());
        }
        setCurrentAdmins(adminsList);
      } catch (error) {
        console.error('Error loading admins:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdmins();
  }, [deployerHasRole, isAddSuccess, isRemoveSuccess, isGrantSuccess]);

  useEffect(() => {
    if (isAddSuccess && newAdminAddress && marketCreatorRoleId) {
      grantRole({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'grantRole',
        args: [marketCreatorRoleId as `0x${string}`, newAdminAddress as `0x${string}`],
      });
    }
  }, [isAddSuccess, newAdminAddress, grantRole, marketCreatorRoleId]);

  useEffect(() => {
    if (isAddSuccess && (isGrantSuccess || !isGranting)) {
      pushToast({ title: 'Success', description: 'Admin added successfully! They can now create markets.', type: 'success' });
      setNewAdminAddress('');
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  }, [isAddSuccess, isGrantSuccess, isGranting, pushToast]);

  useEffect(() => {
    if (isRemoveSuccess) {
      pushToast({ title: 'Success', description: 'Admin removed successfully!', type: 'success' });
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  }, [isRemoveSuccess, pushToast]);

  const handleAddAdmin = async () => {
    if (!newAdminAddress || !newAdminAddress.startsWith('0x') || newAdminAddress.length !== 42) {
      pushToast({ title: 'Invalid Address', description: 'Please enter a valid Ethereum address (0x...)', type: 'error' });
      return;
    }

    try {
      await addAdmin({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'grantRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, newAdminAddress as `0x${string}`],
      });
    } catch (error: any) {
      console.error('Error adding admin:', error);
      pushToast({ title: 'Error', description: `Failed to add admin: ${error?.message || 'Unknown error'}`, type: 'error' });
    }
  };

  const handleRemoveAdmin = async (adminToRemove: string) => {
    if (!confirm(`Are you sure you want to remove admin ${adminToRemove}?`)) {
      return;
    }

    try {
      await removeAdmin({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'revokeRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, adminToRemove as `0x${string}`],
      });
    } catch (error: any) {
      console.error('Error removing admin:', error);
      pushToast({ title: 'Error', description: `Failed to remove admin: ${error?.message || 'Unknown error'}`, type: 'error' });
    }
  };

  if (!isAdmin) {
    return null;
  }

  const disableAdd = isAdding || isConfirmingAdd || isGranting || isConfirmingGrant;
  const disableRemove = isRemoving || isConfirmingRemove;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Current Admins</h4>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading admins...</p>
          ) : (
            <div className="space-y-2">
              {currentAdmins.length > 0 ? (
                currentAdmins.map((admin, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        {admin}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Has DEFAULT_ADMIN_ROLE</p>
                    </div>
                    <Button
                      onClick={() => handleRemoveAdmin(admin)}
                      disabled={disableRemove}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No admins found. The deployer address retains admin rights.</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add New Admin</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              value={newAdminAddress}
              onChange={(e) => setNewAdminAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1"
            />
            <Button
              onClick={handleAddAdmin}
              disabled={disableAdd || !marketCreatorRoleId}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {disableAdd ? 'Granting...' : 'Grant Admin & Creator'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

