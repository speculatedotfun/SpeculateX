'use client';

import { useState, useEffect, useRef } from 'react';
import { getNetwork, setNetwork, type Network } from '@/lib/contracts';
import { useAccount, useSwitchChain } from 'wagmi';
import { MAINNET_CHAIN_ID, TESTNET_CHAIN_ID } from '@/lib/contracts';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NetworkSelector() {
  const [currentNetwork, setCurrentNetwork] = useState<Network>('testnet');
  const [isOpen, setIsOpen] = useState(false);
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentNetwork(getNetwork());
  }, []);

  // Close dropdown on escape key or click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800 hover:border-teal-500/30 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 backdrop-blur-md"
        type="button"
        aria-label="Select network"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {/* Network Status Indicator */}
        <div className="relative">
          <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <span
            className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-gray-800 ${currentNetwork === 'mainnet'
                ? 'bg-green-500 shadow-lg shadow-green-500/50'
                : 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
              }`}
            aria-hidden="true"
          />
        </div>
        <span className="text-sm font-bold whitespace-nowrap text-gray-900 dark:text-white">
          <span className={currentNetwork === 'mainnet' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
            {currentNetwork === 'mainnet' ? 'BSC Mainnet' : 'BSC Testnet'}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[160px]"
              role="menu"
              aria-orientation="vertical"
            >
              <button
                onClick={() => handleNetworkChange('testnet')}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 ${currentNetwork === 'testnet' ? 'bg-[#14B8A6]/5 dark:bg-[#14B8A6]/10 text-[#14B8A6]' : 'text-gray-900 dark:text-white'
                  }`}
                type="button"
                role="menuitem"
                aria-current={currentNetwork === 'testnet' ? 'true' : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" aria-hidden="true" />
                  <span className="font-medium">BSC Testnet</span>
                </div>
                {currentNetwork === 'testnet' && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", duration: 0.3 }}
                  >
                    <Check className="w-4 h-4 text-[#14B8A6]" aria-hidden="true" />
                  </motion.div>
                )}
              </button>
              <div className="h-px bg-gray-100 dark:bg-gray-700" role="separator" />
              <button
                onClick={() => handleNetworkChange('mainnet')}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 ${currentNetwork === 'mainnet' ? 'bg-[#14B8A6]/5 dark:bg-[#14B8A6]/10 text-[#14B8A6]' : 'text-gray-900 dark:text-white'
                  }`}
                type="button"
                role="menuitem"
                aria-current={currentNetwork === 'mainnet' ? 'true' : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true" />
                  <span className="font-medium">BSC Mainnet</span>
                </div>
                {currentNetwork === 'mainnet' && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", duration: 0.3 }}
                  >
                    <Check className="w-4 h-4 text-[#14B8A6]" aria-hidden="true" />
                  </motion.div>
                )}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


