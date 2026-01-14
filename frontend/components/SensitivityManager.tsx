'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { useAddresses } from '@/lib/contracts';
import { coreAbi } from '@/lib/abis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Settings, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SensitivityManager() {
  const addresses = useAddresses();
  const { pushToast } = useToast();
  const [val, setVal] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const { data: sens, refetch, isLoading } = useReadContract({
    address: addresses.core,
    abi: coreAbi,
    functionName: 'sensitivityE18',
  });

  const { writeContract: updateSens, isPending } = useWriteContract();

  // Real-time validation
  useEffect(() => {
    if (!val) {
      setIsValid(false);
      setValidationMessage('');
      return;
    }

    const numVal = parseFloat(val);
    if (isNaN(numVal)) {
      setIsValid(false);
      setValidationMessage('Please enter a valid number');
      return;
    }

    if (numVal <= 0) {
      setIsValid(false);
      setValidationMessage('Sensitivity must be greater than 0');
      return;
    }

    if (numVal > 10) {
      setIsValid(false);
      setValidationMessage('Sensitivity too high (max 10%)');
      return;
    }

    if (numVal < 0.1) {
      setIsValid(false);
      setValidationMessage('Sensitivity too low (min 0.1%)');
      return;
    }

    // Check if within recommended range
    if (numVal >= 0.5 && numVal <= 1.0) {
      setIsValid(true);
      setValidationMessage('Within recommended range');
    } else if (numVal < 0.5) {
      setIsValid(true);
      setValidationMessage('Below recommended range - price may be less responsive');
    } else {
      setIsValid(true);
      setValidationMessage('Above recommended range - higher slippage expected');
    }
  }, [val]);

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
  const numCurrentPercent = sens ? parseFloat(formatUnits(sens as bigint, 18)) * 100 : 0;
  const numVal = parseFloat(val);
  const percentChange = val && !isNaN(numVal) && numCurrentPercent ? ((numVal - numCurrentPercent) / numCurrentPercent) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.3 }}
            className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg text-gray-600 dark:text-gray-300 shadow-sm"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
          </motion.div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Price Sensitivity</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Adjust AMM bonding curve depth</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Current</div>
          <motion.div
            key={currentPercent}
            initial={{ scale: 1.1, color: '#14B8A6' }}
            animate={{ scale: 1, color: 'inherit' }}
            className="text-2xl font-mono font-bold text-[#14B8A6]"
          >
            {currentPercent}%
          </motion.div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Input
              id="sensitivity-value"
              type="number"
              step="0.1"
              min="0.1"
              max="10"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="0.5"
              className={`pr-14 font-mono ${val && !isValid ? 'border-red-500 dark:border-red-400' : val && isValid ? 'border-green-500 dark:border-green-400' : ''}`}
              aria-label="New sensitivity percentage"
              aria-invalid={val.length > 0 && !isValid}
              aria-describedby={val.length > 0 ? "sensitivity-feedback" : undefined}
            />
            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-bold text-sm">%</span>
            <AnimatePresence>
              {val && isValid && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500" aria-hidden="true" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={handleUpdate}
            disabled={isPending || !val || !isValid}
            className="min-w-[100px] bg-[#14B8A6] hover:bg-[#0F9688] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Update sensitivity"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>
        </div>

        {/* Validation feedback */}
        <AnimatePresence>
          {val && validationMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id="sensitivity-feedback"
              className={`flex items-start gap-2 text-xs p-3 rounded-lg ${
                !isValid
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : numVal >= 0.5 && numVal <= 1.0
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
              }`}
              role={isValid ? 'status' : 'alert'}
            >
              {!isValid ? (
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              ) : percentChange > 0 ? (
                <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              ) : percentChange < 0 ? (
                <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              )}
              <div className="flex-1">
                <p className="font-medium">{validationMessage}</p>
                {isValid && percentChange !== 0 && (
                  <p className="text-xs opacity-80 mt-0.5">
                    {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}% change from current
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></span>
          Recommended: 0.5% - 1.0%
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => refetch()}
          className="flex items-center gap-1 hover:text-[#14B8A6] transition-colors font-medium"
          aria-label="Refresh current sensitivity value"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </motion.button>
      </div>
    </motion.div>
  );
}