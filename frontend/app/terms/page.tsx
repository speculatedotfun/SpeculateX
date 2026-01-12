'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import { ArrowLeft, FileText, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const sections = [
  { id: 'agreement', title: '1. Agreement to Terms' },
  { id: 'nature', title: '2. Nature of Our Service' },
  { id: 'affiliate', title: '3. Affiliate Disclosures' },
  { id: 'intellectual', title: '4. Intellectual Property' },
  { id: 'prohibited', title: '5. Prohibited Uses' },
  { id: 'third-party', title: '6. Third Party Platforms' },
  { id: 'no-advice', title: '7. No Financial Advice' },
  { id: 'security', title: '8. Security & Liability' },
  { id: 'indemnification', title: '9. Indemnification' },
  { id: 'dispute', title: '10. Dispute Resolution' },
  { id: 'termination', title: '11. Termination' },
  { id: 'general', title: '12. General Provisions' },
  { id: 'contact', title: 'Contact Information' },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 text-sm font-bold">
          {title.split('.')[0]}
        </span>
        {title.split('. ')[1] || title}
      </h2>
      <div className="pl-11 space-y-4">
        {children}
      </div>
    </section>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{children}</p>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState('agreement');

  return (
    <div className="flex-1 flex flex-col relative font-sans bg-[#FAF9FF] dark:bg-[#0f172a] min-h-screen">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-teal-400/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      <Header />

      <main className="flex-1 relative z-10 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8">

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

        <div className="flex gap-8">
          {/* Sidebar - Table of Contents */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden lg:block w-64 shrink-0"
          >
            <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Contents
              </h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${activeSection === section.id
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </motion.aside>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-w-0"
          >
            {/* Header Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 mb-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/25">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-1">
                    Terms of Service
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last Updated: December 19, 2025
                  </p>
                </div>
              </div>
            </div>

            {/* Content Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
              <div className="space-y-10">

                <Section id="agreement" title="1. Agreement to Terms">
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 mb-4">
                    <Paragraph>
                      By accessing SpeculateX, you agree to these Terms of Service, our Privacy Policy, and all applicable guidelines. If you don't agree, please stop using the Site immediately.
                    </Paragraph>
                  </div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Eligibility Requirements</h4>
                  <List items={[
                    'Be at least 18 years of age or the age of legal majority',
                    'Have full legal capacity to enter contracts',
                    'Not be restricted from accessing prediction market services',
                    'Comply with all applicable laws and regulations'
                  ]} />
                </Section>

                <Section id="nature" title="2. Nature of Our Service">
                  <Paragraph>
                    SpeculateX provides information, data, analytics, and user interfaces related to prediction markets and blockchain activity. We are an <strong className="text-gray-900 dark:text-white">independent informational platform</strong>.
                  </Paragraph>
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-700/30">
                      <h5 className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm mb-2">What We Provide</h5>
                      <List items={['Market analytics & data', 'Educational content', 'Trading interfaces', 'Industry insights']} />
                    </div>
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200/50 dark:border-rose-700/30">
                      <h5 className="font-semibold text-rose-600 dark:text-rose-400 text-sm mb-2">What We Don't Do</h5>
                      <List items={['Execute trades', 'Hold user funds', 'Provide custody', 'Act as a broker']} />
                    </div>
                  </div>
                </Section>

                <Section id="affiliate" title="3. Affiliate Disclosures">
                  <Paragraph>
                    SpeculateX may participate in referral or affiliate programs. Clicking certain links may generate commissions at no additional cost to you. Compensation does not influence our content's objectivity.
                  </Paragraph>
                </Section>

                <Section id="intellectual" title="4. Intellectual Property">
                  <Paragraph>
                    All content on the Site, including text, branding, data, code, and design, is owned by SpeculateX or our licensors and is protected by intellectual property laws.
                  </Paragraph>
                  <Paragraph>
                    We provide you a limited, revocable, non-exclusive license to use the Site for personal, non-commercial purposes only.
                  </Paragraph>
                </Section>

                <Section id="prohibited" title="5. Prohibited Uses">
                  <List items={[
                    'Illegal, fraudulent, or harmful activity',
                    'Hacking, disrupting, or bypassing security',
                    'Scraping, data extraction, or automated crawling',
                    'Impersonation or misrepresentation',
                    'Manipulating traffic or user behavior',
                    'Bypassing geo-restrictions via VPNs'
                  ]} />
                </Section>

                <Section id="third-party" title="6. Third Party Platforms">
                  <Paragraph>
                    SpeculateX contains links to third-party websites and blockchain platforms. We do not control or guarantee their accuracy, safety, or legal compliance. Your interactions with third parties are at your own risk.
                  </Paragraph>
                </Section>

                <Section id="no-advice" title="7. No Financial Advice">
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30">
                    <Paragraph>
                      <strong className="text-amber-700 dark:text-amber-400">⚠️ Important:</strong> All content is for educational purposes only. We do not provide investment, legal, tax, or financial advice. You are solely responsible for your decisions.
                    </Paragraph>
                  </div>
                </Section>

                <Section id="security" title="8. Security & Liability">
                  <Paragraph>
                    Blockchain interactions carry inherent risks including smart contract failures, network congestion, phishing, and loss of funds. The Site is provided "AS IS" without warranties.
                  </Paragraph>
                  <Paragraph>
                    SpeculateX is not responsible for lost keys, stolen wallets, user errors, or losses from blockchain vulnerabilities.
                  </Paragraph>
                </Section>

                <Section id="indemnification" title="9. Indemnification">
                  <Paragraph>
                    You agree to indemnify and hold harmless SpeculateX from all claims arising from your use of the Site, violations of these Terms, or interactions with blockchain networks.
                  </Paragraph>
                </Section>

                <Section id="dispute" title="10. Dispute Resolution">
                  <Paragraph>
                    These Terms are governed by the laws of Singapore. Disputes shall be resolved through binding arbitration conducted in English before a single arbitrator. No class actions are permitted.
                  </Paragraph>
                </Section>

                <Section id="termination" title="11. Termination">
                  <Paragraph>
                    These Terms remain active while you use the Site. SpeculateX may suspend or terminate your access at any time for violations or security concerns.
                  </Paragraph>
                </Section>

                <Section id="general" title="12. General Provisions">
                  <List items={[
                    'These Terms constitute the full agreement between you and SpeculateX',
                    'If any provision is unenforceable, the rest remains valid',
                    'You may not assign your rights without permission',
                    'We are not liable for delays caused by force majeure',
                    'The English version of these Terms prevails'
                  ]} />
                </Section>

                <Section id="contact" title="Contact Information">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a
                      href="https://speculatex.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition-colors text-center"
                    >
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Website</div>
                      <div className="text-teal-600 dark:text-teal-400 font-semibold">speculatex.io</div>
                    </a>
                    <a
                      href="mailto:speculatedotfun@gmail.com"
                      className="flex-1 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-teal-500 transition-colors text-center"
                    >
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</div>
                      <div className="text-teal-600 dark:text-teal-400 font-semibold">speculatedotfun@gmail.com</div>
                    </a>
                  </div>
                </Section>

              </div>
            </div>
          </motion.div>
        </div>

      </main>
    </div>
  );
}
