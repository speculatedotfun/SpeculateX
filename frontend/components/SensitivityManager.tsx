'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { addresses } from '@/lib/contracts';
import { coreAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export default function SensitivityManager() {
  const { address } = useAccount();
  const { pushToast } = useToast();
  const [newSensitivity, setNewSensitivity] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Read current sensitivity
  const { 
    data: currentSensitivityE18, 
    refetch: refetchSensitivity,
    error: readError,
    isLoading: isLoadingSensitivity,
    isError: isReadError
  } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'sensitivityE18',
    query: {
      enabled: !!addresses.core,
      refetchInterval: false, // Disable auto-refresh if it keeps failing
      retry: false, // Don't retry on error
    },
  });

  // Debug logging
  useEffect(() => {
    console.log('Sensitivity read state:', {
      address: addresses.core,
      isLoading: isLoadingSensitivity,
      data: currentSensitivityE18,
      error: readError,
      isError: isReadError,
    });
  }, [currentSensitivityE18, isLoadingSensitivity, readError, isReadError]);

  // Write contract for updating sensitivity
  const { 
    data: hash, 
    writeContract, 
    isPending,
    error: writeError
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: isTxError } = useWaitForTransactionReceipt({ hash });

  // Convert E18 to percentage for display
  const currentSensitivityPercent = useMemo(() => {
    if (isLoadingSensitivity) return 'Loading...';
    if (isReadError || readError) return 'Error';
    if (currentSensitivityE18 === undefined || currentSensitivityE18 === null) return '0';
    
    try {
      // Handle both bigint and string/number formats
      const value = typeof currentSensitivityE18 === 'bigint' 
        ? currentSensitivityE18 
        : BigInt(String(currentSensitivityE18));
      const percent = parseFloat(formatUnits(value, 18)) * 100;
      return percent.toFixed(3);
    } catch (error) {
      console.error('Error formatting sensitivity:', error, currentSensitivityE18);
      return 'Error';
    }
  }, [currentSensitivityE18, isLoadingSensitivity, isReadError, readError]);

  useEffect(() => {
    if (isSuccess && isUpdating) {
      setIsUpdating(false);
      setNewSensitivity('');
      setTimeout(() => refetchSensitivity(), 2000);
      pushToast({ title: 'Success', description: 'Sensitivity updated successfully!', type: 'success' });
    }
    if (isTxError || writeError) {
      setIsUpdating(false);
      console.error('Transaction error:', writeError || isTxError);
      pushToast({ title: 'Error', description: `Transaction failed: ${writeError?.message || 'Unknown error'}. Check console for details.`, type: 'error' });
    }
  }, [isSuccess, isTxError, writeError, isUpdating, refetchSensitivity, pushToast]);

  const handleUpdate = async () => {
    if (!newSensitivity || parseFloat(newSensitivity) <= 0) {
      pushToast({ title: 'Invalid Value', description: 'Please enter a valid sensitivity value', type: 'warning' });
      return;
    }

    const sensitivityPercent = parseFloat(newSensitivity);
    
    // Validate range: 0.1% to 5%
    if (sensitivityPercent < 0.1 || sensitivityPercent > 5) {
      pushToast({ title: 'Range Error', description: 'Sensitivity must be between 0.1% and 5%', type: 'warning' });
      return;
    }

    // Convert percentage to E18 (e.g., 0.5% = 0.005 = 5e15)
    // Use 18 decimals to match the contract's E18 format
    const sensitivityDecimal = sensitivityPercent / 100; // 0.5% -> 0.005
    const sensitivityE18 = parseUnits(sensitivityDecimal.toFixed(18), 18);

    console.log('Updating sensitivity:', {
      percent: sensitivityPercent,
      decimal: sensitivityDecimal,
      e18: sensitivityE18.toString(),
    });

    try {
      setIsUpdating(true);
      await writeContract({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'setSensitivity',
        args: [sensitivityE18],
      });
    } catch (error: any) {
      console.error('Error updating sensitivity:', error);
      setIsUpdating(false);
      pushToast({ title: 'Update Failed', description: `Failed to update sensitivity: ${error?.message || 'Unknown error'}. Check console for details.`, type: 'error' });
    }
  };

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

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Sensitivity Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-800">
              <strong>Current Sensitivity:</strong> {currentSensitivityPercent}%
            </p>
            <Button
              onClick={() => {
                console.log('Manual refresh triggered');
                refetchSensitivity();
              }}
              disabled={isLoadingSensitivity}
              variant="outline"
              size="sm"
              className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-100 bg-white"
            >
              {isLoadingSensitivity ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          {(readError || isReadError) && (
            <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded-lg border border-red-100">
              <p className="font-semibold mb-1">⚠️ Sensitivity function not available</p>
              <p className="mb-1">The contract at {addresses.core} is reverting when calling <code>sensitivityE18()</code>.</p>
              <p className="mb-1">This could mean:</p>
              <ul className="list-disc list-inside ml-2 mb-1">
                <li>The contract was deployed from an older version of DirectCore</li>
                <li>The contract needs to be recompiled and redeployed with the latest code</li>
              </ul>
              <p className="text-xs mt-1">Error: {readError?.message || 'Function reverting'}</p>
              <p className="text-xs mt-1">Function selector: 0x85e00ca4</p>
            </div>
          )}
          {currentSensitivityE18 !== undefined && currentSensitivityE18 !== null && (
            <p className="text-xs text-blue-600 mb-1 font-mono">
              Raw value: {String(currentSensitivityE18)}
            </p>
          )}
          <p className="text-xs text-blue-600 mt-2">
            Lower sensitivity = less price movement per trade = more symmetric round-trips (less leftover vault)
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Range: 0.1% to 5.0% (recommended: 0.5% - 1.0%)
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Sensitivity (%)
            </label>
            <Input
              type="number"
              value={newSensitivity}
              onChange={(e) => setNewSensitivity(e.target.value)}
              min="0.1"
              max="5"
              step="0.1"
              placeholder={currentSensitivityPercent}
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter a value between 0.1% and 5.0%
            </p>
          </div>

          <Button
            onClick={handleUpdate}
            disabled={isPending || isConfirming || isUpdating || !newSensitivity || isReadError}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
          >
            {(isPending || isConfirming || isUpdating) ? 'Updating...' : 'Update Sensitivity'}
          </Button>
          {isReadError && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Update disabled - contract doesn&apos;t support sensitivity control
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

