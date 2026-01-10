'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAdminOperations } from './admin/useAdminOperations';
import { OperationScheduler } from './admin/OperationScheduler';
import { TreasuryManagement } from './admin/TreasuryManagement';

export default function AdminOperationsManager() {
  const [activeTab, setActiveTab] = useState<'router' | 'treasury' | 'emergency'>('router');

  const {
    isAdmin,
    loading: opLoading,
    scheduleOperation,
  } = useAdminOperations();


  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-bold text-lg">Admin access required</p>
        <p className="text-sm">Connect an authorized wallet to manage protocol operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {(['router', 'treasury', 'emergency'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${activeTab === tab
              ? 'border-b-2 border-[#14B8A6] text-[#14B8A6]'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {(activeTab === 'router' || activeTab === 'emergency') && (
          <OperationScheduler
            activeTab={activeTab}
            loading={opLoading}
            onSchedule={scheduleOperation}
          />
        )}

        {activeTab === 'treasury' && (
          <TreasuryManagement />
        )}
      </div>
    </div>
  );
}