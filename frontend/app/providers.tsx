'use client';

import { Suspense } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { ToastHost } from '@/components/ui/toast';
import { ThemeProvider, useTheme } from '@/lib/theme';
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
  type Theme,
} from '@rainbow-me/rainbowkit';

// Dynamic import to avoid chunking issues
import dynamic from 'next/dynamic';
import { useReferral } from '@/lib/hooks/useReferral';
import { UsernameGuard } from '@/components/UsernameGuard';

// Import styles
import '@rainbow-me/rainbowkit/styles.css';

// Helper component to run the hook inside the context
function ReferralListener() {
  useReferral();
  return null;
}

// Custom RainbowKit theme matching SpeculateX design
const customLightTheme: Theme = lightTheme({
  accentColor: '#14B8A6', // Teal primary color
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

const customDarkTheme: Theme = darkTheme({
  accentColor: '#14B8A6', // Teal primary color
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Override specific colors to match site design
customLightTheme.colors.modalBackground = '#ffffff';
customLightTheme.colors.modalBorder = 'rgba(0, 0, 0, 0.06)';
customLightTheme.colors.profileForeground = '#f8fafc';
customLightTheme.colors.closeButtonBackground = 'rgba(0, 0, 0, 0.06)';
customLightTheme.colors.actionButtonBorder = 'rgba(20, 184, 166, 0.2)';
customLightTheme.colors.actionButtonSecondaryBackground = 'rgba(20, 184, 166, 0.1)';

customDarkTheme.colors.modalBackground = '#0f172a'; // dark:bg-[#0f172a]
customDarkTheme.colors.modalBorder = 'rgba(255, 255, 255, 0.06)';
customDarkTheme.colors.profileForeground = '#1e293b';
customDarkTheme.colors.closeButtonBackground = 'rgba(255, 255, 255, 0.06)';
customDarkTheme.colors.actionButtonBorder = 'rgba(20, 184, 166, 0.3)';
customDarkTheme.colors.actionButtonSecondaryBackground = 'rgba(20, 184, 166, 0.15)';

// Themed RainbowKit wrapper that syncs with site theme
function ThemedRainbowKit({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const rainbowTheme = theme === 'dark' ? customDarkTheme : customLightTheme;

  return (
    <RainbowKitProvider theme={rainbowTheme} coolMode>
      {children}
    </RainbowKitProvider>
  );
}

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
          <ThemedRainbowKit>
            <ToastHost>
              <Suspense fallback={null}>
                <ReferralListener />
              </Suspense>
              <UsernameGuard>
                <div className="min-h-screen flex flex-col">
                  {children}
                </div>
              </UsernameGuard>
            </ToastHost>
          </ThemedRainbowKit>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
