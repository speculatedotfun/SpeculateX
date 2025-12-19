'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 mt-12">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#14B8A6] to-teal-600 flex items-center justify-center text-white font-bold text-xs">S</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            © 2025 SpeculateX
          </p>
        </div>
        <div className="flex gap-6 md:gap-8 text-sm font-bold text-gray-500 dark:text-gray-400 flex-wrap justify-center">
          <Link href="/docs" className="hover:text-[#14B8A6] transition-colors">
            Docs
          </Link>
          <Link href="/terms" className="hover:text-[#14B8A6] transition-colors">
            Terms of Service
          </Link>
          <Link href="/risk-disclosure" className="hover:text-[#14B8A6] transition-colors">
            Risk Disclosure
          </Link>
        </div>
      </div>
    </footer>
  );
}

