'use client';

import { useState } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { addresses } from '@/lib/contracts';
import { coreAbi } from '@/lib/abis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Settings, RefreshCw } from 'lucide-react';

export default function SensitivityManager() {
  const { pushToast } = useToast();
  const [val, setVal] = useState('');

  const { data: sens, refetch, isLoading } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'sensitivityE18',
  });

  const { writeContract: updateSens, isPending } = useWriteContract();

  const handleUpdate = () => {
    if (!val) return;
    try {
      const e18 = parseUnits((parseFloat(val) / 100).toFixed(18), 18);
      updateSens({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'setSensitivity',
        args: [e18],
      });
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message, type: 'error' });
    }
  };

  const currentPercent = sens ? (parseFloat(formatUnits(sens as bigint, 18)) * 100).toFixed(3) : '...';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Price Sensitivity</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Adjust AMM bonding curve depth</p>
          </div>
        </div>
        <div className="text-right">
           <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current</div>
           <div className="text-xl font-mono font-bold text-[#14B8A6]">{currentPercent}%</div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Input 
            type="number" 
            value={val} 
            onChange={(e) => setVal(e.target.value)} 
            placeholder="0.5" 
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
        </div>
        <Button onClick={handleUpdate} disabled={isPending || !val} className="min-w-[100px]">
          {isPending ? 'Updating...' : 'Update'}
        </Button>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
         <span>Recommended: 0.5% - 1.0%</span>
         <button onClick={() => refetch()} className="flex items-center gap-1 hover:text-[#14B8A6] transition-colors">
           <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
         </button>
      </div>
    </div>
  );
}