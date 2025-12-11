'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { addresses } from '@/lib/contracts';
import { coreAbi } from '@/lib/abis';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Shield, UserPlus, X } from 'lucide-react';

export default function AdminManager() {
  const { address } = useAccount();
  const { pushToast } = useToast();
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdmins, setCurrentAdmins] = useState<string[]>([]);
  
  // Contracts hooks... (same logic as before)
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  const { data: deployerHasRole } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'hasRole',
    args: [DEFAULT_ADMIN_ROLE as `0x${string}`, addresses.admin],
  });

  const { writeContract: addAdmin } = useWriteContract();
  const { writeContract: removeAdmin } = useWriteContract();

  // Load initial admin (mock logic, usually requires graph or events to get full list)
  useEffect(() => {
    if (deployerHasRole) setCurrentAdmins([addresses.admin]);
    checkIsAdmin(address).then(setIsAdmin);
  }, [deployerHasRole, address]);

  const handleAdd = async () => {
    if (!newAdminAddress) return;
    try {
      await addAdmin({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'grantRole',
        args: [DEFAULT_ADMIN_ROLE as `0x${string}`, newAdminAddress as `0x${string}`],
      });
      pushToast({ title: 'Success', description: 'Admin grant transaction submitted', type: 'success' });
    } catch (e: any) {
      pushToast({ title: 'Error', description: e.message, type: 'error' });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div className="text-sm text-purple-900 dark:text-purple-100">
            <p className="font-bold">Super Admin Access</p>
            <p className="opacity-80 leading-relaxed">Admins can create markets, resolve disputes, and manage other admins.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
           <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-2 block">Grant Admin Role</label>
           <div className="flex gap-3">
             <Input 
               value={newAdminAddress} 
               onChange={(e) => setNewAdminAddress(e.target.value)} 
               placeholder="0x..." 
               className="font-mono"
             />
             <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]">
               <UserPlus className="w-4 h-4 mr-2" /> Add
             </Button>
           </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Current Admins</h4>
          {currentAdmins.map((admin) => (
             <div key={admin} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                   {admin.slice(2, 4)}
                 </div>
                 <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                   {admin.slice(0, 6)}...{admin.slice(-4)}
                 </span>
               </div>
               <button className="text-gray-400 hover:text-red-500 transition-colors p-1">
                 <X className="w-4 h-4" />
               </button>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}