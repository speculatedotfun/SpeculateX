'use client';

import { createAppKit, useAppKit, useAppKitTheme } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc, bscTestnet, type AppKitNetwork } from '@reown/appkit/networks';
import { ToastHost } from '@/components/ui/toast';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { useReferral } from '@/lib/hooks/useReferral';
import { UsernameGuard } from '@/components/UsernameGuard';
import { useEffect, useState } from 'react';

// Helper component to run the hook inside the context
function ReferralListener() {
  useReferral();
  return null;
}

// 0. Setup queryClient - singleton pattern
let globalQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
        },
      },
    });
  } else {
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

// 1. Get projectId from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id-for-development';

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID === 'your_project_id_here' ||
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID === 'demo-project-id-for-development') {
  if (typeof window !== 'undefined') {
    console.warn(
      '⚠️ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set or invalid!\n' +
      'Wallet connections may not work properly.\n' +
      'Get your Project ID from: https://cloud.reown.com/\n' +
      'Then add it to your .env.local file as: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id'
    );
  }
}

// 2. Create a metadata object
const metadata = {
  name: 'SpeculateX',
  description: 'Trade on real-world events with infinite liquidity using AMM bonding curves.',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://speculatex.app',
  icons: ['/logo.svg'],
};

// 3. Set the networks - BSC Mainnet and Testnet
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [bsc, bscTestnet];

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

// 5. Create AppKit modal - only run on client side
let appKitInitialized = false;

// Get initial theme from localStorage or system preference
function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Ignore localStorage errors
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

if (typeof window !== 'undefined' && !appKitInitialized) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    features: {
      analytics: true,
      email: false, // Disable email login for now
      socials: false, // Disable social logins for now
    },
    // Featured wallets shown prominently at the top of the modal
    // Wallet IDs from: https://explorer.walletconnect.com/
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
      '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
      'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a', // OKX Wallet
      '18388be9ac2d02726dbac9777c96efaac06d744b2f6d580fccdd4127a6d01fd1', // Rabby
      '0b415a746fb9ee99cce155c2ceca0c6f6061b1dbca2d722b3ba16381d0562150', // SafePal
    ],
    // Don't include certain wallets in "All Wallets"
    excludeWalletIds: [],
    themeMode: getInitialTheme(),
    themeVariables: {
      '--w3m-accent': '#14B8A6', // Teal primary color
      '--w3m-color-mix': '#ffffff', // White mix for light mode, removes blue tint
      '--w3m-color-mix-strength': 0, // No color mixing
      '--w3m-border-radius-master': '12px',
      '--w3m-font-family': 'inherit',
    },
  });
  appKitInitialized = true;
}

// Theme sync component - syncs site theme with AppKit modal
function AppKitThemeSync() {
  const { theme } = useTheme();
  const { setThemeMode } = useAppKitTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Sync AppKit theme with site theme
    setThemeMode(theme);
  }, [theme, mounted, setThemeMode]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AppKitThemeSync />
          <ToastHost>
            <ReferralListener />
            <UsernameGuard>
              <div className="min-h-screen flex flex-col">
                {children}
              </div>
            </UsernameGuard>
          </ToastHost>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

// Export the wagmi config for use elsewhere
export { wagmiAdapter };
