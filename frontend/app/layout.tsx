// Import BigInt serializer first - must be before any other imports
import '@/lib/bigint-serializer';

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { CommandPalette } from '@/components/CommandPalette';
import DisclaimerModal from '@/components/DisclaimerModal';
import Footer from '@/components/Footer';

// Initialize font
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SpeculateX | Decentralized Prediction Markets',
  description: 'Trade on real-world events with infinite liquidity using AMM bonding curves.',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/Group.png', type: 'image/jpeg', sizes: '32x32' },
    ],
    apple: '/logo.svg',
    shortcut: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen flex flex-col bg-[#FAF9FF] dark:bg-[#0f172a] text-slate-900 dark:text-slate-50 antialiased mesh-gradient`}
      >
        <Providers>
          <DisclaimerModal />
          <CommandPalette />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}