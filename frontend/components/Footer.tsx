'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="relative w-full bg-transparent mt-auto">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8 md:py-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">

          {/* Brand Column */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-300">
                S
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                SpeculateX
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
              The next generation decentralized prediction market protocol. Trade on your beliefs with infinite liquidity and transparent outcomes.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Platform</h4>
            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <li>
                <Link href="/markets" className="hover:text-teal-500 dark:hover:text-teal-400 transition-colors flex items-center gap-2">
                  Explore Markets
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-teal-500 dark:hover:text-teal-400 transition-colors">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-teal-500 dark:hover:text-teal-400 transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/markets/create" className="hover:text-teal-500 dark:hover:text-teal-400 transition-colors">
                  Create Market
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Support</h4>
            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <li>
                <Link href="/docs" className="hover:text-teal-500 dark:hover:text-teal-400 transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-teal-500 dark:hover:text-teal-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-teal-500 dark:hover:text-teal-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/risk-disclosure" className="hover:text-teal-500 dark:hover:text-teal-400 transition-colors">
                  Risk Disclosure
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect Column */}
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Connect</h4>
            <div className="flex gap-4 mb-6">
              {/* X (Formerly Twitter) */}
              <a
                href="https://x.com/SpeculateX"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all hover:scale-110"
                aria-label="Follow us on X"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-500 transition-all hover:scale-110">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-white/10 dark:border-white/5">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Built with <span className="text-red-500">♥</span> on BSC
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © 2025 SpeculateX Protocol. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">System Operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

