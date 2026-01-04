'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import NetworkSelector from '@/components/NetworkSelector';
import { Menu, X, User, LogOut, Copy, Check } from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';
import { useNicknames, getDisplayName } from '@/lib/hooks/useNicknames';
import { NicknameManager } from '@/components/NicknameManager';

// --- Sub-component for account button with nickname support ---
function HeaderAccountButton({ account, openAccountModal }: { account: any, openAccountModal: () => void }) {
  const { nicknames } = useNicknames();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayName = account.address ? getDisplayName(account.address, nicknames) : account.displayName;
  const hasNickname = account.address && nicknames[account.address.toLowerCase()];

  const handleCopyAddress = () => {
    if (account.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="group relative rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 p-[1px]">
          <button
            onClick={() => setIsModalOpen(true)}
            type="button"
            className="relative flex items-center gap-3 rounded-full bg-white dark:bg-gray-900 px-1 py-1 pr-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            {/* Avatar */}
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#14B8A6] to-cyan-500 flex items-center justify-center text-white shadow-md">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {/* Online Dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="flex flex-col items-start leading-none gap-0.5">
              <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500 uppercase tracking-wider">
                {account.displayBalance ? account.displayBalance : 'Connected'}
              </span>
              <span className={`text-xs font-bold text-gray-900 dark:text-gray-100 ${hasNickname ? '' : 'font-mono'}`}>
                {displayName}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Account Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Account Info */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#14B8A6] to-cyan-500 flex items-center justify-center text-white shadow-md">
                    <User className="w-6 h-6" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                      {displayName}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                        {account.address}
                      </span>
                      <button
                        onClick={handleCopyAddress}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Copy address"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Balance */}
                {account.displayBalance && (
                  <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Balance
                    </div>
                    <div className="text-lg font-black text-teal-600 dark:text-teal-400">
                      {account.displayBalance}
                    </div>
                  </div>
                )}

                {/* Nickname Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Set Nickname
                  </h3>
                  <NicknameManager onClose={() => setIsModalOpen(false)} />
                </div>

                {/* Disconnect Button */}
                <button
                  onClick={() => {
                    disconnect();
                    setIsModalOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold transition-colors border border-red-200 dark:border-red-800"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Wallet
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Sub-component to fix nesting/parsing issues ---
function CustomConnectButton({ prefersReducedMotion = false }: { prefersReducedMotion?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={() => {
                      hapticFeedback('medium');
                      openConnectModal();
                    }}
                    type="button"
                    className="group relative inline-flex items-center justify-center rounded-full bg-[#14B8A6] dark:bg-[#14B8A6] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#14B8A6]/25 dark:shadow-[#14B8A6]/30 hover:bg-[#0D9488] dark:hover:bg-[#0D9488] hover:shadow-xl hover:shadow-[#14B8A6]/30 dark:hover:shadow-[#14B8A6]/40 transition-all duration-300 active:scale-95"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25 transition-all active:scale-95"
                  >
                    Wrong Network
                  </button>
                );
              }

              return <HeaderAccountButton account={account} openAccountModal={openAccountModal} />;
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

// --- Main Header Component ---
export default function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Handle reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (isConnected && address) {
        const adminStatus = await checkIsAdmin(address);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [isConnected, address]);

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const isLandingPage = pathname === '/';

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/markets', label: 'Markets' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/leaderboard', label: 'Leaderboard' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 border-b ${scrolled
      ? 'bg-white/70 dark:bg-[#0f1219]/70 backdrop-blur-xl shadow-lg shadow-black/5 border-gray-200/50 dark:border-white/5'
      : 'bg-transparent border-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-16' : 'h-16 sm:h-20'}`}>

          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0 relative z-20" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="relative w-[140px] sm:w-[200px] h-10 sm:h-10 transition-transform duration-300 group-hover:scale-105">
              {/* Light mode logo */}
              <Image
                src="/Whitelogo.png"
                alt="SpeculateX Logo"
                fill
                sizes="(max-width: 640px) 140px, 200px"
                priority
                className="object-contain object-left dark:hidden"
              />
              {/* Dark mode logo */}
              <Image
                src="/darklogo.png"
                alt="SpeculateX Logo"
                fill
                sizes="(max-width: 640px) 140px, 200px"
                priority
                className="object-contain object-left hidden dark:block"
              />
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${active
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId={prefersReducedMotion ? undefined : "navbar-indicator"}
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-cyan-400 mx-auto w-1/2 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                      transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Side - Wallet or Launch App */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 relative z-20">
            {/* Network Selector */}
            <NetworkSelector />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-teal-500 dark:hover:text-teal-400 transition-colors border border-transparent outline-none"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={prefersReducedMotion ? false : { rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { rotate: 90, opacity: 0 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={prefersReducedMotion ? false : { rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { rotate: -90, opacity: 0 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Custom Wallet Button (Desktop) */}
            <div className="hidden sm:block">
              {isLandingPage ? (
                <Link
                  href="/markets"
                  className="group relative inline-flex items-center justify-center rounded-full bg-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 dark:shadow-teal-500/10 hover:bg-teal-600 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300 active:scale-95 overflow-hidden ring-2 ring-transparent hover:ring-teal-500/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <span className="mr-2 relative z-10">Launch App</span>
                  <svg
                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              ) : (
                <CustomConnectButton prefersReducedMotion={prefersReducedMotion} />
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              id="mobile-navigation"
              initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : undefined}
              className="md:hidden absolute top-full left-0 right-0 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-[#0f1219]/95 backdrop-blur-xl shadow-xl overflow-hidden"
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col p-4 space-y-2" role="menu">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      role="menuitem"
                      className={`relative px-4 py-3 rounded-xl text-base font-bold transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${active
                        ? 'text-teal-500 bg-teal-50/50 dark:bg-teal-500/10'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <div className="flex items-center justify-between">
                        {link.label}
                        {active && (
                          <motion.div
                            layoutId={prefersReducedMotion ? undefined : "mobile-menu-indicator"}
                            className="w-1.5 h-1.5 rounded-full bg-teal-500"
                            aria-hidden="true"
                            transition={prefersReducedMotion ? { duration: 0 } : undefined}
                          />
                        )}
                      </div>
                    </Link>
                  );
                })}

                {/* Mobile Connect Button */}
                <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800" role="none">
                  <div className="w-full">
                    <ConnectButton.Custom>
                      {({ openConnectModal, openAccountModal, mounted, account }) => {
                        const connected = mounted && account;
                        return (
                          <button
                            onClick={connected ? openAccountModal : openConnectModal}
                            className="w-full py-3 rounded-xl bg-teal-500 text-white font-bold shadow-lg shadow-teal-500/20 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                            aria-label={connected ? `Manage wallet: ${account.displayName}` : 'Connect your wallet'}
                          >
                            {connected ? account.displayName : 'Connect Wallet'}
                          </button>
                        );
                      }}
                    </ConnectButton.Custom>
                  </div>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header >
  );
}