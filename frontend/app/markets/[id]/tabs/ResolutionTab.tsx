'use client';
import { formatUnits, keccak256, stringToBytes } from 'viem';
import { CheckCircle2, Scale, Calendar, Rss, Clock, AlertTriangle, Play, Divide, Flag, Activity, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminMarketActions } from '@/components/market/AdminMarketActions';
import { useResolutionMethod } from '@/lib/hooks/useResolutionMethod';

interface ResolutionTabProps {
  resolution: any;
  marketId?: number;
  marketStatus?: 'active' | 'resolved' | 'cancelled' | 'expired';
  marketCreatedAt?: bigint | number | string | null;
}

export function ResolutionTab({ resolution, marketId, marketStatus, marketCreatedAt }: ResolutionTabProps) {
  const isResolved = Boolean(resolution?.isResolved);
  const resolutionMetadata = useResolutionMethod(marketId || 0, isResolved);

  if (!resolution || !resolution.expiryTimestamp) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.6, y: 0 }}
        className="p-8 text-center text-gray-400 text-sm"
        role="status"
        aria-label="Resolution data not available"
      >
        Resolution data not available
      </motion.div>
    );
  }

  // Helper to decode feed name from ID
  const getFeedName = (feedId: string) => {
    const id = feedId.toLowerCase();
    const knownFeeds: Record<string, string> = {
      [keccak256(stringToBytes('BTC/USD')).toLowerCase()]: 'BTC/USD',
      [keccak256(stringToBytes('ETH/USD')).toLowerCase()]: 'ETH/USD',
      [keccak256(stringToBytes('BNB/USD')).toLowerCase()]: 'BNB/USD',
    };
    return knownFeeds[id] || `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  const statusMap: Record<number, 'active' | 'resolved' | 'cancelled' | 'expired'> = {
    0: 'active',
    1: 'resolved',
    2: 'cancelled',
  };

  const currentStatus = marketStatus || (resolution?.isResolved
    ? (resolution?.yesWins !== undefined ? 'resolved' : 'cancelled')
    : 'active');

  // Use resolution.startTime if available, otherwise fall back to marketCreatedAt
  const resolutionStartTime = resolution.startTime ? Number(resolution.startTime) : 0;
  const createdAtTimestamp = marketCreatedAt 
    ? (typeof marketCreatedAt === 'bigint' ? Number(marketCreatedAt) : Number(marketCreatedAt))
    : 0;
  const startTime = resolutionStartTime > 0 ? resolutionStartTime : (createdAtTimestamp > 0 ? createdAtTimestamp : 0);
  const expiryTime = Number(resolution.expiryTimestamp);
  const now = Math.floor(Date.now() / 1000);
  const isStarted = startTime > 0 && now >= startTime;
  const isExpired = now >= expiryTime;

  return (
    <div className="space-y-8">
      {/* Admin Actions */}
      {marketId && (
        <AdminMarketActions
          marketId={marketId}
          marketStatus={currentStatus}
          isResolved={Boolean(resolution?.isResolved)}
          expiryTimestamp={resolution?.expiryTimestamp || 0n}
          oracleType={resolution?.oracleType || 0}
          oracleAddress={resolution?.oracleAddress}
        />
      )}

      {/* Main Status & Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Left Col: Status Card & Details */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-3xl border relative overflow-hidden ${currentStatus === 'cancelled'
              ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
              : isResolved
                ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30'
                : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30'
              }`}
          >
            <div className="flex items-start gap-4 relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className={`p-3 rounded-xl shadow-sm ${currentStatus === 'cancelled'
                  ? 'bg-red-100 dark:bg-red-800/30 text-red-600 dark:text-red-400'
                  : isResolved
                    ? 'bg-purple-100 dark:bg-purple-800/30 text-purple-600 dark:text-purple-400'
                    : 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400'
                  }`}
              >
                {currentStatus === 'cancelled' ? (
                  <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                ) : isResolved ? (
                  <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <Scale className="w-6 h-6" aria-hidden="true" />
                )}
              </motion.div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">
                  {currentStatus === 'cancelled'
                    ? 'Market Cancelled'
                    : isResolved
                      ? 'Market Resolved'
                      : 'Resolution Criteria'}
                </h3>
                <div className="space-y-2">
                  {currentStatus === 'cancelled' ? (
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      This market has been <span className="font-bold text-red-600 dark:text-red-400">cancelled</span>.
                      All positions can be redeemed at <span className="font-bold text-gray-900 dark:text-white">50% of face value</span>.
                    </p>
                  ) : isResolved ? (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                        This market has been resolved.
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Winning Outcome</span>
                        <span className={`text-lg font-black ${resolution.yesWins ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {resolution.yesWins ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        This market resolves based on the oracle price at the expiration time.
                      </p>
                      <div className="inline-flex items-baseline gap-2 flex-wrap px-4 py-3 rounded-xl bg-white/60 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">If price is</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700">
                          {resolution.comparison === 0 ? 'above' : resolution.comparison === 1 ? 'below' : 'equal to'}
                        </span>
                        <span className="text-lg font-black text-gray-900 dark:text-white">
                          {(() => {
                            try {
                              const decimalsRaw = resolution?.oracleDecimals;
                              const decimalsPrimary = Number.isFinite(Number(decimalsRaw)) && Number(decimalsRaw) > 0 ? Number(decimalsRaw) : 8;
                              const primary = Number(formatUnits(resolution.targetValue, decimalsPrimary));
                              const val = (Number.isFinite(primary) && primary > 0 && primary < 1e9)
                                ? primary
                                : Number(formatUnits(resolution.targetValue, 18));
                              if (!Number.isFinite(val) || val <= 0) return '$—';
                              return `$${val.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
                            } catch {
                              return '$—';
                            }
                          })()}
                        </span>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">at expiry</span>
                        <span className="text-sm font-black text-[#14B8A6] ml-1">→ YES wins</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent -translate-y-1/2 translate-x-1/2 rounded-full blur-2xl pointer-events-none" />
          </motion.div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <DetailItem
              label="Oracle Source"
              value={resolution.oracleType === 1 ? 'Chainlink' : 'Manual'}
              icon={<Rss className="w-4 h-4" />}
              index={0}
            />
            <DetailItem
              label="Expiration Date"
              value={new Date(expiryTime * 1000).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: new Date(expiryTime * 1000).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
              icon={<Calendar className="w-4 h-4" />}
              index={1}
            />
            {isResolved && resolutionMetadata.method && (
              <DetailItem
                label="Resolution Method"
                value={getResolutionMethodLabel(resolutionMetadata.method, resolutionMetadata.twapWindowStart, resolutionMetadata.twapWindowEnd)}
                icon={<CheckCircle2 className="w-4 h-4" />}
                index={2}
              />
            )}
          </div>
        </div>

        {/* Right Col: Timeline */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl p-6 border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-gray-400" />
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Market Timeline</h4>
          </div>

          <div className="relative pl-5 space-y-10 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-gradient-to-b before:from-gray-200 before:via-gray-300 before:to-gray-200 dark:before:from-gray-700 dark:before:via-gray-600 dark:before:to-gray-700 before:-translate-x-1/2 rounded-full">

            <TimelineItem
              icon={Play}
              title="Market Created"
              date={startTime}
              description="Trading opens"
              isCompleted={isStarted}
              isActive={false}
              color="text-blue-500"
            />

            <TimelineItem
              icon={Activity}
              title="Trading Period"
              description={isExpired || isResolved ? "Trading closed" : "Open for trading"}
              isCompleted={isExpired || isResolved}
              isActive={isStarted && !isExpired && !isResolved}
              color="text-[#14B8A6]"
            />

            <TimelineItem
              icon={Flag}
              title="Resolution Time"
              date={expiryTime}
              description={isResolved ? "Market resolved" : isExpired ? "Awaiting resolution" : "Resolution deadline"}
              isCompleted={isExpired || isResolved}
              isActive={isExpired && !isResolved}
              color="text-amber-500"
            />

            <TimelineItem
              icon={Check}
              title="Settlement"
              description={isResolved 
                ? (resolution.yesWins ? "YES wins — positions can be claimed" : "NO wins — positions can be claimed")
                : "Pending resolution"}
              isCompleted={isResolved}
              isActive={false}
              color={isResolved ? (resolution.yesWins ? "text-emerald-500" : "text-rose-500") : "text-gray-400"}
              last
            />

          </div>
        </div>

      </div>
    </div>
  );
}

function getResolutionMethodLabel(
  method: 'FIRST_AFTER' | 'TWAP_5M' | 'FIRST_AFTER_LATE' | null,
  twapWindowStart: number | null,
  twapWindowEnd: number | null
): string {
  if (method === 'TWAP_5M') {
    if (twapWindowStart && twapWindowEnd) {
      const start = new Date(twapWindowStart * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(twapWindowEnd * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `Chainlink TWAP (5m) ${start}–${end}`;
    }
    return 'Chainlink TWAP (5m)';
  }
  if (method === 'FIRST_AFTER_LATE') {
    return 'Chainlink first update (late)';
  }
  if (method === 'FIRST_AFTER') {
    return 'Chainlink first update after expiry';
  }
  return 'Unknown';
}

function DetailItem({ label, value, icon, index }: { label: string, value: string, icon: any, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + (index * 0.05) }}
      className="flex items-center gap-3 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-gray-500 dark:text-gray-400 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-sm font-black text-gray-900 dark:text-white truncate">{value}</div>
      </div>
    </motion.div>
  );
}

function TimelineItem({ icon: Icon, title, date, description, isCompleted, isActive, color, last }: any) {
  const textColor = isCompleted || isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-500";
  const descriptionColor = isCompleted || isActive ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-600";
  
  // Only show date if it's valid (greater than 0)
  const hasValidDate = date && typeof date === 'number' && date > 0;

  return (
    <div className="relative pl-9">
      {/* Node */}
      <div className={`absolute left-0 top-1 w-5 h-5 -translate-x-1/2 rounded-full border-2 transition-all duration-300 z-10 flex items-center justify-center ${
        isCompleted 
          ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white shadow-lg" 
          : isActive 
            ? "border-[#14B8A6] bg-[#14B8A6] text-white shadow-lg shadow-[#14B8A6]/30" 
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      }`}>
        {(isCompleted || isActive) && (
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-white dark:bg-black'}`} />
        )}
      </div>

      <div className={`transition-all duration-300 ${isCompleted || isActive ? 'opacity-100' : 'opacity-50'}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <h5 className={`text-sm font-black ${textColor}`}>{title}</h5>
          {isActive && (
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#14B8A6] bg-[#14B8A6]/10 rounded-full animate-pulse">
              Active
            </span>
          )}
          {isCompleted && !isActive && (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          )}
        </div>

        {description && (
          <p className={`text-xs font-medium mb-2 leading-relaxed ${descriptionColor}`}>
            {description}
          </p>
        )}

        {hasValidDate && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
              {new Date(date * 1000).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}