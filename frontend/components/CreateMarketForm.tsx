'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { parseUnits, keccak256, stringToBytes } from 'viem';
import { addresses, getCurrentNetwork } from '@/lib/contracts';
import { getCoreAbi, usdcAbi } from '@/lib/abis';
import { canCreateMarkets } from '@/lib/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, DollarSign, ArrowUpCircle, ArrowDownCircle, Target, Wallet, Search, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

interface CreateMarketFormProps {
  standalone?: boolean;
}

// --- Verified Chainlink Supported Assets ---
const CRYPTO_ASSETS = [
  // Majors
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', feedId: 'BTC/USD' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', feedId: 'ETH/USD' },
  { symbol: 'SOL', name: 'Solana', icon: '◎', feedId: 'SOL/USD' },
  { symbol: 'BNB', name: 'Binance Coin', icon: '🔶', feedId: 'BNB/USD' },
  { symbol: 'XRP', name: 'Ripple', icon: '✕', feedId: 'XRP/USD' },
  { symbol: 'ADA', name: 'Cardano', icon: '₳', feedId: 'ADA/USD' },
  { symbol: 'AVAX', name: 'Avalanche', icon: '🔺', feedId: 'AVAX/USD' },
  { symbol: 'LINK', name: 'Chainlink', icon: '⬡', feedId: 'LINK/USD' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', feedId: 'DOGE/USD' },
  { symbol: 'MATIC', name: 'Polygon', icon: '💜', feedId: 'MATIC/USD' },
  { symbol: 'DOT', name: 'Polkadot', icon: '🟣', feedId: 'DOT/USD' },
  { symbol: 'TRX', name: 'Tron', icon: '♦️', feedId: 'TRX/USD' },
  { symbol: 'LTC', name: 'Litecoin', icon: 'Ł', feedId: 'LTC/USD' },
  { symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕', feedId: 'SHIB/USD' },
  // DeFi & L2s
  { symbol: 'UNI', name: 'Uniswap', icon: '🦄', feedId: 'UNI/USD' },
  { symbol: 'AAVE', name: 'Aave', icon: '👻', feedId: 'AAVE/USD' },
  { symbol: 'ARB', name: 'Arbitrum', icon: '💙', feedId: 'ARB/USD' },
  { symbol: 'OP', name: 'Optimism', icon: '🔴', feedId: 'OP/USD' },
  { symbol: 'MKR', name: 'Maker', icon: 'MKR', feedId: 'MKR/USD' },
  { symbol: 'SNX', name: 'Synthetix', icon: '⚔️', feedId: 'SNX/USD' },
  { symbol: 'LDO', name: 'Lido DAO', icon: '💧', feedId: 'LDO/USD' },
  { symbol: 'CRV', name: 'Curve', icon: '🌀', feedId: 'CRV/USD' },
  { symbol: 'APT', name: 'Aptos', icon: '🌐', feedId: 'APT/USD' },
  { symbol: 'RNDR', name: 'Render', icon: '🎨', feedId: 'RNDR/USD' },
  { symbol: 'INJ', name: 'Injective', icon: '💉', feedId: 'INJ/USD' },
  { symbol: 'ATOM', name: 'Cosmos', icon: '⚛️', feedId: 'ATOM/USD' },
  { symbol: 'NEAR', name: 'Near', icon: '∞', feedId: 'NEAR/USD' },
  { symbol: 'FIL', name: 'Filecoin', icon: '💾', feedId: 'FIL/USD' },
  { symbol: 'APE', name: 'ApeCoin', icon: '🦍', feedId: 'APE/USD' },
  { symbol: 'GRT', name: 'The Graph', icon: '📊', feedId: 'GRT/USD' },
  { symbol: 'SAND', name: 'Sandbox', icon: '🏖️', feedId: 'SAND/USD' },
  { symbol: 'FTM', name: 'Fantom', icon: '👻', feedId: 'FTM/USD' },
];

export default function CreateMarketForm({ standalone = false }: CreateMarketFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { pushToast } = useToast();

  // --- Form State ---
  const [selectedAsset, setSelectedAsset] = useState(CRYPTO_ASSETS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredAssets = useMemo(() => {
    return CRYPTO_ASSETS.filter(asset => 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);
  
  const [comparison, setComparison] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [initUsdc, setInitUsdc] = useState('1000');
  const [hasMarketCreatorRole, setHasMarketCreatorRole] = useState<boolean | null>(null);

  // --- EXACT QUESTION FORMATTING ---
  const generatedQuestion = useMemo(() => {
    if (!targetPrice || !resolutionDate) return '...';
    
    const dateObj = new Date(resolutionDate);
    
    // Format Date: "Dec, 15"
    const month = dateObj.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = dateObj.toLocaleString('en-US', { day: 'numeric', timeZone: 'UTC' });
    
    // Format Time: "20:00"
    const time = dateObj.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

    // Format Price: "90,000"
    const formattedPrice = Number(targetPrice).toLocaleString('en-US');

    // Format: Will BTC trade above 90,000$ on Dec, 15 at 20:00 UTC?
    return `Will ${selectedAsset.symbol} trade ${comparison} ${formattedPrice}$ on ${month}, ${day} at ${time} UTC?`;
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
        if (!canCreate) {
          pushToast({ 
            title: 'Access Denied', 
            description: 'You do not have permission to create markets. Please contact an admin.', 
            type: 'error' 
          });
        }
      } else {
        setHasMarketCreatorRole(null);
      }
    };
    checkMarketCreatorRole();
  }, [address, pushToast]);

  useEffect(() => {
    if (isApprovalSuccess) {
      pushToast({ title: 'Approval Confirmed', description: 'USDC approval successful. You can now create the market.', type: 'success' });
    }
  }, [isApprovalSuccess, pushToast]);

  useEffect(() => {
    if (isSuccess) {
      pushToast({ title: 'Success', description: 'Market created successfully!', type: 'success' });
      // Reset form
      setTargetPrice('');
      setResolutionDate('');
      setInitUsdc('1000');
      // Reload page after a short delay to show the new market
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isSuccess, pushToast]);

  const handleApprove = async () => {
    try {
      const amount = parseUnits(initUsdc || '1000', 6);
      const txHash = await writeApproveAsync({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: 'approve',
        args: [addresses.core, amount],
      });
      
      if (txHash) {
        pushToast({ title: 'Approval Submitted', description: 'Waiting for confirmation...', type: 'info' });
      }
    } catch (err: any) {
      console.error(err);
      pushToast({ 
        title: 'Approval Failed', 
        description: err?.message || 'Failed to approve USDC. Please try again.', 
        type: 'error' 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !publicClient) return;

    // Check if user has market creator role
    if (hasMarketCreatorRole === false) {
      pushToast({ 
        title: 'Access Denied', 
        description: 'You do not have permission to create markets. Please contact an admin to grant you MARKET_CREATOR_ROLE.', 
        type: 'error' 
      });
      return;
    }

    // Double-check role before submitting
    const canCreate = await canCreateMarkets(address);
    if (!canCreate) {
      pushToast({ 
        title: 'Access Denied', 
        description: 'You do not have permission to create markets. Please contact an admin.', 
        type: 'error' 
      });
      return;
    }

    try {
      const initUsdcE6 = parseUnits(initUsdc, 6);
      const expiry = Math.floor(new Date(resolutionDate).getTime() / 1000);
      const targetValueBigInt = parseUnits(targetPrice, 8);
      const comparisonEnum = comparison === 'above' ? 0 : 1; 
      
      const oracleAddress = process.env.NEXT_PUBLIC_CHAINLINK_RESOLVER_ADDRESS as `0x${string}`; 
      const feedId = keccak256(stringToBytes(selectedAsset.feedId));

      // Token Naming
      const dateObj = new Date(resolutionDate);
      const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      const symbolBase = `${selectedAsset.symbol}${comparison === 'above' ? 'UP' : 'DOWN'}${targetPrice}`;
      
      const yesName = `${selectedAsset.symbol} ${comparison === 'above' ? '>' : '<'} ${targetPrice} ${shortDate} YES`;
      const yesSymbol = `Y-${symbolBase}`;
      const noName = `${selectedAsset.symbol} ${comparison === 'above' ? '>' : '<'} ${targetPrice} ${shortDate} NO`;
      const noSymbol = `N-${symbolBase}`;

      const txHash = await writeContractAsync({
        address: addresses.core,
        abi: getCoreAbi(getCurrentNetwork()),
        functionName: 'createMarket',
        args: [
          generatedQuestion, 
          yesName, 
          yesSymbol, 
          noName, 
          noSymbol, 
          initUsdcE6, 
          BigInt(expiry), 
          oracleAddress, 
          feedId as `0x${string}`, 
          targetValueBigInt, 
          comparisonEnum
        ],
      });
      
      if (txHash) {
        pushToast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...', type: 'info' });
      }
    } catch (err: any) {
      console.error(err);
      pushToast({ 
        title: 'Error', 
        description: err?.message || 'Failed to create market. Please try again.', 
        type: 'error' 
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Create Prediction Market</h2>
        <p className="text-gray-500 text-sm">
          Select a token, set a price target, and choose an expiry time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. Asset Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-500 uppercase ml-1">1. Choose Token ($TOKEN)</label>
          
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <Input 
                placeholder="Search tokens..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 mb-3 bg-white dark:bg-gray-800"
             />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => {
                const isSelected = selectedAsset.symbol === asset.symbol;
                return (
                  <button
                    key={asset.symbol}
                    type="button"
                    onClick={() => setSelectedAsset(asset)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all group ${
                      isSelected 
                        ? 'border-[#14B8A6] bg-[#14B8A6]/10 shadow-sm' 
                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{asset.icon}</span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-[#14B8A6]' : 'text-gray-600 dark:text-gray-400'}`}>
                      {asset.symbol}
                    </span>
                    {isSelected && (
                      <motion.div layoutId="check" className="absolute top-2 right-2 text-[#14B8A6]">
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      </motion.div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="col-span-full text-center py-8 text-sm text-gray-400 border border-dashed rounded-xl">
                No tokens found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>

        {/* 2. Logic & Price */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-4 space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">2. Direction</label>
            <div className="grid grid-cols-2 gap-2 h-12">
              <button
                type="button"
                onClick={() => setComparison('above')}
                className={`flex items-center justify-center gap-2 rounded-lg border font-bold text-sm transition-colors ${
                  comparison === 'above'
                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" /> Above
              </button>
              <button
                type="button"
                onClick={() => setComparison('below')}
                className={`flex items-center justify-center gap-2 rounded-lg border font-bold text-sm transition-colors ${
                  comparison === 'below'
                    ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" /> Below
              </button>
            </div>
          </div>

          <div className="sm:col-span-8 space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">3. Target Price ($PRICE)</label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 90000"
                className="pl-10 h-12 text-lg font-mono font-medium"
                required
              />
            </div>
          </div>
        </div>

        {/* 3. Date & Liquidity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">4. Resolution ($DATE & $TIME)</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                type="datetime-local" 
                value={resolutionDate} 
                onChange={(e) => setResolutionDate(e.target.value)} 
                className="pl-10 h-12 font-mono text-sm" 
                required 
              />
            </div>
            <p className="text-[10px] text-gray-400 text-right pr-1">* Selected time will be converted to UTC</p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">5. Initial Liquidity</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                type="number" 
                value={initUsdc} 
                onChange={(e) => setInitUsdc(e.target.value)} 
                className="pl-10 h-12 font-mono" 
                required 
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">USDC</div>
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <AnimatePresence>
          {targetPrice && resolutionDate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-4"
            >
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-500 uppercase">Final Question Text</h4>
                <p className="font-medium text-lg leading-snug font-mono text-blue-600 dark:text-blue-400 break-words">
                  &quot;{generatedQuestion}&quot;
                </p>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-1">
                   <Info className="w-3 h-3" />
                   <span>ORACLE: Chainlink {selectedAsset.feedId}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="pt-2">
          {hasMarketCreatorRole === false && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-900 dark:text-red-100">
                  <p className="font-bold mb-1">No Permission to Create Markets</p>
                  <p className="opacity-80 leading-relaxed">
                    Your address does not have the MARKET_CREATOR_ROLE. Please contact an admin to grant you this permission.
                  </p>
                </div>
              </div>
            </div>
          )}
          {needsApproval ? (
            <Button 
              type="button" 
              onClick={handleApprove} 
              disabled={isApproving || isApprovalConfirming} 
              className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-amber-500/20"
            >
              {isApproving || isApprovalConfirming ? 'Approving USDC...' : 'Approve USDC'}
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={isPending || isConfirming || !targetPrice || !resolutionDate || hasMarketCreatorRole === false} 
              className="w-full h-14 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#0D9488] hover:to-[#0f766e] text-white font-bold text-lg rounded-xl shadow-lg shadow-[#14B8A6]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Creating Market...' : hasMarketCreatorRole === false ? 'No Permission' : 'Launch Market'}
            </Button>
          )}
        </div>

      </form>
    </div>
  );
}