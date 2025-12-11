'use client';
import { formatUnits, keccak256, stringToBytes } from 'viem';
import { CheckCircle2, Scale, Calendar, Rss, Clock } from 'lucide-react';

interface ResolutionTabProps {
  resolution: any;
}

export function ResolutionTab({ resolution }: ResolutionTabProps) {
  if (!resolution || !resolution.expiryTimestamp) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        Resolution data not available
      </div>
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
      <div className={`p-6 rounded-2xl border ${
        resolution.isResolved 
          ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30'
          : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${resolution.isResolved ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
            {resolution.isResolved ? <CheckCircle2 className="w-6 h-6" /> : <Scale className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {resolution.isResolved ? 'Market Resolved' : 'Resolution Criteria'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {resolution.isResolved ? (
                <>
                  This market has ended. The winning outcome is <span className={`font-black ${resolution.yesWins ? 'text-green-600' : 'text-red-600'}`}>{resolution.yesWins ? 'YES' : 'NO'}</span>.
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
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailItem 
          label="Oracle Source" 
          value={resolution.oracleType === 1 ? 'Chainlink' : 'Manual'} 
          icon={<Rss className="w-4 h-4" />}
        />
        {resolution.oracleType === 1 && (
          <DetailItem 
            label="Price Feed" 
            value={getFeedName(resolution.priceFeedId)} 
            icon={<Scale className="w-4 h-4" />}
          />
        )}
        <DetailItem 
          label="Expiry Date" 
          value={new Date(Number(resolution.expiryTimestamp) * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' })} 
          icon={<Calendar className="w-4 h-4" />}
        />
        <DetailItem 
          label="Expiry Time" 
          value={new Date(Number(resolution.expiryTimestamp) * 1000).toLocaleTimeString(undefined, { timeStyle: 'short' })} 
          icon={<Clock className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
      <div className="text-gray-400">{icon}</div>
      <div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
}