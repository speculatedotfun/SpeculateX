'use client';

import { useState, useEffect } from 'react';
import { getNetwork, setNetwork, type Network } from '@/lib/contracts';
import { useAccount, useSwitchChain } from 'wagmi';
import { MAINNET_CHAIN_ID, TESTNET_CHAIN_ID } from '@/lib/contracts';
import { Check, ChevronDown } from 'lucide-react';

export default function NetworkSelector() {
  const [currentNetwork, setCurrentNetwork] = useState<Network>('testnet');
  const [isOpen, setIsOpen] = useState(false);
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    setCurrentNetwork(getNetwork());
  }, []);

  const handleNetworkChange = (network: Network) => {
    if (network === currentNetwork) {
      setIsOpen(false);
      return;
    }

    const targetChainId = network === 'mainnet' ? MAINNET_CHAIN_ID : TESTNET_CHAIN_ID;
    
    // Switch chain if wallet is connected
    if (chain && chain.id !== targetChainId && switchChain) {
      switchChain({ chainId: targetChainId });
    }

    // Update network in localStorage and reload
    setNetwork(network);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        type="button"
      >
        <span className="text-sm font-medium whitespace-nowrap">
          {currentNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden min-w-[140px]">
            <button
              onClick={() => handleNetworkChange('testnet')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ${
                currentNetwork === 'testnet' ? 'bg-gray-50 dark:bg-gray-700' : ''
              }`}
              type="button"
            >
              <span>Testnet</span>
              {currentNetwork === 'testnet' && (
                <Check className="w-4 h-4 text-[#14B8A6]" />
              )}
            </button>
            <button
              onClick={() => handleNetworkChange('mainnet')}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ${
                currentNetwork === 'mainnet' ? 'bg-gray-50 dark:bg-gray-700' : ''
              }`}
              type="button"
            >
              <span>Mainnet</span>
              {currentNetwork === 'mainnet' && (
                <Check className="w-4 h-4 text-[#14B8A6]" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}


