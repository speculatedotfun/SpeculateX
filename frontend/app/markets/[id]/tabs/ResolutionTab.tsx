'use client';
import { formatUnits, keccak256, stringToBytes } from 'viem';
import { CheckCircle2, Scale, Calendar, Rss, Clock, AlertTriangle, Play, Divide, Flag, Activity, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminMarketActions } from '@/components/market/AdminMarketActions';

interface ResolutionTabProps {
  resolution: any;
  marketId?: number;
  marketStatus?: 'active' | 'resolved' | 'cancelled' | 'expired';
}

export function ResolutionTab({ resolution, marketId, marketStatus }: ResolutionTabProps) {
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

  const startTime = Number(resolution.startTime ?? 0);
  const expiryTime = Number(resolution.expiryTimestamp);
  const now = Math.floor(Date.now() / 1000);
  const isStarted = now >= startTime;
  const isExpired = now >= expiryTime;
  const isResolved = Boolean(resolution.isResolved);

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
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                  {currentStatus === 'cancelled'
                    ? 'Market Cancelled'
                    : isResolved
                      ? 'Market Resolved'
                      : 'Resolution Criteria'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  {currentStatus === 'cancelled' ? (
                    <>
                      This market has been <span className="font-extrabold text-red-600 dark:text-red-400">cancelled</span>.
                      All positions can be redeemed at <span className="font-bold text-gray-900 dark:text-white">50% face value</span>.
                    </>
                  ) : isResolved ? (
                    <>
                      Winning outcome: <span className={`font-black text-lg ${resolution.yesWins ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{resolution.yesWins ? 'YES' : 'NO'}</span>.
                    </>
                  ) : (
                    <>
                      Resolves <span className="font-black text-[#14B8A6]">YES</span> if price is {resolution.comparison === 0 ? 'above' : resolution.comparison === 1 ? 'below' : 'equal to'}
                      <span className="font-black text-gray-900 dark:text-white mx-1">
                        ${Number(formatUnits(resolution.targetValue, 18)).toLocaleString()}
                      </span> at expiry.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent -translate-y-1/2 translate-x-1/2 rounded-full blur-2xl pointer-events-none" />
          </motion.div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailItem
              label="Oracle"
              value={resolution.oracleType === 1 ? 'Chainlink' : 'Manual'}
              icon={<Rss className="w-3.5 h-3.5" />}
              index={0}
            />
            <DetailItem
              label="Expiry"
              value={new Date(expiryTime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              icon={<Calendar className="w-3.5 h-3.5" />}
              index={1}
            />
          </div>
        </div>

        {/* Right Col: Timeline */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 px-2">Market Timeline</h4>

          <div className="relative pl-4 space-y-8 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700 before:-translate-x-1/2">

            <TimelineItem
              icon={Play}
              title="Market Started"
              date={startTime}
              isCompleted={isStarted}
              isActive={false}
              color="text-blue-500"
            />

            <TimelineItem
              icon={Activity}
              title="Trading Period"
              description="Open for trading"
              isCompleted={isExpired || isResolved}
              isActive={isStarted && !isExpired && !isResolved}
              color="text-[#14B8A6]"
            />

            <TimelineItem
              icon={Flag}
              title="Resolution Date"
              date={expiryTime}
              isCompleted={isExpired || isResolved}
              isActive={isExpired && !isResolved}
              color="text-orange-500"
            />

            <TimelineItem
              icon={Check}
              title="Settlement"
              description={isResolved ? (resolution.yesWins ? "Yes Won" : "No Won") : "Pending Resolution"}
              isCompleted={isResolved}
              isActive={false}
              color={resolution.yesWins ? "text-green-500" : "text-red-500"}
              last
            />

          </div>
        </div>

      </div>
    </div>
  );
}

function DetailItem({ label, value, icon, index }: { label: string, value: string, icon: any, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + (index * 0.05) }}
      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm"
    >
      <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-400 dark:text-gray-500">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[100px]">{value}</div>
      </div>
    </motion.div>
  );
}

function TimelineItem({ icon: Icon, title, date, description, isCompleted, isActive, color, last }: any) {
  const stateColor = isCompleted ? "bg-gray-900 dark:bg-white text-white dark:text-black" : isActive ? "bg-[#14B8A6] text-white shadow-[0_0_15px_-3px_rgba(20,184,166,0.4)]" : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600";
  const textColor = isCompleted || isActive ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-600";

  return (
    <div className="relative pl-8">
      {/* Node */}
      <div className={`absolute left-0 top-0 w-4 h-4 -translate-x-1/2 rounded-full border-2 transition-all duration-500 z-10 ${isCompleted || isActive ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
        }`}>
        {(isCompleted || isActive) && <div className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
      </div>

      <div className={`transition-opacity duration-500 ${isCompleted || isActive ? 'opacity-100' : 'opacity-60'}`}>
        <div className="flex items-center gap-2 mb-1">
          <h5 className={`text-sm font-bold ${textColor}`}>{title}</h5>
          {isActive && <span className="text-[10px] font-black uppercase tracking-widest text-[#14B8A6] animate-pulse">Active</span>}
        </div>

        {description && <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{description}</p>}

        {date && (
          <div className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {new Date(date * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  )
}