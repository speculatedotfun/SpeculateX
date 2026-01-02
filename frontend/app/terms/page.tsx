'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Header from '@/components/Header';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans selection:bg-[#14B8A6]/30 selection:text-[#0f0a2e] dark:selection:text-white">

      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF9FF] via-[#F0F4F8] to-[#E8F0F5] dark:from-[#0f172a] dark:via-[#1a1f3a] dark:to-[#1e293b]"></div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 m-auto h-[500px] w-[500px] rounded-full bg-[#14B8A6] opacity-10 blur-[100px]"></div>
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl border border-gray-200 dark:border-gray-700 rounded-[32px] p-8 lg:p-12 shadow-xl"
        >
          <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-2">
            SpeculateX Terms of Service
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Last Updated: 19.12.2025
          </p>

          <div className="prose prose-slate dark:prose-invert max-w-none">

            {/* Section 1 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Agreement to Terms</h2>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">1.1 Binding Agreement</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Welcome to SpeculateX (&quot;SpeculateX,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our,&quot; or &quot;the Site&quot;). These Terms of Service (&quot;Terms&quot;) form a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and SpeculateX regarding your access to and use of our website, applications, analytics, and related services located at https://speculatex.io/.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                By accessing, browsing, or using SpeculateX in any capacity, you acknowledge that you have read, understood, and agree to comply with these Terms, along with our Privacy Policy and any additional guidelines posted on the Site. If you do not agree to these Terms, you must immediately stop using the Site.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">1.2 Eligibility Requirements</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                To use SpeculateX, you must:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Be at least 18 years of age or the age of legal majority in your jurisdiction</li>
                <li>Have full legal capacity to enter contracts</li>
                <li>Not be restricted from accessing prediction market information services</li>
                <li>Comply with all applicable laws, rules, and regulations</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You represent and warrant that you satisfy all eligibility requirements. If you use SpeculateX on behalf of an organization, you confirm that you have authority to bind that entity to these Terms.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">1.3 Changes to Terms</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                We may revise, update, or modify these Terms at any time at our sole discretion. Updates become effective immediately once posted on this page. Your continued use of the Site after modifications confirms your acceptance of the updated Terms. We may provide additional notice for significant changes, such as email notifications or banners on the Site.
              </p>
            </section>

            {/* Section 2 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Nature of Our Service</h2>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">2.1 Informational and Educational Resource</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                SpeculateX provides information, data, analytics, and user interfaces related to event outcomes, market trends, Web3 technologies, decentralized prediction markets, and blockchain activity. Content available on the Site may include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Explanation of prediction market mechanics</li>
                <li>Tools for exploring synthetic markets</li>
                <li>Commentary, analytics, and educational material</li>
                <li>Guides on how prediction platforms operate</li>
                <li>Market comparisons and industry insights</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                SpeculateX does not operate or provide real prediction markets, trading systems, or financial services.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">2.2 Independent Platform</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                SpeculateX is an independent project. We are not affiliated with, endorsed by, or sponsored by any prediction market operator, including but not limited to Polymarket, Kalshi, or similar companies. All trademarks belong to their respective owners and are referenced only for informational purposes.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">2.3 No Execution or Financial Operations</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                SpeculateX:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Does not execute trades</li>
                <li>Does not match buyers and sellers</li>
                <li>Does not provide custody or hold user funds</li>
                <li>Does not offer wallets, accounts, or financial instruments</li>
                <li>Does not act as a broker, exchange, money transmitter, or investment service</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Any decision to interact with blockchain networks or third party platforms is entirely your choice and responsibility.
              </p>
            </section>

            {/* Section 3 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Affiliate, Referral, or Partnership Disclosures</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                If applicable, SpeculateX may participate in referral or affiliate programs. Clicking certain links may generate commissions at no additional cost to you. Compensation does not influence the objectivity or accuracy of our content.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                Any sponsored or paid material will be clearly marked as &quot;Sponsored&quot; or &quot;Advertisement.&quot;
              </p>
            </section>

            {/* Section 4 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Intellectual Property Rights</h2>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">4.1 Ownership</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                All content on the Site, including text, branding, data, code, images, and design, is owned by SpeculateX or licensors and is protected by intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">4.2 Limited License</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We provide you a limited, revocable, non exclusive, non transferable license to use the Site for personal, non commercial purposes. You may not reproduce, copy, scrape, alter, distribute, or create derivative works without written approval.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">4.3 User Content</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                If you submit content to the Site, you grant SpeculateX a worldwide, royalty free license to display and use that content for the operation and promotion of the Site. You are responsible for ensuring all submitted material belongs to you.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">4.4 DMCA Requests</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Send takedown notices to <a href="mailto:speculatedotfun@gmail.com" className="text-[#14B8A6] hover:underline">speculatedotfun@gmail.com</a> including all required DMCA elements.
              </p>
            </section>

            {/* Section 5 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Prohibited Uses</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                You agree not to engage in:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Illegal, fraudulent, or harmful activity</li>
                <li>Attempts to hack, disrupt, overload, reverse engineer, or bypass security</li>
                <li>Scraping, data extraction, automated crawling, or unauthorized use of our data</li>
                <li>Impersonation, misrepresentation, or creating false affiliations</li>
                <li>Activities intended to manipulate traffic, analytics, or user behavior</li>
                <li>Bypassing geo restrictions of third party platforms using VPNs or proxies</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                These restrictions protect the integrity and safety of the Site and users.
              </p>
            </section>

            {/* Section 6 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Third Party Platforms and External Links</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                SpeculateX contains links to third party websites, blockchain platforms, prediction markets, and Web3 tools. We do not control or guarantee:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Accuracy of their content</li>
                <li>Safety of their smart contracts</li>
                <li>Legal compliance of their services</li>
                <li>Security of their systems</li>
                <li>Availability or uptime</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Your interactions with third parties are entirely at your own risk. Many platforms have geographic restrictions. It is your responsibility to stay compliant with local laws.
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. No Financial or Trading Advice</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                All Site content is provided for educational and informational purposes only. SpeculateX does not provide:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Investment advice</li>
                <li>Legal advice</li>
                <li>Tax guidance</li>
                <li>Financial recommendations</li>
                <li>Trading signals</li>
                <li>Predictions or guarantees of future outcomes</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Markets are volatile and risky</li>
                <li>Past performance does not guarantee future results</li>
                <li>You are solely responsible for your decisions</li>
                <li>SpeculateX is not liable for your trading losses, market outcomes, or strategies</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Security, Blockchain Risks, and Limitations of Liability</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                SpeculateX uses Web3 tools, decentralized technologies, and third party integrations. You acknowledge the inherent risks, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Smart contract failures or exploits</li>
                <li>Temporary or permanent loss of tokens or funds</li>
                <li>Network congestion or downtime</li>
                <li>Incorrect wallet interactions</li>
                <li>Gas fees, slippage, failed transactions</li>
                <li>Phishing, hacking, or unauthorized access</li>
                <li>Forks, chain reorganizations, or consensus failures</li>
                <li>Market manipulation by external parties</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                SpeculateX is not responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                <li>Lost private keys</li>
                <li>Stolen wallets</li>
                <li>User errors</li>
                <li>Incorrect transactions</li>
                <li>Losses due to blockchain vulnerabilities</li>
                <li>Losses from reliance on Site information</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                The Site is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of any kind. To the fullest extent allowed by law, SpeculateX is not liable for indirect, incidental, consequential, punitive, or special damages.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Where liability cannot be excluded, our total liability is limited to 50 USD or the amount paid to SpeculateX in the last 12 months, whichever is lower.
              </p>
            </section>

            {/* Section 9 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Indemnification</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                You agree to indemnify and hold harmless SpeculateX, its team, contractors, partners, and affiliates from all claims arising from:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Your use of the Site</li>
                <li>Violations of these Terms</li>
                <li>Infringement of intellectual property</li>
                <li>Interactions with blockchain networks</li>
                <li>Activity on third party platforms</li>
                <li>Illegal or fraudulent conduct</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Dispute Resolution</h2>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">10.1 Governing Law</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                These Terms are governed by the laws of Singapore, excluding conflict of laws rules.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">10.2 Informal Resolution</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Users must attempt to resolve disputes by contacting <a href="mailto:legal@speculatex.io" className="text-[#14B8A6] hover:underline">legal@speculatex.io</a> within 30 days before initiating arbitration.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">10.3 Binding Arbitration</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Disputes shall be resolved through binding arbitration conducted in English, seated in Singapore, before a single arbitrator. Arbitration may occur remotely subject to agreement.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">10.4 No Class Actions</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                All disputes must be brought on an individual basis. No class actions, mass claims, or collective proceedings are permitted.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">10.5 Exceptions</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Either party may seek injunctive or equitable relief in court for intellectual property violations, unauthorized access, or actions creating potential irreparable harm.
              </p>
            </section>

            {/* Section 11 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Term and Termination</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                These Terms remain active while you use the Site. SpeculateX may suspend or terminate your access at any time if you violate these Terms, misuse the Site, or pose a security risk. Upon termination, all rights granted to you cease immediately.
              </p>
            </section>

            {/* Section 12 */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">12. General Provisions</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>These Terms and our Privacy Policy constitute the full agreement between you and SpeculateX.</li>
                <li>If any provision is unenforceable, the rest remains valid.</li>
                <li>Failure to enforce any provision is not a waiver.</li>
                <li>You may not assign your rights without permission; we may assign freely.</li>
                <li>We are not liable for delays caused by events beyond our control (force majeure).</li>
                <li>Notices may be emailed or posted on the Site.</li>
                <li>These Terms do not create a partnership, employment, or agency relationship.</li>
                <li>The English version of these Terms prevails.</li>
              </ul>
            </section>

            {/* Contact Information */}
            <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Contact Information</h2>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p>
                  <strong>Website:</strong>{' '}
                  <a href="https://speculatex.io/" className="text-[#14B8A6] hover:underline" target="_blank" rel="noopener noreferrer">
                    https://speculatex.io/
                  </a>
                </p>
                <p>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:speculatedotfun@gmail.com" className="text-[#14B8A6] hover:underline">
                    speculatedotfun@gmail.com
                  </a>
                </p>
              </div>
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

