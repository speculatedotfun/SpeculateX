'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { parseUnits, keccak256, stringToBytes } from 'viem';
import Image from 'next/image';
import { addresses, getCurrentNetwork, getNetwork, isDiamondNetwork } from '@/lib/contracts';
import { getCoreAbi, usdcAbi, chainlinkResolverAbiLegacy } from '@/lib/abis';
import { canCreateMarkets } from '@/lib/accessControl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, DollarSign, ArrowUpCircle, ArrowDownCircle, Target, Wallet, Search,
  Info, Clock, AlertCircle, CheckCircle2, Timer, ChevronRight, ChevronLeft, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface CreateMarketFormProps {
  standalone?: boolean;
}

import { Asset, CRYPTO_ASSETS } from '@/lib/assets';


export default function CreateMarketForm({ standalone = false }: CreateMarketFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();
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

  // Show market creation summary after page reload
  useEffect(() => {
    try {
      const lastCreation = localStorage.getItem('lastMarketCreation');
      if (lastCreation) {
        const summary = JSON.parse(lastCreation);
        console.log('📋 Last market creation summary:', summary);

        if (summary.marketCreated) {
          let feedStatusMessage = '';
          if (summary.feedRegistered === 'registered') {
            feedStatusMessage = '✅ Feed registered in Chainlink resolver';
          } else if (summary.feedRegistered === 'not_needed_diamond') {
            feedStatusMessage = 'ℹ️ Diamond network - feed address stored in market (no resolver registration needed)';
          } else if (summary.feedRegistered === 'not_needed') {
            feedStatusMessage = 'ℹ️ Feed registration not needed';
          } else {
            feedStatusMessage = '⚠️ Feed registration failed - may need manual registration';
          }

          pushToast({
            title: '✅ Market Creation Complete',
            description: `Market created successfully! ${feedStatusMessage}`,
            type: 'success'
          });

          // Clear the summary after showing
          localStorage.removeItem('lastMarketCreation');
        }
      }
    } catch (e) {
      console.error('Error reading market creation summary:', e);
    }
  }, [pushToast]);

  useEffect(() => {
    if (isApprovalSuccess) {
      pushToast({ title: 'Approval Confirmed', description: 'USDC approved. You can now create the market.', type: 'success' });
    }
  }, [isApprovalSuccess, pushToast]);

  // Removed useEffect for isSuccess - handleSubmit now handles all success/error cases
  // including checking receipt.status to ensure transaction actually succeeded

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

      // Verify that this asset has a feed on the current network
      const feedAddress = network === 'testnet' ? selectedAsset.testnetFeed : selectedAsset.mainnetFeed;
      if (!feedAddress || feedAddress === '0x0000000000000000000000000000000000000000') {
        pushToast({ title: 'Unsupported Asset', description: `No Chainlink feed for ${selectedAsset.symbol} on ${network}.`, type: 'error' });
        return;
      }

      // Use the actual Chainlink feed address for market creation (not the resolver)
      // The resolver is used later for market resolution, but the feed is needed for validation
      const oracleAddress = feedAddress as `0x${string}`;


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

      if (txHash) {
        pushToast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...', type: 'info' });

        // Wait for transaction confirmation
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
          console.log('✅ Market creation transaction confirmed:', receipt.transactionHash);

          // Check if transaction actually succeeded
          if (receipt.status === 'reverted') {
            console.error('❌ Market creation transaction reverted');
            pushToast({
              title: '❌ Transaction Failed',
              description: 'Market creation transaction was reverted. Please check the console for details.',
              type: 'error'
            });
            return;
          }

          // Register feed in legacy resolver (only if not using Diamond network)
          const isDiamond = isDiamondNetwork(network);
          console.log('🔍 Network type:', network, '| Is Diamond:', isDiamond, '| Resolver address:', addresses.chainlinkResolver);

          if (!isDiamond && addresses.chainlinkResolver) {
            console.log('📝 Registering feed in Legacy resolver...', {
              feedId: feedId,
              feedAddress: feedAddress,
              resolver: addresses.chainlinkResolver
            });

            try {
              pushToast({
                title: 'Registering Feed',
                description: `Registering ${selectedAsset.symbol} feed in Chainlink resolver...`,
                type: 'info'
              });

              const feedTxHash = await writeContractAsync({
                address: addresses.chainlinkResolver,
                abi: chainlinkResolverAbiLegacy,
                functionName: 'setGlobalFeed',
                args: [feedId as `0x${string}`, feedAddress as `0x${string}`],
              });

              console.log('📝 Feed registration transaction sent:', feedTxHash);

              // Wait for feed registration confirmation
              const feedReceipt = await publicClient.waitForTransactionReceipt({ hash: feedTxHash });

              // Check if feed registration succeeded
              if (feedReceipt.status === 'reverted') {
                console.error('❌ Feed registration transaction reverted');
                throw new Error('Feed registration transaction was reverted');
              }

              console.log('✅ Feed registered successfully!');
              pushToast({
                title: '✅ Feed Registered!',
                description: `${selectedAsset.symbol} feed (${feedAddress.slice(0, 10)}...) successfully registered in Chainlink resolver`,
                type: 'success'
              });
            } catch (feedErr: any) {
              console.error('❌ Failed to register feed:', feedErr);
              pushToast({
                title: '⚠️ Feed Registration Failed',
                description: `Market created but feed registration failed: ${feedErr.message || 'Unknown error'}. You may need to register it manually.`,
                type: 'warning'
              });
            }
          } else {
            if (isDiamond) {
              console.log('ℹ️ Diamond network detected - feed registration not needed (oracleAddress stored directly in market)');
              console.log('📋 Feed Info:', {
                feedId: feedId,
                feedAddress: feedAddress,
                note: 'Feed address is stored directly in market resolution config - no resolver registration needed'
              });
              pushToast({
                title: '✅ Market Created (Diamond Network)',
                description: `Market created! Feed address (${feedAddress.slice(0, 10)}...) is stored directly in market. No resolver registration needed.`,
                type: 'success'
              });
            } else if (!addresses.chainlinkResolver) {
              console.warn('⚠️ No resolver address configured');
              pushToast({
                title: '⚠️ No Resolver',
                description: 'Chainlink resolver address not configured. Feed may need manual registration.',
                type: 'warning'
              });
            }
          }

          pushToast({
            title: '✅ Success!',
            description: 'Market created successfully!',
            type: 'success'
          });

          // Reset form
          setStep(1);
          setTargetPrice('');
          setResolutionDate('');
          setStartDate('');
          setIsScheduled(false);

          // Save logs to localStorage before reload so user can see them
          const feedStatus = !isDiamond && addresses.chainlinkResolver ? 'registered' : isDiamond ? 'not_needed_diamond' : 'failed';
          const logSummary = {
            timestamp: new Date().toISOString(),
            marketCreated: true,
            feedRegistered: feedStatus,
            network: network,
            isDiamond: isDiamond,
            feedId: feedId,
            feedAddress: feedAddress
          };
          localStorage.setItem('lastMarketCreation', JSON.stringify(logSummary));
          console.log('📋 Market creation summary saved:', logSummary);

          // Show final summary toast
          const summaryMessage = isDiamond
            ? `✅ Market created! Feed address stored in market (Diamond network - no resolver registration needed)`
            : feedStatus === 'registered'
              ? `✅ Market created & feed registered in Chainlink resolver!`
              : `✅ Market created! Feed registration: ${feedStatus}`;

          pushToast({
            title: '📋 Summary',
            description: summaryMessage,
            type: 'success'
          });

          // Reload page after a delay to show all toasts
          console.log('⏳ Page will reload in 5 seconds to show the new market...');
          console.log('💡 Check the toasts above for feed registration status!');
          setTimeout(() => {
            console.log('🔄 Reloading page now...');
            window.location.reload();
          }, 5000);
        } catch (waitErr: any) {
          console.error('❌ Error waiting for transaction:', waitErr);
          pushToast({
            title: 'Transaction Pending',
            description: 'Market creation transaction is pending. Feed registration will be skipped.',
            type: 'warning'
          });
        }
      }
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
      {/* Compact Progress Bar */}
      <div className="flex items-center justify-center gap-8 mb-4 px-2 relative">
        {[1, 2, 3].map((s, idx) => (
          <div key={s} className="flex items-center gap-2 relative z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= s
              ? 'bg-[#14B8A6] text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'
              }`}>
              {s < step ? <CheckCircle2 size={14} /> : s}
            </div>
            <span className={`text-xs font-semibold ${step >= s ? 'text-[#14B8A6]' : 'text-gray-400 dark:text-gray-500'}`}>
              {s === 1 ? 'Asset' : s === 2 ? 'Details' : 'Confirm'}
            </span>
            {idx < 2 && (
              <div className={`w-8 h-0.5 ml-2 transition-colors ${step > s ? 'bg-[#14B8A6]' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-1 custom-scrollbar min-h-[320px]">
        <AnimatePresence mode="wait">
          {/* STEP 1: ASSET SELECTION */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="sticky top-0 bg-white/90 dark:bg-[#0f1219]/90 backdrop-blur-xl z-20 pb-3 pt-1">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors">
                    <Search size={18} />
                  </div>
                  <Input
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-11 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 focus:border-teal-500/50 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 pb-3">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAsset.symbol === asset.symbol;
                  return (
                    <button
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset)}
                      className={`relative group flex flex-col items-center p-3 rounded-xl border transition-all duration-200 ${isSelected
                        ? 'border-teal-500 bg-teal-500/10 shadow-sm'
                        : 'border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-teal-500/30'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${asset.color || 'from-gray-700 to-gray-900'} flex items-center justify-center shadow-sm mb-2 group-hover:scale-105 transition-transform text-white overflow-hidden`}>
                        {asset.logoSrc ? (
                          <Image
                            src={asset.logoSrc}
                            alt={`${asset.symbol} logo`}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <span className="text-lg">{asset.icon}</span>
                        )}
                      </div>
                      <span className={`text-xs font-semibold transition-colors truncate w-full text-center ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-gray-700 dark:text-gray-200'}`}>{asset.symbol}</span>

                      {isSelected && (
                        <motion.div layoutId="selectedCheck" className="absolute top-1 right-1 text-teal-500">
                          <CheckCircle2 size={14} className="fill-current" />
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
              className="space-y-4"
            >
              {/* Direction */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Direction</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setComparison('above')}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${comparison === 'above'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                  >
                    <div className={`p-2 rounded-lg ${comparison === 'above' ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                      <ArrowUpCircle size={18} />
                    </div>
                    <span className="font-bold text-sm">Above</span>
                  </button>
                  <button
                    onClick={() => setComparison('below')}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${comparison === 'below'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                  >
                    <div className={`p-2 rounded-lg ${comparison === 'below' ? 'bg-rose-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                      <ArrowDownCircle size={18} />
                    </div>
                    <span className="font-bold text-sm">Below</span>
                  </button>
                </div>
              </div>

              {/* Target Price */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Target Price</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Target size={16} />
                  </div>
                  <Input
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="0.00"
                    className="pl-10 h-12 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 focus:border-teal-500/50 rounded-xl text-lg font-bold font-mono text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-0 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">USD</div>
                </div>
                {validationErrors.targetPrice && (
                  <p className="text-rose-500 text-xs flex items-center gap-1"><AlertCircle size={10} /> {validationErrors.targetPrice}</p>
                )}
              </div>

              {/* Resolution Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Resolution Date (UTC)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Calendar size={16} />
                  </div>
                  <Input
                    type="datetime-local"
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    className="pl-10 h-12 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 focus:border-teal-500/50 rounded-xl text-sm font-medium font-mono text-gray-900 dark:text-white focus:ring-0 transition-all"
                  />
                </div>
                {validationErrors.resolutionDate && (
                  <p className="text-rose-500 text-xs flex items-center gap-1"><AlertCircle size={10} /> {validationErrors.resolutionDate}</p>
                )}
              </div>

              {/* Liquidity */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Initial Liquidity</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Wallet size={16} />
                  </div>
                  <Input
                    type="number"
                    value={initUsdc}
                    onChange={(e) => setInitUsdc(e.target.value)}
                    className="pl-10 h-12 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 focus:border-teal-500/50 rounded-xl text-lg font-bold font-mono text-gray-900 dark:text-white focus:ring-0 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">USDC</div>
                </div>
                {validationErrors.initUsdc && (
                  <p className="text-rose-500 text-xs flex items-center gap-1"><AlertCircle size={10} /> {validationErrors.initUsdc}</p>
                )}
              </div>

              {/* Schedule Toggle */}
              <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500">
                      <Clock size={16} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Schedule Start</span>
                  </div>
                  <button
                    onClick={() => setIsScheduled(!isScheduled)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 ${isScheduled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isScheduled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {isScheduled && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                    <Input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-11 bg-white dark:bg-gray-900 border-purple-500/30 rounded-lg font-mono text-sm text-gray-900 dark:text-white focus:ring-purple-500"
                    />
                    {validationErrors.startDate && <p className="text-rose-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10} /> {validationErrors.startDate}</p>}
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
              className="space-y-4"
            >
              <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-gray-200 dark:border-white/10 text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${selectedAsset.color} flex items-center justify-center shadow-md text-white overflow-hidden`}>
                    {selectedAsset.logoSrc ? (
                      <Image
                        src={selectedAsset.logoSrc}
                        alt={`${selectedAsset.symbol} logo`}
                        width={32}
                        height={32}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-2xl">{selectedAsset.icon}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {selectedAsset.symbol} {comparison === 'above' ? '>' : '<'} ${targetPrice}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Resolves {new Date(resolutionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 text-xs">
                  <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold">
                    {parseUnits(initUsdc, 0).toString()} USDC Liquidity
                  </span>
                  {isScheduled && (
                    <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                      <Timer size={12} /> {new Date(startDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {needsApproval ? (
                <Button
                  onClick={handleApprove}
                  disabled={isApproving || isApprovalConfirming}
                  className="w-full h-12 font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all"
                >
                  {isApproving || isApprovalConfirming ? <span className="animate-spin mr-2">⏳</span> : <span className="mr-2">🔓</span>}
                  Approve USDC
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isPending || isConfirming}
                  className="w-full h-12 font-bold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white rounded-xl transition-all"
                >
                  {isPending || isConfirming ? (
                    <>
                      <span className="animate-spin mr-2">⚡</span> Creating...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 fill-current w-4 h-4" /> Launch Market
                    </>
                  )}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4 mt-3 border-t border-gray-200 dark:border-gray-800/50">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={prevStep}
            className="flex-1 h-10 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
          >
            <ChevronLeft size={14} className="mr-1" /> Back
          </Button>
        )}
        {step < totalSteps && (
          <Button
            onClick={nextStep}
            className="flex-1 h-10 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-semibold text-sm"
          >
            Next <ChevronRight size={14} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}