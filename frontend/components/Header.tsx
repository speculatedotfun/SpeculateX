'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { isAdmin as checkIsAdmin } from '@/lib/accessControl';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import NetworkSelector from '@/components/NetworkSelector';
import { Menu, X, User, Droplet, Users, Search as SearchIcon, LogOut, Copy, Check } from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';
import { useNicknames, getDisplayName } from '@/lib/hooks/useNicknames';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';

// --- Sub-component for account button with nickname support ---
function HeaderAccountButton({ account, openAccountModal }: { account: any, openAccountModal: () => void }) {
  const { nicknames } = useNicknames();
  const displayName = account.address ? getDisplayName(account.address, nicknames) : account.displayName;
  const hasNickname = account.address && nicknames[account.address.toLowerCase()];

  return (
    <div className="flex items-center gap-3">
      <div className="group relative rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 p-[1px]">
        <button
          onClick={openAccountModal}
          type="button"
          className="relative flex items-center gap-3 rounded-full bg-white dark:bg-gray-900 px-1 py-1 pr-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:-translate-y-[1px] hover:shadow-sm"
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
            <span className={`text-sm font-black text-gray-900 dark:text-gray-100 ${hasNickname ? '' : 'font-mono'}`}>
              {displayName}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

// --- Custom Account Dropdown ---
function AccountDropdown({ onDisconnect }: { onDisconnect: () => void }) {
  const { address } = useAccount();
  const { nicknames } = useNicknames();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayName = address ? getDisplayName(address, nicknames) : '';
  const hasNickname = address && nicknames[address.toLowerCase()];

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative">
      <div className="group relative rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 p-[1px]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="relative flex items-center gap-3 rounded-full bg-white dark:bg-gray-900 px-1 py-1 pr-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:-translate-y-[1px] hover:shadow-sm"
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
              Connected
            </span>
            <span className={`text-sm font-black text-gray-900 dark:text-gray-100 ${hasNickname ? '' : 'font-mono'}`}>
              {displayName}
            </span>
          </div>
        </button>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/30 border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
            >
              {/* Address */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-gray-900 dark:text-white truncate flex-1">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onDisconnect();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Disconnect</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-component with custom modal ---
function CustomConnectButton({ prefersReducedMotion = false }: { prefersReducedMotion?: boolean }) {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {!isConnected ? (
        <button
          onClick={() => {
            hapticFeedback('medium');
            setIsModalOpen(true);
          }}
          type="button"
          className="group relative inline-flex items-center justify-center rounded-full bg-[#14B8A6] dark:bg-[#14B8A6] px-6 py-3 text-base font-black text-white shadow-lg shadow-[#14B8A6]/25 dark:shadow-[#14B8A6]/30 hover:bg-[#0D9488] dark:hover:bg-[#0D9488] hover:shadow-xl hover:shadow-[#14B8A6]/30 dark:hover:shadow-[#14B8A6]/40 transition-all duration-300 active:scale-95"
        >
          Connect Wallet
        </button>
      ) : (
        <AccountDropdown onDisconnect={() => disconnect()} />
      )}

      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

// --- Mobile Connect Button ---
function MobileConnectButton({ onClose }: { onClose: () => void }) {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { nicknames } = useNicknames();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayName = address ? getDisplayName(address, nicknames) : '';

  const handleClick = () => {
    if (isConnected) {
      disconnect();
      onClose();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full py-3 rounded-xl bg-teal-500 text-white font-bold shadow-lg shadow-teal-500/20 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label={isConnected ? `Disconnect wallet: ${displayName}` : 'Connect your wallet'}
      >
        {isConnected ? `Disconnect (${displayName})` : 'Connect Wallet'}
      </button>

      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          onClose();
        }}
      />
    </>
  );
}

// --- Main Header Component ---
interface HeaderProps {
  stats?: {
    liquidity: string;
    traders: number | string;
  };
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

export default function Header(props: HeaderProps = {}) {
  const { stats, searchTerm = '', onSearchChange, showSearch = false } = props;
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

  const navLinks = [
    { href: '/', label: 'Markets' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/leaderboard', label: 'Leaderboard' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header className={`sticky top-0 z-50 bg-white/60 dark:bg-[#0f1219]/60 backdrop-blur-md border-b border-black/5 dark:border-white/5 transition-all duration-300 ${scrolled ? 'shadow-sm shadow-black/5' : ''}`}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 transition-all duration-300 h-16">

          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Logo */}
            <Link href="/" className="flex items-center group relative z-20 -ml-4 sm:-ml-6 lg:-ml-8" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="relative w-[160px] sm:w-[220px] h-9 sm:h-10 transition-transform duration-300 group-hover:scale-105 pl-4 sm:pl-6 lg:pl-8">
                {/* Light mode logo */}
                <Image
                  src="/Whitelogo.png"
                  alt="SpeculateX Logo"
                  fill
                  sizes="(max-width: 640px) 160px, 220px"
                  priority
                  className="object-contain object-left dark:hidden"
                />
                {/* Dark mode logo */}
                <Image
                  src="/darklogo.png"
                  alt="SpeculateX Logo"
                  fill
                  sizes="(max-width: 640px) 160px, 220px"
                  priority
                  className="object-contain object-left hidden dark:block"
                />
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-2">
              {/* Vertical Divider */}
              <div className="w-px h-6 bg-gray-300/60 dark:bg-gray-600/60" />

              {/* Navigation Links */}
              <nav className="flex items-center gap-1">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`relative px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm ${active
                        ? 'text-teal-600 dark:text-teal-400 font-bold'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                        }`}
                    >
                      {link.label}
                      {active && (
                        <motion.div
                          layoutId={prefersReducedMotion ? undefined : "navbar-indicator"}
                          className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Center: Search Bar (only on markets page) */}
          {showSearch && onSearchChange && (
            <div className="hidden lg:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <SearchIcon className="h-4 w-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                </div>
                <input
                  type="text"
                  className="block w-full h-11 pl-11 pr-20 rounded-full bg-white/80 dark:bg-gray-800/60 border border-black/5 dark:border-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/30 dark:focus:border-teal-500/30 focus:bg-white dark:focus:bg-gray-800/80 text-sm transition-all font-medium shadow-sm"
                  placeholder="Search markets..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <kbd className="hidden xl:inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100/80 dark:bg-gray-700/60 border border-black/5 dark:border-white/5">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>
          )}

          {/* Right Side - Stats + Network + Wallet */}
          <div className="flex items-center gap-2 flex-shrink-0 relative z-20 ml-auto">
            {/* Stats (optional) - Merged into one pill */}
            {stats && (
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50">
                <Droplet className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{stats.liquidity}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
                <Users className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{stats.traders}</span>
              </div>
            )}

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
              <CustomConnectButton prefersReducedMotion={prefersReducedMotion} />
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
                  <MobileConnectButton onClose={() => setIsMobileMenuOpen(false)} />
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header >
  );
}