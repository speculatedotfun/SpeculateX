'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { ArrowLeft, AlertTriangle, Shield, Scale, Lock, Server, DollarSign, UserCheck } from 'lucide-react';

const risks = [
  {
    id: 'market',
    icon: DollarSign,
    title: 'Market Risk',
    color: 'amber',
    description: 'Prediction markets and synthetic markets involve uncertainty.',
    items: [
      'Prices can change rapidly and without warning',
      'You may lose some or all of the value associated with your positions',
      'SpeculateX does not guarantee accuracy of market data or future outcomes'
    ]
  },
  {
    id: 'blockchain',
    icon: Server,
    title: 'Blockchain & Smart Contract Risk',
    color: 'purple',
    description: 'Interactions with decentralized systems involve risks such as:',
    items: [
      'Smart contract failures and vulnerabilities',
      'Chain reorganizations and network congestion',
      'Unexpected gas fees or failed transactions',
      'Permanent loss of tokens',
      'Bridge failures or cross-chain risks'
    ]
  },
  {
    id: 'regulatory',
    icon: Scale,
    title: 'Regulatory & Legal Risk',
    color: 'blue',
    description: 'Prediction markets are regulated differently across jurisdictions.',
    items: [
      'Laws may change at any time and could restrict access',
      'You are responsible for ensuring legal compliance in your location',
      'Some platforms have geographic restrictions'
    ]
  },
  {
    id: 'security',
    icon: Lock,
    title: 'Security & Wallet Risk',
    color: 'rose',
    description: 'Using crypto assets involves the risk of:',
    items: [
      'Theft, phishing, and malware',
      'Lost private keys',
      'Unauthorized access to your wallet',
      'Irrecoverable transactions'
    ]
  },
  {
    id: 'technical',
    icon: Server,
    title: 'Technical & Operational Risk',
    color: 'cyan',
    description: 'Platform reliability concerns:',
    items: [
      'The Site may experience delays, outages, or maintenance',
      'Information displayed may be delayed or inaccurate',
      'You should not rely solely on Site content for financial decisions'
    ]
  },
  {
    id: 'advice',
    icon: DollarSign,
    title: 'No Financial Advice',
    color: 'emerald',
    description: 'Information provided by SpeculateX is educational only. Nothing on the Site constitutes:',
    items: [
      'Financial or investment advice',
      'Trading recommendations',
      'Legal or tax advice'
    ]
  },
  {
    id: 'responsibility',
    icon: UserCheck,
    title: 'User Responsibility',
    color: 'indigo',
    description: 'By using SpeculateX, you agree that:',
    items: [
      'You understand the risks described above',
      'You are capable of evaluating your own decisions',
      'You assume full responsibility for all outcomes',
      'You will not hold SpeculateX liable for losses'
    ]
  }
];

const colorClasses: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    border: 'border-amber-200/50 dark:border-amber-700/30',
    icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    text: 'text-amber-700 dark:text-amber-400'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/10',
    border: 'border-purple-200/50 dark:border-purple-700/30',
    icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    text: 'text-purple-700 dark:text-purple-400'
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-200/50 dark:border-blue-700/30',
    icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    text: 'text-blue-700 dark:text-blue-400'
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-900/10',
    border: 'border-rose-200/50 dark:border-rose-700/30',
    icon: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    text: 'text-rose-700 dark:text-rose-400'
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/10',
    border: 'border-cyan-200/50 dark:border-cyan-700/30',
    icon: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    text: 'text-cyan-700 dark:text-cyan-400'
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/10',
    border: 'border-emerald-200/50 dark:border-emerald-700/30',
    icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-400'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/10',
    border: 'border-indigo-200/50 dark:border-indigo-700/30',
    icon: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    text: 'text-indigo-700 dark:text-indigo-400'
  }
};

export default function RiskDisclosurePage() {
  return (
    <div className="flex-1 flex flex-col relative font-sans bg-[#FAF9FF] dark:bg-[#0f172a] min-h-screen">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-rose-400/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <Header />

      <main className="flex-1 relative z-10 mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl p-6 sm:p-8 mb-6 shadow-xl shadow-rose-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                Risk Disclosure
              </h1>
              <p className="text-rose-100 text-sm">
                for Crypto and Prediction Markets • Updated Nov 24, 2025
              </p>
            </div>
          </div>
          <p className="mt-4 text-white/90 leading-relaxed">
            This statement explains the significant risks associated with engaging in prediction market activity, interacting with blockchain networks, or using tools provided by SpeculateX.
          </p>
        </motion.div>

        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 mb-6 flex items-center gap-3"
        >
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>By using SpeculateX, you acknowledge and accept all risks described below.</strong> Only invest what you can afford to lose.
          </p>
        </motion.div>

        {/* Risk Cards Grid */}
        <div className="space-y-4">
          {risks.map((risk, index) => {
            const colors = colorClasses[risk.color];
            const Icon = risk.icon;

            return (
              <motion.div
                key={risk.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className={`${colors.bg} border ${colors.border} rounded-xl p-5`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold ${colors.text} mb-1`}>{risk.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{risk.description}</p>
                    <ul className="space-y-1.5">
                      {risk.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="w-1 h-1 rounded-full bg-gray-400 mt-2 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

      </main>
    </div>
  );
}
