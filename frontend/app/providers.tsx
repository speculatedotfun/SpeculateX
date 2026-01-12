'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { ToastHost } from '@/components/ui/toast';
import { ThemeProvider } from '@/lib/theme';


// Dynamic import to avoid chunking issues
import dynamic from 'next/dynamic';
import { useReferral } from '@/lib/hooks/useReferral';
import { UsernameGuard } from '@/components/UsernameGuard';

// Helper component to run the hook inside the context
function ReferralListener() {
  useReferral();
  return null;
}

const RainbowKitProvider = dynamic(
  () => import('@rainbow-me/rainbowkit').then((mod) => mod.RainbowKitProvider),
  {
    ssr: false,
    loading: () => null,
  }
);

// Import styles
import '@rainbow-me/rainbowkit/styles.css';

// Singleton QueryClient to prevent multiple instances
let globalQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
        },
      },
    });
  } else {
    // Browser: make a new query client if we don't already have one
    if (!globalQueryClient) {
      globalQueryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      });
    }

    // Check if we need to clear cache (Core address changed)
    try {
      const shouldClear = sessionStorage.getItem('clearReactQueryCache');
      if (shouldClear === 'true') {
        console.log('[providers] Clearing React Query cache...');
        globalQueryClient.clear();
        sessionStorage.removeItem('clearReactQueryCache');
        console.log('[providers] ✅ React Query cache cleared');
      }
    } catch (e) {
      // Ignore if sessionStorage not available
    }

    return globalQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <ToastHost>
              <ReferralListener />
              <UsernameGuard>
                <div className="min-h-screen flex flex-col">
                  {children}
                </div>
              </UsernameGuard>
            </ToastHost>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}


