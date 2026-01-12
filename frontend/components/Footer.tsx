'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle } from 'lucide-react';
import { useAccount } from 'wagmi';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { chain } = useAccount();

  // BNB Mainnet chain ID is 56
  const isMainnet = chain?.id === 56;

  return (
    <footer className="w-full border-t border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="max-w-[1440px] mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Left: Logo + Copyright */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center group">
              <div className="relative w-24 h-6">
                {/* Light mode logo */}
                <Image
                  src="/Whitelogo.png"
                  alt="SpeculateX"
                  fill
                  sizes="96px"
                  className="object-contain object-left dark:hidden"
                />
                {/* Dark mode logo */}
                <Image
                  src="/darklogo.png"
                  alt="SpeculateX"
                  fill
                  sizes="96px"
                  className="object-contain object-left hidden dark:block"
                />
              </div>
            </Link>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              © {currentYear}
            </span>
          </div>

          {/* Center: Legal Links */}
          <nav className="flex items-center gap-6 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Link href="/docs" className="hover:text-teal-500 transition-colors">
              Docs
            </Link>
            <Link href="/terms" className="hover:text-teal-500 transition-colors">
              Terms
            </Link>
            <Link href="/risk-disclosure" className="hover:text-teal-500 transition-colors">
              Risks
            </Link>
          </nav>

          {/* Right: Social + Status */}
          <div className="flex items-center gap-3">
            {/* Social Icons */}
            <div className="flex items-center gap-1">
              <a
                href="https://x.com/SpeculateX"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                aria-label="X (Twitter)"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://t.me/SpeculateX"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                aria-label="Telegram"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Network Badge */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${isMainnet
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/50'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-800/50'
              }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isMainnet ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isMainnet
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
                }`}>
                {isMainnet ? 'BNB Mainnet' : 'BNB Testnet'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
