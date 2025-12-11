'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { parseUnits, keccak256, stringToBytes, decodeEventLog } from 'viem';
import { addresses } from '@/lib/contracts';
import { coreAbi, usdcAbi } from '@/lib/abis';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronDown, Info, Zap, Calendar, DollarSign, Tag, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateMarketFormProps {
  standalone?: boolean;
}

const QUESTION_TEMPLATES = [
  {
    label: 'BTC Target',
    question: 'Will Bitcoin (BTC) reach $100,000 by Dec 31, 2025?',
    category: 'Crypto',
    icon: '₿'
  },
  {
    label: 'ETH Flip',
    question: 'Will Ethereum market cap exceed Bitcoin market cap?',
    category: 'Crypto',
    icon: 'Ξ'
  },
  {
    label: 'Fed Rates',
    question: 'Will the Fed cut interest rates in the next FOMC?',
    category: 'Economics',
    icon: '🏦'
  },
  {
    label: 'SOL ATH',
    question: 'Will Solana (SOL) reach a new All-Time High in 2025?',
    category: 'Crypto',
    icon: '◎'
  },
];

export default function CreateMarketForm({ standalone = false }: CreateMarketFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Form State
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Crypto');
  const [resolutionDate, setResolutionDate] = useState('');
  const [initUsdc, setInitUsdc] = useState('1000');
  const [oracleType, setOracleType] = useState<'none' | 'chainlink'>('none');
  const [priceFeedSymbol, setPriceFeedSymbol] = useState('BTC/USD');
  const [targetValue, setTargetValue] = useState('');
  const [comparison, setComparison] = useState<'above' | 'below' | 'equals'>('above');
  
  // Token Names (Auto-generated)
  const [yesName, setYesName] = useState('');
  const [yesSymbol, setYesSymbol] = useState('');
  const [noName, setNoName] = useState('');
  const [noSymbol, setNoSymbol] = useState('');

  // Contract State
  const { data: hash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: approvalHash, writeContractAsync: writeApproveAsync, isPending: isApproving } = useWriteContract();
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalHash });

  const { data: currentAllowance } = useReadContract({
    address: addresses.usdc,
    abi: usdcAbi,
    functionName: 'allowance',
    args: address && addresses.core ? [address, addresses.core] : undefined,
    query: { enabled: !!address, refetchInterval: 2000 },
  });

  const [needsApproval, setNeedsApproval] = useState(false);

  useEffect(() => {
    if (!question) return;
    const shortId = question.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12).toUpperCase();
    setYesName(`${shortId} YES`);
    setYesSymbol(`${shortId}-Y`);
    setNoName(`${shortId} NO`);
    setNoSymbol(`${shortId}-N`);
  }, [question]);

  useEffect(() => {
    if (address && addresses.core && currentAllowance !== undefined) {
      const requiredAmount = parseUnits(initUsdc || '0', 6);
      setNeedsApproval((currentAllowance as bigint) < requiredAmount);
    }
  }, [address, currentAllowance, initUsdc]);

  const handleApprove = async () => {
    try {
      const amount = parseUnits(initUsdc || '1000', 6);
      await writeApproveAsync({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'approve',
        args: [addresses.core, amount],
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !publicClient) return;

    const initUsdcE6 = parseUnits(initUsdc, 6);
    const expiry = Math.floor(new Date(resolutionDate).getTime() / 1000);
    const targetValueBigInt = oracleType === 'chainlink' && targetValue ? parseUnits(targetValue, 8) : 0n;
    const comparisonEnum = comparison === 'above' ? 0 : comparison === 'below' ? 1 : 2;

    // Simplified oracle logic for display:
    const oracleAddress = '0x0000000000000000000000000000000000000000'; 
    const feedId = oracleType === 'chainlink' ? keccak256(stringToBytes(priceFeedSymbol)) : '0x0000000000000000000000000000000000000000000000000000000000000000';

    try {
      await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'createMarket',
        args: [question, yesName, yesSymbol, noName, noSymbol, initUsdcE6, BigInt(expiry), oracleAddress, feedId as `0x${string}`, targetValueBigInt, comparisonEnum],
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Quick Templates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUESTION_TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => { setQuestion(t.question); setCategory(t.category); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-[#14B8A6] hover:bg-[#14B8A6]/5 transition-all group"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{t.icon}</span>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{t.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1.5 block">Question</label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Will Bitcoin hit $100k?"
              className="font-medium text-lg h-14"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1.5 block">Category</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={category} onChange={(e) => setCategory(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1.5 block">Resolution Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="datetime-local" value={resolutionDate} onChange={(e) => setResolutionDate(e.target.value)} className="pl-10" required />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1.5 block">Initial Liquidity</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type="number" value={initUsdc} onChange={(e) => setInitUsdc(e.target.value)} className="pl-10 font-mono" required />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">USDC</div>
            </div>
          </div>
        </div>

        {/* Oracle Section - styled as a card */}
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-900 dark:text-white">Resolution Source</label>
            <div className="flex bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
              {(['none', 'chainlink'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOracleType(type)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    oracleType === type ? 'bg-[#14B8A6] text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {type === 'none' ? 'Manual' : 'Oracle'}
                </button>
              ))}
            </div>
          </div>

          {oracleType === 'chainlink' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-4">
                   <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Feed</label>
                   <select 
                     value={priceFeedSymbol} 
                     onChange={(e) => setPriceFeedSymbol(e.target.value)}
                     className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                   >
                     <option value="BTC/USD">BTC/USD</option>
                     <option value="ETH/USD">ETH/USD</option>
                     <option value="BNB/USD">BNB/USD</option>
                   </select>
                </div>
                
                <div className="col-span-12 sm:col-span-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Logic</label>
                  <div className="relative">
                    <select
                      value={comparison}
                      onChange={(e) => setComparison(e.target.value as 'above' | 'below' | 'equals')}
                      className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#14B8A6]/20 appearance-none"
                    >
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                      <option value="equals">Equals</option>
                    </select>
                    <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-4">
                   <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Target Price</label>
                   <Input 
                     type="number" 
                     value={targetValue} 
                     onChange={(e) => setTargetValue(e.target.value)} 
                     placeholder="50000"
                     className="h-10 text-sm font-mono"
                   />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Resolves YES if the price is <strong>{comparison}</strong> the target price at expiry.
              </p>
            </motion.div>
          )}
        </div>

        {/* Token Details Toggle/Section - Optional for advanced users, kept simple here */}
        <details className="group">
          <summary className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white">
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            Advanced Token Settings
          </summary>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
              <div className="text-xs font-bold text-green-700 dark:text-green-400 mb-2 uppercase">YES Token</div>
              <div className="space-y-2">
                <input
                  value={yesName}
                  onChange={(e) => setYesName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 dark:focus:border-green-600 text-gray-900 dark:text-white"
                />
                <input
                  value={yesSymbol}
                  onChange={(e) => setYesSymbol(e.target.value)}
                  placeholder="Symbol"
                  className="w-full bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 dark:focus:border-green-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
              <div className="text-xs font-bold text-red-700 dark:text-red-400 mb-2 uppercase">NO Token</div>
              <div className="space-y-2">
                <input
                  value={noName}
                  onChange={(e) => setNoName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 dark:focus:border-red-600 text-gray-900 dark:text-white"
                />
                <input
                  value={noSymbol}
                  onChange={(e) => setNoSymbol(e.target.value)}
                  placeholder="Symbol"
                  className="w-full bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 dark:focus:border-red-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </details>

        {needsApproval ? (
          <Button 
            type="button" 
            onClick={handleApprove} 
            disabled={isApproving || isApprovalConfirming} 
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/20"
          >
            {isApproving || isApprovalConfirming ? 'Approving...' : 'Approve USDC'}
          </Button>
        ) : (
          <Button 
            type="submit" 
            disabled={isPending || isConfirming} 
            className="w-full h-12 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#0D9488] hover:to-[#0f766e] text-white font-bold text-lg shadow-lg shadow-[#14B8A6]/20"
          >
            {isPending || isConfirming ? 'Creating...' : 'Launch Market'}
          </Button>
        )}
      </form>
    </div>
  );
}