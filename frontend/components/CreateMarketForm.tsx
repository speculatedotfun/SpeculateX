'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { parseUnits, keccak256, stringToBytes } from 'viem';
import { addresses, getCurrentNetwork, getNetwork, isDiamondNetwork } from '@/lib/contracts';
import { getCoreAbi, usdcAbi } from '@/lib/abis';
import { canCreateMarkets } from '@/lib/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, DollarSign, ArrowUpCircle, ArrowDownCircle, Target, Wallet, Search,
  Info, Clock, AlertCircle, CheckCircle2, Timer, ChevronRight, ChevronLeft, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useConfetti } from '@/lib/ConfettiContext';
import { cn } from '@/lib/utils';

interface CreateMarketFormProps {
  standalone?: boolean;
}

// --- Verified Chainlink Supported Assets ---
const CRYPTO_ASSETS = [
  // Majors
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '₿',
    feedId: 'BTC/USD',
    testnetFeed: '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
    mainnetFeed: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
    color: 'from-orange-400 to-orange-600'
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: 'Ξ',
    feedId: 'ETH/USD',
    testnetFeed: '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
    mainnetFeed: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
    color: 'from-blue-400 to-purple-600'
  },
  { symbol: 'SOL', name: 'Solana', icon: '◎', feedId: 'SOL/USD', color: 'from-green-400 to-teal-600' },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    icon: '🔶',
    feedId: 'BNB/USD',
    testnetFeed: '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
    mainnetFeed: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    color: 'from-yellow-400 to-yellow-600'
  },
  { symbol: 'XRP', name: 'Ripple', icon: '✕', feedId: 'XRP/USD', color: 'from-gray-400 to-gray-600' },
  { symbol: 'ADA', name: 'Cardano', icon: '₳', feedId: 'ADA/USD', color: 'from-blue-500 to-blue-700' },
  { symbol: 'AVAX', name: 'Avalanche', icon: '🔺', feedId: 'AVAX/USD', color: 'from-red-500 to-red-700' },
  { symbol: 'LINK', name: 'Chainlink', icon: '⬡', feedId: 'LINK/USD', color: 'from-blue-400 to-blue-600' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', feedId: 'DOGE/USD', color: 'from-yellow-300 to-yellow-500' },
  { symbol: 'MATIC', name: 'Polygon', icon: '💜', feedId: 'MATIC/USD', color: 'from-purple-500 to-purple-700' },
  { symbol: 'DOT', name: 'Polkadot', icon: '🟣', feedId: 'DOT/USD', color: 'from-pink-500 to-pink-700' },
];

export default function CreateMarketForm({ standalone = false }: CreateMarketFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();
  const { trigger: triggerConfetti } = useConfetti();
  const network = getNetwork();

  // --- Wizard State ---
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // --- Form State ---
  const [selectedAsset, setSelectedAsset] = useState(CRYPTO_ASSETS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = useMemo(() => {
    const base = CRYPTO_ASSETS.filter(asset =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (isDiamondNetwork(network)) {
      return network === 'testnet'
        ? base.filter((a: any) => !!a.testnetFeed)
        : base.filter((a: any) => !!a.mainnetFeed);
    }
    return base;
  }, [searchQuery, network]);

  const [comparison, setComparison] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [initUsdc, setInitUsdc] = useState('1000');
  const [hasMarketCreatorRole, setHasMarketCreatorRole] = useState<boolean | null>(null);

  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false);
  const [startDate, setStartDate] = useState('');

  // --- Validation State ---
  const [validationErrors, setValidationErrors] = useState({
    targetPrice: '',
    resolutionDate: '',
    initUsdc: '',
    startDate: '',
  });

  // --- Real-time Validation ---
  useEffect(() => {
    const errors = { targetPrice: '', resolutionDate: '', initUsdc: '', startDate: '' };

    if (targetPrice) {
      const price = parseFloat(targetPrice);
      if (isNaN(price) || price <= 0) errors.targetPrice = 'Price must be greater than 0';
      else if (price > 1e15) errors.targetPrice = 'Price is unrealistically high';
    }

    if (resolutionDate) {
      const now = new Date();
      const selected = new Date(resolutionDate);
      const minDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

      if (selected <= now) errors.resolutionDate = 'Must be in future';
      else if (selected < minDate) errors.resolutionDate = 'Min 1 hour duration';
      else if (selected > maxDate) errors.resolutionDate = 'Max 1 year duration';
    }

    if (isScheduled && startDate) {
      const now = new Date();
      const start = new Date(startDate);
      const expiry = resolutionDate ? new Date(resolutionDate) : null;
      const minTradingDuration = 60 * 60 * 1000;

      if (start <= now) errors.startDate = 'Start time must be future';
      else if (expiry && start >= expiry) errors.startDate = 'Start must be before expiry';
      else if (expiry && expiry.getTime() - start.getTime() < minTradingDuration) errors.startDate = 'Window too short (<1h)';
    }

    if (initUsdc) {
      const amount = parseFloat(initUsdc);
      if (isNaN(amount) || amount < 100) errors.initUsdc = 'Min 100 USDC';
      else if (amount > 1000000) errors.initUsdc = 'Max 1M USDC';
    }

    setValidationErrors(errors);
  }, [targetPrice, resolutionDate, initUsdc, isScheduled, startDate]);

  // --- EXACT QUESTION FORMATTING ---
  const generatedQuestion = useMemo(() => {
    if (!targetPrice || !resolutionDate) return '...';
    try {
      const dateObj = new Date(resolutionDate);
      const month = dateObj.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const day = dateObj.toLocaleString('en-US', { day: 'numeric', timeZone: 'UTC' });
      const time = dateObj.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
      const formattedPrice = Number(targetPrice).toLocaleString('en-US');
      return `Will ${selectedAsset.symbol} trade ${comparison} ${formattedPrice}$ on ${month}, ${day} at ${time} UTC?`;
    } catch { return '...'; }
  }, [selectedAsset, comparison, targetPrice, resolutionDate]);

  // --- Contract Interaction ---
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
  const { data: hash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (address && addresses.core && currentAllowance !== undefined) {
      const requiredAmount = parseUnits(initUsdc || '0', 6);
      setNeedsApproval((currentAllowance as bigint) < requiredAmount);
    }
  }, [address, currentAllowance, initUsdc]);

  useEffect(() => {
    const checkMarketCreatorRole = async () => {
      if (address) {
        const canCreate = await canCreateMarkets(address);
        setHasMarketCreatorRole(canCreate);
      } else {
        setHasMarketCreatorRole(null);
      }
    };
    checkMarketCreatorRole();
  }, [address]);

  useEffect(() => {
    if (isApprovalSuccess) {
      pushToast({ title: 'Approval Confirmed', description: 'USDC approved. You can now create the market.', type: 'success' });
    }
  }, [isApprovalSuccess, pushToast]);

  useEffect(() => {
    if (isSuccess) {
      triggerConfetti();
      pushToast({ title: 'Success', description: 'Market created successfully!', type: 'success' });
      setStep(1);
      setTargetPrice('');
      setResolutionDate('');
      setStartDate('');
      setIsScheduled(false);
      setTimeout(() => window.location.reload(), 2000);
    }
  }, [isSuccess, pushToast, triggerConfetti]);

  const handleApprove = async () => {
    try {
      const amount = parseUnits(initUsdc || '1000', 6);
      await writeApproveAsync({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'approve',
        args: [addresses.core, amount],
      });
      pushToast({ title: 'Approval Submitted', description: 'Waiting for confirmation...', type: 'info' });
    } catch (err: any) {
      console.error(err);
      pushToast({ title: 'Approval Failed', description: err?.message || 'Failed to approve USDC.', type: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!address || !publicClient) return;

    if (hasMarketCreatorRole === false) {
      pushToast({ title: 'Access Denied', description: 'Missing MARKET_CREATOR_ROLE.', type: 'error' });
      return;
    }

    try {
      const initUsdcE6 = parseUnits(initUsdc, 6);
      const expiry = Math.floor(new Date(resolutionDate).getTime() / 1000);
      const targetValueBigInt = parseUnits(targetPrice, 8);
      const comparisonEnum = comparison === 'above' ? 0 : 1;

      const oracleAddress = isDiamondNetwork(network)
        ? (network === 'testnet' ? ((selectedAsset as any).testnetFeed as `0x${string}`) : ((selectedAsset as any).mainnetFeed as `0x${string}`))
        : (process.env.NEXT_PUBLIC_CHAINLINK_RESOLVER_ADDRESS as `0x${string}`);

      if (isDiamondNetwork(network) && (!oracleAddress || oracleAddress === ('0x0000000000000000000000000000000000000000' as any))) {
        pushToast({ title: 'Unsupported Asset', description: 'No Chainlink feed for this asset on this network.', type: 'error' });
        return;
      }

      const feedId = keccak256(stringToBytes(selectedAsset.feedId));
      const dateObj = new Date(resolutionDate);
      const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      const symbolBase = `${selectedAsset.symbol}${comparison === 'above' ? 'UP' : 'DOWN'}${targetPrice}`;
      const yesName = `${selectedAsset.symbol} ${comparison === 'above' ? '>' : '<'} ${targetPrice} ${shortDate} YES`;
      const yesSymbol = `Y-${symbolBase}`;
      const noName = `${selectedAsset.symbol} ${comparison === 'above' ? '>' : '<'} ${targetPrice} ${shortDate} NO`;
      const noSymbol = `N-${symbolBase}`;

      let txHash;
      if (isScheduled && startDate) {
        const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
        txHash = await writeContractAsync({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'createScheduledMarket',
          args: [generatedQuestion, yesName, yesSymbol, noName, noSymbol, initUsdcE6, BigInt(startTimestamp), BigInt(expiry), oracleAddress, feedId as `0x${string}`, targetValueBigInt, comparisonEnum],
        });
      } else {
        txHash = await writeContractAsync({
          address: addresses.core,
          abi: getCoreAbi(getCurrentNetwork()),
          functionName: 'createMarket',
          args: [generatedQuestion, yesName, yesSymbol, noName, noSymbol, initUsdcE6, BigInt(expiry), oracleAddress, feedId as `0x${string}`, targetValueBigInt, comparisonEnum],
        });
      }

      if (txHash) pushToast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...', type: 'info' });
    } catch (err: any) {
      console.error(err);
      pushToast({ title: 'Error', description: err?.message || 'Failed to create market.', type: 'error' });
    }
  };

  const nextStep = () => {
    // Validate current step
    if (step === 2) {
      if (!targetPrice || !resolutionDate || !!validationErrors.targetPrice || !!validationErrors.resolutionDate || !!validationErrors.initUsdc || !!validationErrors.startDate) {
        pushToast({ title: 'Incomplete', description: 'Please fix validation errors before proceeding.', type: 'error' });
        return;
      }
    }
    if (step < totalSteps) setStep(step + 1);
  };
  const prevStep = () => step > 1 && setStep(step - 1);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8 px-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2 relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${step >= s
              ? 'bg-[#14B8A6] text-white shadow-[0_0_20px_rgba(20,184,166,0.5)] scale-110'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-700'
              }`}>
              {s < step ? <CheckCircle2 size={18} /> : s}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= s ? 'text-[#14B8A6]' : 'text-gray-400 dark:text-gray-600'}`}>
              {s === 1 ? 'Asset' : s === 2 ? 'Details' : 'Confirm'}
            </span>
          </div>
        ))}
        {/* Connector Line */}
        <div className="absolute left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gray-200 dark:bg-gray-800 -z-0 top-14 lg:top-[5.5rem] lg:w-[60%] lg:left-[51%]">
          <div
            className="h-full bg-gradient-to-r from-[#14B8A6] to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 custom-scrollbar min-h-[400px]">
        <AnimatePresence mode="wait">
          {/* STEP 1: ASSET SELECTION */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="sticky top-0 bg-white/80 dark:bg-[#0f1219]/80 backdrop-blur-xl z-20 pb-6 pt-2">
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors">
                    <Search size={24} />
                  </div>
                  <Input
                    placeholder="Search assets (e.g. BTC, ETH)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-16 h-20 bg-black/5 dark:bg-white/5 border-transparent focus:border-teal-500/50 rounded-2xl text-xl font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 focus:shadow-[0_0_30px_-5px_rgba(20,184,166,0.2)] transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAsset.symbol === asset.symbol;
                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset)}
                      className={`relative group flex flex-col items-center p-6 rounded-3xl border transition-all duration-300 ${isSelected
                        ? 'border-teal-500/50 bg-teal-500/10 shadow-[0_0_30px_-5px_rgba(20,184,166,0.3)] scale-[1.02]'
                        : 'border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 hover:border-teal-500/30'
                        }`}
                    >
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${asset.color || 'from-gray-700 to-gray-900'} flex items-center justify-center text-3xl shadow-lg mb-4 group-hover:scale-110 transition-transform text-white ring-1 ring-black/5`}>
                        {asset.icon}
                      </div>
                      <span className={`text-lg font-bold transition-colors ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-gray-700 dark:text-gray-200'}`}>{asset.name}</span>
                      <span className="text-sm text-gray-400 dark:text-gray-500 font-mono">{asset.symbol}</span>

                      {isSelected && (
                        <motion.div layoutId="selectedCheck" className="absolute top-4 right-4 text-teal-500">
                          <div className="bg-white dark:bg-gray-900 rounded-full p-1 shadow-md">
                            <CheckCircle2 size={20} className="fill-current" />
                          </div>
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Direction */}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 block">Prediction Direction</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setComparison('above')}
                    className={`p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all relative overflow-hidden group ${comparison === 'above'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]'
                      : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                  >
                    <div className={`p-3 rounded-full ${comparison === 'above' ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                      <ArrowUpCircle size={24} />
                    </div>
                    <span className="font-black text-lg">Above Target</span>
                  </button>
                  <button
                    onClick={() => setComparison('below')}
                    className={`p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all relative overflow-hidden group ${comparison === 'below'
                      ? 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-[0_0_20px_-5px_rgba(244,63,94,0.2)]'
                      : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                  >
                    <div className={`p-3 rounded-full ${comparison === 'below' ? 'bg-rose-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                      <ArrowDownCircle size={24} />
                    </div>
                    <span className="font-black text-lg">Below Target</span>
                  </button>
                </div>
              </div>

              {/* Target Price */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Target Price</label>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors">
                    <Target size={24} />
                  </div>
                  <Input
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="0.00"
                    className="pl-16 h-20 bg-black/5 dark:bg-white/5 border-transparent focus:border-teal-500/50 rounded-2xl text-3xl font-black font-mono text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:ring-0 focus:shadow-[0_0_30px_-5px_rgba(20,184,166,0.2)] transition-all"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">USD</div>
                </div>
                {validationErrors.targetPrice ? (
                  <p className="text-rose-500 text-xs ml-1 flex items-center gap-1 font-bold"><AlertCircle size={12} /> {validationErrors.targetPrice}</p>
                ) : (
                  <p className="text-gray-400 text-[10px] ml-1">The price level that determines the outcome.</p>
                )}
              </div>

              {/* Resolution Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Resolution Date (UTC)</label>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors">
                    <Calendar size={24} />
                  </div>
                  <Input
                    type="datetime-local"
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    className="pl-16 h-20 bg-black/5 dark:bg-white/5 border-transparent focus:border-teal-500/50 rounded-2xl text-xl font-bold font-mono text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:ring-0 focus:shadow-[0_0_30px_-5px_rgba(20,184,166,0.2)] transition-all"
                  />
                </div>
                {validationErrors.resolutionDate ? (
                  <p className="text-rose-500 text-xs ml-1 flex items-center gap-1 font-bold"><AlertCircle size={12} /> {validationErrors.resolutionDate}</p>
                ) : (
                  <p className="text-gray-400 text-[10px] ml-1">When the market will end and resolve.</p>
                )}
              </div>

              {/* Liquidity */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Initial Liquidity</label>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors">
                    <Wallet size={24} />
                  </div>
                  <Input
                    type="number"
                    value={initUsdc}
                    onChange={(e) => setInitUsdc(e.target.value)}
                    className="pl-16 h-20 bg-black/5 dark:bg-white/5 border-transparent focus:border-teal-500/50 rounded-2xl text-3xl font-black font-mono text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:ring-0 focus:shadow-[0_0_30px_-5px_rgba(20,184,166,0.2)] transition-all"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">USDC</div>
                </div>
                {validationErrors.initUsdc ? (
                  <p className="text-rose-500 text-xs ml-1 flex items-center gap-1 font-bold"><AlertCircle size={12} /> {validationErrors.initUsdc}</p>
                ) : (
                  <p className="text-gray-400 text-[10px] ml-1">Amount of USDC to seed the market with.</p>
                )}
              </div>

              {/* Schedule Toggle */}
              <div className="bg-black/5 dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                      <Clock size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Schedule Start</span>
                      <span className="text-xs text-gray-500">Start trading at a future date</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsScheduled(!isScheduled)}
                    className={`w-14 h-8 rounded-full transition-colors flex items-center p-1 ${isScheduled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${isScheduled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                {isScheduled && (
                  <div className="mt-6 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-purple-500 dark:text-purple-400 uppercase mb-2 block tracking-widest">Start Time (UTC)</label>
                    <Input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-16 bg-white dark:bg-gray-900 border-purple-500/30 rounded-xl font-mono text-lg text-gray-900 dark:text-white focus:ring-purple-500"
                    />
                    {validationErrors.startDate && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1 font-bold"><AlertCircle size={12} /> {validationErrors.startDate}</p>}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: CONFIRM */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl p-8 rounded-[32px] border border-white/20 dark:border-white/5 relative overflow-hidden text-center z-10 shadow-xl">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-white/[0.04] pointer-events-none -z-10" />

                <div className="relative z-10">
                  <div className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${selectedAsset.color} flex items-center justify-center text-5xl mb-6 shadow-2xl border-4 border-white dark:border-gray-800 text-white`}>
                    {selectedAsset.icon}
                  </div>

                  <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 leading-tight tracking-tight">
                    &quot;{generatedQuestion}&quot;
                  </h3>

                  <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                    <div className="px-4 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 flex flex-col items-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Liquidity</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-lg">{parseUnits(initUsdc, 0).toString()} USDC</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 flex flex-col items-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Resolution</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-lg">{new Date(resolutionDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {isScheduled && (
                    <div className="mt-6 inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 bg-purple-500/10 px-5 py-2.5 rounded-full text-sm font-bold border border-purple-500/20">
                      <Timer size={16} /> Starts: {new Date(startDate).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {needsApproval ? (
                <Button
                  onClick={handleApprove}
                  disabled={isApproving || isApprovalConfirming}
                  className="w-full h-20 text-xl font-black bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isApproving || isApprovalConfirming ? <span className="animate-spin mr-3">⏳</span> : <span className="mr-3">🔓</span>}
                  Approve USDC
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isPending || isConfirming}
                  className="w-full h-20 text-xl font-black bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-2xl shadow-[0_0_40px_-10px_rgba(20,184,166,0.4)] hover:shadow-[0_0_60px_-10px_rgba(20,184,166,0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isPending || isConfirming ? (
                    <>
                      <span className="animate-spin mr-3">⚡</span> Creating Market...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-3 fill-current w-6 h-6" /> Launch Market
                    </>
                  )}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-6 mt-4 border-t border-gray-200 dark:border-gray-800/50">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={prevStep}
            className="flex-1 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={16} className="mr-2" /> Back
          </Button>
        )}
        {step < totalSteps && (
          <Button
            onClick={nextStep}
            className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-bold"
          >
            Next <ChevronRight size={16} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}