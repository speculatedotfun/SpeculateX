'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
} from 'wagmi';
import { parseUnits, keccak256, stringToBytes, decodeEventLog } from 'viem';
import { addresses } from '@/lib/contracts';
import { coreAbi, usdcAbi } from '@/lib/abis';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronDown, Info } from 'lucide-react';

interface CreateMarketFormProps {
  standalone?: boolean;
}

const QUESTION_TEMPLATES = [
  {
    label: 'BTC Price Target',
    question: 'Will Bitcoin (BTC) reach $100,000 by Dec 31, 2025?',
    category: 'Crypto',
    description: 'Market resolves to YES if BTC price is strictly greater than or equal to $100,000 on the resolution date.'
  },
  {
    label: 'ETH Flippening',
    question: 'Will Ethereum (ETH) market cap exceed Bitcoin (BTC) market cap?',
    category: 'Crypto',
    description: 'Market resolves to YES if ETH market cap is greater than BTC market cap at any point before resolution.'
  },
  {
    label: 'Fed Rate Cut',
    question: 'Will the Federal Reserve cut interest rates in the next FOMC meeting?',
    category: 'Economics',
    description: 'Resolves based on the official FOMC statement.'
  },
  {
    label: 'Solana ATH',
    question: 'Will Solana (SOL) reach a new All-Time High in 2025?',
    category: 'Crypto',
    description: 'Resolves YES if SOL price exceeds $260 on major exchanges.'
  },
];

export default function CreateMarketForm({ standalone = false }: CreateMarketFormProps = { standalone: false }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Crypto');
  const [resolutionDate, setResolutionDate] = useState('');
  const [initUsdc, setInitUsdc] = useState('1000');

  const [oracleType, setOracleType] = useState<'none' | 'chainlink'>('none');
  const [priceFeedSymbol, setPriceFeedSymbol] = useState('BTC/USD');
  const [targetValue, setTargetValue] = useState('');
  const [comparison, setComparison] = useState<'above' | 'below' | 'equals'>('above');
  const [customOracle, setCustomOracle] = useState('');

  const [yesName, setYesName] = useState('');
  const [yesSymbol, setYesSymbol] = useState('');
  const [noName, setNoName] = useState('');
  const [noSymbol, setNoSymbol] = useState('');

  const { data: hash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const {
    data: approvalHash,
    writeContractAsync: writeApproveAsync,
    isPending: isApproving,
  } = useWriteContract();
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalHash });

  const { data: currentAllowance } = useReadContract({
    address: addresses.usdc,
    abi: usdcAbi,
    functionName: 'allowance',
    args: address && addresses.core ? [address, addresses.core] : undefined,
    query: {
      enabled: !!(address && addresses.usdc && addresses.core),
      refetchInterval: 4000,
    },
  });

  const { data: usdcBalance } = useReadContract({
    address: addresses.usdc,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 4000,
    },
  });

  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApprovingState, setIsApprovingState] = useState(false);

  const applyTemplate = (template: typeof QUESTION_TEMPLATES[0]) => {
    setQuestion(template.question);
    setCategory(template.category);
    setDescription(template.description);
  };

useEffect(() => {
  if (!question) return;
  const shortId = question.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16).toUpperCase();
  setYesName(prev => (prev ? prev : `${shortId} YES`));
  setYesSymbol(prev => (prev ? prev : `${shortId}-YES`));
  setNoName(prev => (prev ? prev : `${shortId} NO`));
  setNoSymbol(prev => (prev ? prev : `${shortId}-NO`));
}, [question]);

  useEffect(() => {
    if (address && addresses.core && currentAllowance !== undefined) {
      const requiredAmount = parseUnits(initUsdc || '0', 6);
      setNeedsApproval((currentAllowance as bigint) < requiredAmount);
    } else {
      setNeedsApproval(false);
    }
  }, [address, currentAllowance, initUsdc]);

  useEffect(() => {
    if (isSuccess && !isApprovingState) {
      alert('✅ Market created successfully!');
      window.location.reload();
    }
  }, [isSuccess, isApprovingState]);

  const handleApprove = async () => {
    if (!address || !addresses.core) return;
    setIsApprovingState(true);
    try {
      const amount = parseUnits(initUsdc || '1000', 6);
      const tx = await writeApproveAsync({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'approve',
        args: [addresses.core, amount],
      });
      console.log('approve transaction submitted', tx);
    } catch (err: any) {
      alert(`Approval failed: ${err.message || 'Unknown error'}`);
      setIsApprovingState(false);
    }
  };

  useEffect(() => {
    if (isApprovalSuccess) {
      setIsApprovingState(false);
      setNeedsApproval(false);
    }
  }, [isApprovalSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) return alert('Please connect your wallet');
    if (!question) return alert('Enter question');
    if (!resolutionDate) return alert('Select resolution date');
    if (needsApproval) return alert('Approve USDC first');

    const initUsdcE6 = parseUnits(initUsdc, 6);
    const expiry = Math.floor(new Date(resolutionDate).getTime() / 1000);
    const targetValueBigInt = oracleType === 'chainlink' && targetValue ? parseUnits(targetValue, 8) : 0n;
    const comparisonEnum = comparison === 'above' ? 0 : comparison === 'below' ? 1 : 2;

    const FEED_ADDRESSES: Record<string, string> = {
      'BTC/USD': '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
      'ETH/USD': '0x9326BFA02ADD2366b30bacB125260Af641031331',
      'BNB/USD': '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    };

    const oracleAddress = oracleType === 'chainlink'
      ? (customOracle || FEED_ADDRESSES[priceFeedSymbol] || '0x0000000000000000000000000000000000000000')
      : '0x0000000000000000000000000000000000000000';

    const feedId = (oracleType === 'chainlink' && priceFeedSymbol
      ? keccak256(stringToBytes(priceFeedSymbol))
      : '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`;

    try {
      console.log('Submitting createMarket with args:', {
        question,
        yesName,
        yesSymbol,
        noName,
        noSymbol,
        initUsdcE6: initUsdcE6.toString(),
        expiry,
        oracleAddress,
        priceFeedId: feedId,
        targetValue: targetValueBigInt.toString(),
        comparisonEnum,
      });
      const txHash = await writeContractAsync({
        address: addresses.core,
        abi: coreAbi,
        functionName: 'createMarket',
        args: [
          question,
          yesName,
          yesSymbol,
          noName,
          noSymbol,
          initUsdcE6,
          BigInt(expiry),
          oracleAddress,
          feedId,
          targetValueBigInt,
          comparisonEnum,
        ],
      });
      console.log('createMarket transaction submitted, hash:', txHash);

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        
        // Get block timestamp to store createdAt immediately
        if (receipt.blockNumber) {
          try {
            const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
            if (block?.timestamp) {
              // Extract market ID from MarketCreated event logs
              const marketCreatedLog = receipt.logs.find((log: any) => {
                try {
                  const decoded = decodeEventLog({
                    abi: coreAbi,
                    data: log.data,
                    topics: log.topics,
                  }) as any;
                  return decoded.eventName === 'MarketCreated';
                } catch {
                  return false;
                }
              });
              
              if (marketCreatedLog) {
                try {
                  const decoded = decodeEventLog({
                    abi: coreAbi,
                    data: marketCreatedLog.data,
                    topics: marketCreatedLog.topics,
                  }) as { eventName: string; args: Record<string, unknown> };
                  
                  if (decoded.eventName === 'MarketCreated' && decoded.args?.id) {
                    const marketId = Number(decoded.args.id);
                    const createdAtTimestamp = Number(block.timestamp);
                    
                    // Store in localStorage for immediate access when navigating to market page
                    const storedData = {
                      marketId,
                      createdAt: createdAtTimestamp,
                      txHash: receipt.transactionHash,
                    };
                    
                    const existingMarkets = JSON.parse(
                      localStorage.getItem('newlyCreatedMarkets') || '[]'
                    );
                    const filtered = existingMarkets.filter((m: any) => m.marketId !== marketId);
                    localStorage.setItem(
                      'newlyCreatedMarkets',
                      JSON.stringify([...filtered, storedData])
                    );
                    
                    console.log('[CreateMarket] Stored market creation timestamp:', storedData);
                  }
                } catch (error) {
                  console.warn('[CreateMarket] Failed to decode MarketCreated event:', error);
                }
              }
            }
          } catch (error) {
            console.warn('[CreateMarket] Failed to get block timestamp:', error);
          }
        }
      }
    } catch (err: any) {
      console.error('createMarket error', err);
      alert(`Failed: ${err.message || 'Unknown error'}`);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Quick Templates */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quick Start</label>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => applyTemplate(template)}
              className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-[#14B8A6] rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-all shadow-sm active:scale-95"
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-bold text-gray-900 dark:text-white block mb-2">Question</label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Will Bitcoin hit $100k by 2025?"
            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 focus:border-[#14B8A6] focus:bg-white dark:focus:bg-gray-700 rounded-2xl px-4 py-4 font-medium text-gray-900 dark:text-white outline-none transition-all"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-bold text-gray-900 dark:text-white block mb-2">Category</label>
            <div className="relative">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Crypto"
                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 focus:border-[#14B8A6] focus:bg-white dark:focus:bg-gray-700 rounded-2xl px-4 py-3 font-medium text-gray-900 dark:text-white outline-none transition-all"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-bold text-gray-900 dark:text-white block mb-2">Resolution Date</label>
            <input
              type="datetime-local"
              value={resolutionDate}
              onChange={(e) => setResolutionDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 focus:border-[#14B8A6] focus:bg-white dark:focus:bg-gray-700 rounded-2xl px-4 py-3 font-medium text-gray-900 dark:text-white outline-none transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-900 dark:text-white block mb-2">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add specific resolution criteria..."
            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 focus:border-[#14B8A6] focus:bg-white dark:focus:bg-gray-700 rounded-2xl px-4 py-3 font-medium text-gray-900 dark:text-white outline-none transition-all min-h-[100px]"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-gray-900 dark:text-white block mb-2">Initial Liquidity (USDC)</label>
          <div className="relative">
            <input
              type="number"
              value={initUsdc}
              onChange={(e) => setInitUsdc(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 focus:border-[#14B8A6] focus:bg-white dark:focus:bg-gray-700 rounded-2xl px-4 py-4 font-medium text-gray-900 dark:text-white outline-none transition-all pr-16"
              required
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">USDC</div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Higher liquidity reduces price slippage for early traders.
          </p>
        </div>
      </div>

      <div className="bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 space-y-4">
        <label className="text-sm font-bold text-gray-900 dark:text-white block">Resolution Mechanism</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            oracleType === 'none' 
              ? 'border-[#14B8A6] bg-[#14B8A6]/5 dark:bg-[#14B8A6]/10' 
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
          }`}>
            <input
              type="radio"
              name="oracleType"
              value="none"
              checked={oracleType === 'none'}
              onChange={() => setOracleType('none')}
              className="text-[#14B8A6] focus:ring-[#14B8A6]"
            />
            <div>
              <div className="font-bold text-sm text-gray-900 dark:text-white">Manual</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Admin resolves</div>
            </div>
          </label>
          <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            oracleType === 'chainlink' 
              ? 'border-[#14B8A6] bg-[#14B8A6]/5 dark:bg-[#14B8A6]/10' 
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
          }`}>
            <input
              type="radio"
              name="oracleType"
              value="chainlink"
              checked={oracleType === 'chainlink'}
              onChange={() => setOracleType('chainlink')}
              className="text-[#14B8A6] focus:ring-[#14B8A6]"
            />
            <div>
              <div className="font-bold text-sm text-gray-900 dark:text-white">Chainlink Oracle</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Automated price feed</div>
            </div>
          </label>
        </div>

        {oracleType === 'chainlink' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-4 space-y-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Price Feed</label>
              <div className="relative">
                <select
                  value={priceFeedSymbol}
                  onChange={(e) => setPriceFeedSymbol(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-medium text-gray-900 dark:text-white outline-none focus:border-[#14B8A6] appearance-none"
                >
                  <option value="BTC/USD">BTC/USD</option>
                  <option value="ETH/USD">ETH/USD</option>
                  <option value="BNB/USD">BNB/USD</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Target Price</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="50000"
                  className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-medium text-gray-900 dark:text-white outline-none focus:border-[#14B8A6]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Comparison</label>
                <div className="relative">
                  <select
                    value={comparison}
                    onChange={(e) => setComparison(e.target.value as 'above' | 'below' | 'equals')}
                    className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-medium text-gray-900 dark:text-white outline-none focus:border-[#14B8A6] appearance-none"
                  >
                    <option value="above">Above Target</option>
                    <option value="below">Below Target</option>
                    <option value="equals">Equals Target</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>
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
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center"
        >
          <AlertCircle className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto mb-2" />
          <h4 className="font-bold text-amber-900 dark:text-amber-200 mb-1">Approval Required</h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">You need to approve USDC usage to fund the initial liquidity.</p>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving || isApprovalConfirming}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isApproving || isApprovalConfirming ? 'Approving...' : 'Approve USDC'}
          </button>
        </motion.div>
      ) : (
        <button
          type="submit"
          disabled={isPending || isConfirming || needsApproval}
          className="w-full py-4 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#0D9488] hover:to-[#0f766e] text-white font-black text-lg rounded-2xl shadow-xl shadow-[#14B8A6]/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:transform-none"
        >
          {isPending || isConfirming ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              Creating Market...
            </span>
          ) : (
            'Create Market'
          )}
        </button>
      )}
    </form>
  );

  if (standalone) {
    return (
      <div className="min-h-screen bg-[#FAF9FF] dark:bg-[#0f172a] relative overflow-hidden py-12">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-br from-[#14B8A6]/10 to-purple-400/10 dark:from-[#14B8A6]/5 dark:to-purple-400/5 rounded-full blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-[#14B8A6]/10 dark:from-blue-400/5 dark:to-[#14B8A6]/5 rounded-full blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <Link href="/" className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-[#14B8A6] font-bold mb-8 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Home
          </Link>
          <div className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-[#0f0a2e] dark:text-white mb-2">Create Market</h1>
              <p className="text-gray-500 dark:text-gray-400">Launch a new prediction market with custom parameters.</p>
            </div>
            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">{formContent}</div>;
}
