import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  rabbyWallet,
  okxWallet,
  trustWallet,
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
  safeWallet,
  ledgerWallet,
  argentWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { http } from 'wagmi';
import { bscTestnet, bsc } from 'wagmi/chains';

// Override the BSC Testnet RPC URLs to prevent fallback to placeholder URLs
const bscTestnetOverride = {
  ...bscTestnet,
  rpcUrls: {
    ...bscTestnet.rpcUrls,
    default: {
      http: ['https://bsc-testnet.publicnode.com'],
    },
    public: {
      http: ['https://bsc-testnet.publicnode.com'],
    },
  },
};

// Override BSC Mainnet RPC URLs
const bscMainnetOverride = {
  ...bsc,
  rpcUrls: {
    ...bsc.rpcUrls,
    default: {
      http: ['https://bsc-dataseed.binance.org'],
    },
    public: {
      http: ['https://bsc-dataseed.binance.org'],
    },
  },
};

function sanitizeRpcUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed === '' || trimmed.startsWith('/YOUR_CHAINSTACK_HTTP')) {
    return '';
  }
  return trimmed;
}

const envRpcUrl = sanitizeRpcUrl(process.env.NEXT_PUBLIC_RPC_URL);

// Default RPC URLs for each network
const testnetRpcUrl = envRpcUrl || 'https://bsc-testnet.publicnode.com';
const mainnetRpcUrl = process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://bsc-dataseed.binance.org';

// WalletConnect Project ID - REQUIRED for wallet connections
// Get your Project ID from: https://cloud.reown.com/
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id-for-development';

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

export const config = getDefaultConfig({
  appName: 'SpeculateX v3',
  projectId: walletConnectProjectId,
  chains: [bscTestnetOverride, bscMainnetOverride],
  ssr: true,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        rainbowWallet,
        metaMaskWallet,
        rabbyWallet,
        okxWallet,
        trustWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
    {
      groupName: 'Multisig',
      wallets: [safeWallet],
    },
    {
      groupName: 'Other',
      wallets: [ledgerWallet, argentWallet, injectedWallet],
    },
  ],
  transports: {
    [bscTestnetOverride.id]: http(testnetRpcUrl),
    [bscMainnetOverride.id]: http(mainnetRpcUrl),
  },
});
