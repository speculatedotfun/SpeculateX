'use client';

export const dynamic = 'force-dynamic';


import { useEffect, useState, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import CreateMarketForm from '@/components/CreateMarketForm';
import AdminMarketManager from '@/components/AdminMarketManager';
import MintUsdcForm from '@/components/MintUsdcForm';
import AdminManager from '@/components/AdminManager';
import USDCMinterManager from '@/components/USDCMinterManager';
import AdminOperationsManager from '@/components/AdminOperationsManager';
import ManualResolveMarkets from '@/components/admin/ManualResolveMarkets';
import RoleVisualization from '@/components/admin/RoleVisualization';
import RoleActivityLog from '@/components/admin/RoleActivityLog';
import ProtocolEventLog from '@/components/admin/ProtocolEventLog';
import Header from '@/components/Header';
import { getMarketCount, getMarket, getMarketState, getLpResidualPot } from '@/lib/hooks';
import { useAddresses } from '@/lib/contracts';
import { hasDefaultAdminRole } from '@/lib/accessControl';
import { useAdminRoles } from '@/lib/useAdminRoles';
import { formatUnits } from 'viem';
import { positionTokenAbi } from '@/lib/abis';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Plus, Shield, Users, Wallet, Zap, BarChart3, Database, Settings, Lock, History, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Collapsible section component
function CollapsibleSection({
  id,
  title,
  icon: Icon,
  iconColor,
  isOpen,
  onToggle,
  children,
  className = "",
  colSpan = "md:col-span-12"
}: {
  id: string;
  title: string;
  icon: any;
  iconColor: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  className?: string;
  colSpan?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        colSpan,
        "bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-all",
        className
      )}
    >
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-gray-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface Market {
  id: number;
  question: string;
  status: 'active' | 'resolved' | 'expired' | 'scheduled';
  startTime: string; // Changed from bigint to string
  vault: number;
  residual: number;
  yesToken: `0x${string}`;
  noToken: `0x${string}`;
  yesWins: boolean;
  isResolved: boolean;
  winningSupply: string; // Changed from bigint to string
  targetValue: string; // Changed from bigint to string
  comparison: number;
}


export default function AdminPage() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const addresses = useAddresses();
  const roles = useAdminRoles();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const loadMarkets = useCallback(async () => {
    try {
      const count = await getMarketCount();
      const marketIds = Array.from({ length: Number(count) }, (_, idx) => idx + 1);

      const marketResults = await Promise.all(
        marketIds.map(async (id) => {
          try {
            const [market, state, residualPot] = await Promise.all([
              getMarket(BigInt(id)),
              getMarketState(BigInt(id)),
              getLpResidualPot(BigInt(id)),
            ]);

            if (!market.exists) return null;

            const statusNames = ['active', 'resolved', 'cancelled'] as const;
            const contractStatus = Number(market.status ?? 0);
            const vaultValue = state?.vault ?? 0n;
            const residualValue = residualPot ?? 0n;
            const resolution = market.resolution;
            const isResolved = Boolean(resolution?.isResolved);
            const yesWins = Boolean(resolution?.yesWins);
            const expiryTimestamp = resolution?.expiryTimestamp ? BigInt(resolution.expiryTimestamp) : 0n;
            const startTime = resolution?.startTime ? BigInt(resolution.startTime) : 0n;
            const targetValue = resolution?.targetValue ? BigInt(resolution.targetValue) : 0n;
            const comparison = Number(resolution?.comparison ?? 0);
            const now = Math.floor(Date.now() / 1000);
            const isExpired = !isResolved && Number(expiryTimestamp) > 0 && now > Number(expiryTimestamp);
            const isScheduled = Number(startTime) > 0 && now < Number(startTime);

            let status: 'active' | 'resolved' | 'expired' | 'scheduled';
            if (isScheduled) {
              status = 'scheduled';
            } else if (isExpired) {
              status = 'expired';
            } else {
              status = statusNames[Math.min(contractStatus, 2)] as 'active' | 'resolved' | 'expired' | 'scheduled';
            }

            let winningSupply: bigint = 0n;
            if (isResolved && publicClient) {
              const winnerToken = yesWins ? market.yes : market.no;
              if (winnerToken && winnerToken !== '0x0000000000000000000000000000000000000000') {
                try {
                  winningSupply = await publicClient.readContract({
                    address: winnerToken as `0x${string}`,
                    abi: positionTokenAbi,
                    functionName: 'totalSupply',
                    args: [],
                  }) as bigint;
                } catch (error) {
                  console.error(`Error reading winning supply for market ${id}:`, error);
                }
              }
            }

            return {
              id,
              question: market.question as string,
              status,
              vault: Number(formatUnits(vaultValue, addresses.usdcDecimals ?? 6)),
              residual: Number(formatUnits(residualValue, addresses.usdcDecimals ?? 6)),
              yesToken: market.yes as `0x${string}`,
              noToken: market.no as `0x${string}`,
              yesWins,
              isResolved,
              winningSupply: winningSupply.toString(),
              startTime: startTime.toString(),
              targetValue: targetValue.toString(),
              comparison,
            } as Market;
          } catch (error) {
            console.error(`Error loading market ${id}:`, error);
            return null;
          }
        })
      );

      setMarkets(marketResults.filter((m): m is Market => m !== null));
    } catch (error) {
      console.error('Error loading markets:', error);
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isConnected || !address) {
        setIsAdmin(false);
        setMarkets([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      // Only allow DEFAULT_ADMIN_ROLE users, not MARKET_CREATOR_ROLE
      const adminStatus = await hasDefaultAdminRole(address);
      setIsAdmin(adminStatus);

      if (!adminStatus) {
        setMarkets([]);
        setLoading(false);
        return;
      }

      await loadMarkets();
    };

    checkAdmin();
  }, [isConnected, address, chain?.id, loadMarkets]);

  if (!isConnected) {
    return (
      <div className="min-h-screen text-gray-900 dark:text-white overflow-hidden flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-gray-800/30 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-12 rounded-[32px] max-w-lg w-full text-center shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <Lock className="w-16 h-16 mx-auto mb-6 text-[#14B8A6]/50" />
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 mb-4">Are you Elite?</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg font-light">Connect your wallet to access the control center.</p>
            <div className="w-full h-12 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-sm font-bold tracking-widest uppercase text-gray-500">
              Waiting for Connection...
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show loading while roles are being checked
  if (roles.isLoading) {
    return (
      <div className="min-h-screen text-gray-900 dark:text-white overflow-hidden flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <div className="w-10 h-10 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm tracking-widest uppercase text-gray-500">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !roles.isAnyAdmin) {
    return (
      <div className="min-h-screen text-gray-900 dark:text-white overflow-hidden flex flex-col font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 p-12 rounded-[32px] max-w-lg w-full text-center shadow-2xl"
          >
            <Shield className="w-16 h-16 mx-auto mb-6 text-red-500" />
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Address <span className="font-mono text-red-500 dark:text-red-400">{address?.slice(0, 6)}...{address?.slice(-4)}</span> is not authorized.</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col text-gray-900 dark:text-white font-sans selection:bg-[#14B8A6]/30 transition-colors duration-300">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-[#0f1219] dark:to-[#0f1219]"></div>
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[url('/grid.svg')] opacity-[0.03] invert dark:invert-0"></div>

      <Header />

      <main className="flex-1 relative z-10 mx-auto max-w-[1400px] w-full px-4 sm:px-6 lg:px-8 py-12">

        {/* Header Section */}
        <div className="mb-12 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] text-[10px] font-black uppercase tracking-widest mb-4"
            >
              <Shield className="w-3 h-3" /> Root Access Granted
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-500 mb-2">
              Command Center
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-light max-w-2xl">
              Manage markets, resolve disputes, and configure protocol parameters in real-time.
            </p>
            <button
              onClick={async () => {
                if (!address) return;
                const isAdminForce = await hasDefaultAdminRole(address);
                alert(`Role Verification:\n\nAdmin Role (DEFAULT_ADMIN_ROLE): ${isAdminForce ? '✅ GRANTED' : '❌ MISSING'}\n\nAddress: ${address}\n\nNote: If role is MISSING, you cannot perform admin actions.`);
              }}
              className="mt-4 px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Verify Access
            </button>
          </div>

          <div className="flex gap-4">
            <AdminStat value={markets.length} label="Total Markets" icon={Database} color="text-blue-500 dark:text-blue-400" />
            <AdminStat value={markets.filter(m => m.status === 'active').length} label="Active" icon={Activity} color="text-emerald-500 dark:text-emerald-400" />
            <AdminStat value={markets.filter(m => m.isResolved).length} label="Resolved" icon={Zap} color="text-amber-500 dark:text-amber-400" />
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-min">

          {/* Create Market (Span 8) */}
          {roles.canCreateMarkets && (
            <CollapsibleSection
              id="deploy-market"
              title="Deploy Market"
              icon={Plus}
              iconColor="bg-[#14B8A6]/10 text-[#14B8A6]"
              isOpen={openSections.has('deploy-market')}
              onToggle={toggleSection}
              colSpan="md:col-span-8"
            >
              <CreateMarketForm />
            </CollapsibleSection>
          )}

          {/* Sidebar Column (Span 4) */}
          <div className="md:col-span-4 flex flex-col gap-4">
            {/* USDC Faucet */}
            <CollapsibleSection
              id="usdc-faucet"
              title="USDC Faucet"
              icon={Wallet}
              iconColor="bg-blue-500/10 text-blue-500"
              isOpen={openSections.has('usdc-faucet')}
              onToggle={toggleSection}
              colSpan=""
            >
              <MintUsdcForm />
            </CollapsibleSection>

            {/* Minter Access */}
            {roles.canManageMinters && (
              <CollapsibleSection
                id="minter-role"
                title="Minter Role"
                icon={Shield}
                iconColor="bg-amber-500/10 text-amber-500"
                isOpen={openSections.has('minter-role')}
                onToggle={toggleSection}
                colSpan=""
              >
                <USDCMinterManager />
              </CollapsibleSection>
            )}

            {/* Referral Logs Link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-2xl p-4 cursor-pointer group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              onClick={() => window.location.href = '/admin/referrals'}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">Referrals</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
              </div>
            </motion.div>
          </div>

          {/* System Operations (Full Width) */}
          {(roles.canManageProtocol || roles.canManageTreasury) && (
            <CollapsibleSection
              id="protocol-ops"
              title="Protocol Operations"
              icon={Settings}
              iconColor="bg-orange-500/10 text-orange-500"
              isOpen={openSections.has('protocol-ops')}
              onToggle={toggleSection}
              colSpan="md:col-span-12"
            >
              <AdminOperationsManager />
            </CollapsibleSection>
          )}

          {/* Manual Resolve (Span 6) */}
          {roles.canResolveMarkets && (
            <CollapsibleSection
              id="manual-resolve"
              title="Manual Resolution"
              icon={Zap}
              iconColor="bg-emerald-500/10 text-emerald-500"
              isOpen={openSections.has('manual-resolve')}
              onToggle={toggleSection}
              colSpan="md:col-span-6"
            >
              <ManualResolveMarkets />
            </CollapsibleSection>
          )}

          {/* Permissions (Span 6) */}
          {roles.canManagePermissions && (
            <CollapsibleSection
              id="permissions"
              title="Admin Permissions"
              icon={Users}
              iconColor="bg-purple-500/10 text-purple-500"
              isOpen={openSections.has('permissions')}
              onToggle={toggleSection}
              colSpan="md:col-span-6"
            >
              <AdminManager />
            </CollapsibleSection>
          )}

          {/* Role Visualization (Span 6) */}
          <CollapsibleSection
            id="role-viz"
            title="Role Matrix"
            icon={Shield}
            iconColor="bg-indigo-500/10 text-indigo-500"
            isOpen={openSections.has('role-viz')}
            onToggle={toggleSection}
            colSpan="md:col-span-6"
          >
            <RoleVisualization />
          </CollapsibleSection>

          {/* Role Activity Log (Span 6) */}
          <CollapsibleSection
            id="role-activity"
            title="Role Activity"
            icon={History}
            iconColor="bg-cyan-500/10 text-cyan-500"
            isOpen={openSections.has('role-activity')}
            onToggle={toggleSection}
            colSpan="md:col-span-6"
          >
            <RoleActivityLog />
          </CollapsibleSection>

          {/* Protocol Events (Span 12) */}
          <CollapsibleSection
            id="protocol-events"
            title="Protocol Events"
            icon={Activity}
            iconColor="bg-emerald-500/10 text-emerald-500"
            isOpen={openSections.has('protocol-events')}
            onToggle={toggleSection}
            colSpan="md:col-span-12"
          >
            <ProtocolEventLog />
          </CollapsibleSection>

          {/* System Ledger (Span 12) */}
          <CollapsibleSection
            id="market-ledger"
            title="Global Market Ledger"
            icon={BarChart3}
            iconColor="bg-indigo-500/10 text-indigo-500"
            isOpen={openSections.has('market-ledger')}
            onToggle={toggleSection}
            colSpan="md:col-span-12"
          >
            {loading ? (
              <div className="h-32 flex flex-col items-center justify-center text-gray-500">
                <div className="w-8 h-8 border-3 border-[#14B8A6] border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs">Synchronizing...</p>
              </div>
            ) : (
              <AdminMarketManager markets={markets} />
            )}
          </CollapsibleSection>

        </div>
      </main>
    </div>
  );
}

function AdminStat({ value, label, icon: Icon, color }: { value: number | string, label: string, icon: any, color: string }) {
  return (
    <div className="px-6 py-4 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/5 rounded-2xl min-w-[140px] hover:border-gray-300 dark:hover:border-white/10 transition-colors group shadow-sm dark:shadow-none">
      <div className={cn("mb-2 opacity-70 group-hover:opacity-100 transition-opacity", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">{value}</div>
      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}