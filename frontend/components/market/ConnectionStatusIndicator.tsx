export function ConnectionStatusIndicator({ health, analytics }: {
  health: any;
  analytics: any;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Real-time';
      case 'degraded': return 'Slow';
      case 'unhealthy': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-full border border-white/60 dark:border-gray-700/60 shadow-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.status || 'unhealthy')} ring-2 ring-white/50 dark:ring-gray-700/50`} />
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
        {getStatusText(health?.status || 'unhealthy')}
      </span>
      {health?.latency && (
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500 ml-1">
          {Math.round(health.latency)}ms
        </span>
      )}
    </div>
  );
}





