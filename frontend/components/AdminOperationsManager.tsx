'use client';

import { useState, useMemo } from 'react';
import { Shield } from 'lucide-react';
import { useAdminOperations } from './admin/useAdminOperations';
import { OperationScheduler } from './admin/OperationScheduler';
import { TreasuryManagement } from './admin/TreasuryManagement';

type TabType = 'router' | 'treasury' | 'emergency';

export default function AdminOperationsManager() {
  const {
    isAdmin,
    hasTreasuryAccess,
    loading: opLoading,
    scheduleOperation,
  } = useAdminOperations();

  // Build available tabs based on permissions
  const availableTabs = useMemo(() => {
    const tabs: TabType[] = ['router'];
    if (hasTreasuryAccess) {
      tabs.push('treasury');
    }
    tabs.push('emergency');
    return tabs;
  }, [hasTreasuryAccess]);

  const [activeTab, setActiveTab] = useState<TabType>('router');

  // If current tab is not available (e.g., treasury removed), fall back to first available
  const effectiveTab = availableTabs.includes(activeTab) ? activeTab : availableTabs[0];

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
        {availableTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${effectiveTab === tab
              ? 'border-b-2 border-[#14B8A6] text-[#14B8A6]'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {(effectiveTab === 'router' || effectiveTab === 'emergency') && (
          <OperationScheduler
            activeTab={effectiveTab}
            loading={opLoading}
            onSchedule={scheduleOperation}
          />
        )}

        {effectiveTab === 'treasury' && hasTreasuryAccess && (
          <TreasuryManagement />
        )}
      </div>
    </div>
  );
}