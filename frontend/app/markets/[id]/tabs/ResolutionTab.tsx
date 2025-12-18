'use client';
import { formatUnits, keccak256, stringToBytes } from 'viem';
import { CheckCircle2, Scale, Calendar, Rss, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResolutionTabProps {
  resolution: any;
}

export function ResolutionTab({ resolution }: ResolutionTabProps) {
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

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-6 rounded-2xl border ${
          resolution.isResolved
            ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30'
            : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30'
        }`}
        role="region"
        aria-label={resolution.isResolved ? 'Market resolution results' : 'Market resolution criteria'}
      >
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className={`p-3 rounded-xl ${resolution.isResolved ? 'bg-purple-100 dark:bg-purple-800/30 text-purple-600 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400'}`}
          >
            {resolution.isResolved ? <CheckCircle2 className="w-6 h-6" aria-hidden="true" /> : <Scale className="w-6 h-6" aria-hidden="true" />}
          </motion.div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {resolution.isResolved ? 'Market Resolved' : 'Resolution Criteria'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {resolution.isResolved ? (
                <>
                  This market has ended. The winning outcome is <span className={`font-black ${resolution.yesWins ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{resolution.yesWins ? 'YES' : 'NO'}</span>.
                </>
              ) : (
                <>
                  Market resolves <strong>YES</strong> if price is {resolution.comparison === 0 ? 'above' : resolution.comparison === 1 ? 'below' : 'equal to'}
                  <span className="font-bold text-gray-900 dark:text-white ml-1">
                    ${Number(formatUnits(resolution.targetValue, 8)).toLocaleString()}
                  </span> at expiry.
                </>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailItem
          label="Oracle Source"
          value={resolution.oracleType === 1 ? 'Chainlink' : 'Manual'}
          icon={<Rss className="w-4 h-4" />}
          index={0}
        />
        {resolution.oracleType === 1 && (
          <DetailItem
            label="Price Feed"
            value={getFeedName(resolution.priceFeedId)}
            icon={<Scale className="w-4 h-4" />}
            index={1}
          />
        )}
        <DetailItem
          label="Expiry Date"
          value={new Date(Number(resolution.expiryTimestamp) * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          icon={<Calendar className="w-4 h-4" />}
          index={resolution.oracleType === 1 ? 2 : 1}
        />
        <DetailItem
          label="Expiry Time"
          value={new Date(Number(resolution.expiryTimestamp) * 1000).toLocaleTimeString(undefined, { timeStyle: 'short' })}
          icon={<Clock className="w-4 h-4" />}
          index={resolution.oracleType === 1 ? 3 : 2}
        />
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
      whileHover={{ scale: 1.02 }}
      className="flex items-center gap-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50"
      role="article"
      aria-label={`${label}: ${value}`}
    >
      <div className="text-gray-400" aria-hidden="true">{icon}</div>
      <div>
        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">{value}</div>
      </div>
    </motion.div>
  );
}