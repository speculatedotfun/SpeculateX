'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useNicknames } from '@/lib/hooks/useNicknames';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NicknameManagerProps {
  onClose?: () => void;
}

export function NicknameManager({ onClose }: NicknameManagerProps) {
  const { address } = useAccount();
  const { getNickname, setNickname, removeNickname } = useNicknames();
  const [inputValue, setInputValue] = useState(getNickname(address || '') || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!address) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
          <User className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-900 dark:text-gray-200 font-medium">Wallet not connected</p>
        <p className="text-sm text-gray-500 mt-1">Please connect your wallet to set a nickname.</p>
      </div>
    );
  }

  const currentNickname = getNickname(address);

  const handleSave = () => {
    setIsSaving(true);
    if (inputValue.trim()) {
      setNickname(address, inputValue.trim());
    } else {
      removeNickname(address);
    }
    setTimeout(() => {
      setIsSaving(false);
      if (onClose) onClose();
    }, 500);
  };

  const handleRemove = () => {
    setInputValue('');
    removeNickname(address);
    if (onClose) onClose();
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Wallet Address Display */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Connected Wallet
          </label>
          <div className="font-mono text-sm text-gray-600 dark:text-gray-300 break-all">
            {address}
          </div>
        </div>

        {/* Input Field */}
        <div className="space-y-2">
          <label htmlFor="nickname-input" className="text-sm font-bold text-gray-700 dark:text-gray-200">
            Choose a Nickname
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 font-bold text-lg">@</span>
            </div>
            <Input
              id="nickname-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="username"
              maxLength={20}
              className="pl-9 h-12 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-teal-500 focus:ring-teal-500 text-lg transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-gray-400">
              {inputValue.length}/20
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This name will appear on the leaderboard and trade history.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-11 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/20 transition-all font-bold text-base"
          >
            {isSaving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Nickname
              </>
            )}
          </Button>

          {currentNickname && (
            <Button
              onClick={handleRemove}
              variant="outline"
              className="h-11 px-4 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

