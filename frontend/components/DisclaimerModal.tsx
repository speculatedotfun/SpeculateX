'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

const DISCLAIMER_KEY = 'speculatex-disclaimer-accepted';

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check if user has already accepted
    const accepted = localStorage.getItem(DISCLAIMER_KEY);
    if (!accepted) {
      setIsOpen(true);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setIsOpen(false);
  };

  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  // Don't render on server
  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-[#1a1f3a] rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-2 border-gray-200 dark:border-gray-700 pointer-events-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                      SpeculateX Disclaimer
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Please read before proceeding
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                    Before using SpeculateX, please read the following statement.
                  </p>

                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    SpeculateX provides market information, analytics, and educational content related to prediction markets and blockchain platforms. SpeculateX does not operate prediction markets or execute trades. SpeculateX does not provide financial, investment, legal, or tax advice.
                  </p>

                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                    All activity you conduct through third party platforms is entirely at your own risk.
                  </p>

                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                    By proceeding, you acknowledge and agree that:
                  </p>

                  <ul className="space-y-3 mt-4 list-none pl-0">
                    <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>You are at least 18 years old</span>
                    </li>
                    <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>You understand that prediction markets and crypto assets carry significant risk</span>
                    </li>
                    <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>SpeculateX is not responsible for financial losses, smart contract failures, hacks, or user mistakes</span>
                    </li>
                    <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>Nothing on the Site guarantees accuracy, profits, or future outcomes</span>
                    </li>
                    <li className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                      <span>You assume full responsibility for your decisions and actions</span>
                    </li>
                  </ul>

                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-6 font-semibold">
                    If you do not agree, please exit the Site.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={handleExit}
                  className="px-6 py-3 rounded-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Exit Site
                </button>
                <button
                  onClick={handleAccept}
                  className="px-8 py-3 rounded-full bg-[#14B8A6] hover:bg-[#0d9488] text-white font-bold shadow-lg shadow-[#14B8A6]/25 hover:shadow-xl hover:shadow-[#14B8A6]/30 transition-all active:scale-95"
                >
                  I Accept
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

