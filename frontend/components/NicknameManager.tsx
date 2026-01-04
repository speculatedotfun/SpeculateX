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
      <div className="p-4 text-center text-gray-500 text-sm">
        Connect your wallet to set a nickname
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
    }, 300);
  };

  const handleRemove = () => {
    setInputValue('');
    removeNickname(address);
    if (onClose) onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
          <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Set Nickname</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose a name to display instead of your wallet address
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
            Your Wallet Address
          </label>
          <div className="font-mono text-sm text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            {address}
          </div>
        </div>

        <div>
          <label htmlFor="nickname-input" className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
            Nickname
          </label>
          <Input
            id="nickname-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your nickname"
            maxLength={20}
            className="font-medium"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              }
            }}
          />
          <p className="text-xs text-gray-400 mt-1">
            This will be displayed in leaderboard, live trades, and chat
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
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
                Save
              </>
            )}
          </Button>
          {currentNickname && (
            <Button
              onClick={handleRemove}
              variant="outline"
              className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

