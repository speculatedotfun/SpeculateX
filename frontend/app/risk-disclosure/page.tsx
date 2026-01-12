'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { AlertTriangle } from 'lucide-react';

export default function RiskDisclosurePage() {
  return (
    <div className="flex-1 flex flex-col relative overflow-x-hidden font-sans selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white">

      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
      </div>

      <Header />

      <main className="flex-1 relative z-10 mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl border border-gray-200 dark:border-gray-700 rounded-[32px] p-8 lg:p-12 shadow-xl"
        >
          {/* Header with Icon */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-2">
                Risk Disclosure Statement
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-1">
                for Crypto and Prediction Markets
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Last Updated: 24.11.2025
              </p>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none">

            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8 text-lg">
              This Risk Disclosure Statement explains the significant risks associated with engaging in prediction market activity, interacting with blockchain networks, or using tools provided by SpeculateX. By using the Site, you acknowledge and accept the following risks.
            </p>

            {/* Section 1 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Market Risk</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                Prediction markets and synthetic markets involve uncertainty.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Prices can change rapidly and without warning.</li>
                <li>You may lose some or all of the value associated with your positions.</li>
                <li>SpeculateX does not guarantee accuracy of market data or future outcomes.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Smart Contract and Blockchain Risk</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                Interactions with decentralized systems involve risks such as:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Smart contract failures and vulnerabilities</li>
                <li>Chain reorganizations</li>
                <li>Network congestion or downtime</li>
                <li>Unexpected gas fees or failed transactions</li>
                <li>Permanent loss of tokens</li>
                <li>Bridge failures or cross chain risks</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                SpeculateX does not audit or control underlying smart contracts.
              </p>
            </section>

            {/* Section 3 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Regulatory and Legal Risk</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Prediction markets are regulated differently across jurisdictions. Laws may change at any time and could restrict access to platforms or markets.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                You are responsible for ensuring that your use of third party platforms is legal in your location.
              </p>
            </section>

            {/* Section 4 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Security and Wallet Risks</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                Using crypto assets involves the risk of:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Theft</li>
                <li>Phishing</li>
                <li>Malware</li>
                <li>Lost private keys</li>
                <li>Unauthorized access</li>
                <li>Irrecoverable transactions</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                SpeculateX does not custody funds and cannot recover lost assets.
              </p>
            </section>

            {/* Section 5 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Technical and Operational Risk</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>The Site may experience delays, outages, maintenance, or service interruptions.</li>
                <li>Information displayed may be delayed, incomplete, or inaccurate.</li>
                <li>You should not rely solely on Site content to make financial decisions.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. No Financial Advice</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                Information provided by SpeculateX is educational only. Nothing on the Site constitutes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Financial advice</li>
                <li>Investment advice</li>
                <li>Trading recommendations</li>
                <li>Legal or tax advice</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                You are solely responsible for your decisions.
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. User Responsibility</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                You agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>You understand the risks described above.</li>
                <li>You are capable of evaluating your own decisions.</li>
                <li>You assume full responsibility for all outcomes.</li>
                <li>You will not hold SpeculateX liable for losses, damages, or errors.</li>
              </ul>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#14B8A6] hover:text-[#0d9488] font-bold transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </motion.div>

      </main>
    </div>
  );
}

