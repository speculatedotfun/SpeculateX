'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { isAdmin as checkIsAdmin } from '@/lib/hooks';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-md shadow-sm border-gray-200/50' 
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0 relative z-20" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="relative w-[140px] sm:w-[160px] h-10 sm:h-12 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.jpg"
                alt="SpeculateX Logo"
                fill
                sizes="(max-width: 640px) 140px, 160px"
                priority
                className="object-contain object-left"
              />
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-2 flex-1 justify-center">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                    active
                      ? 'text-[#14B8A6]'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-[#14B8A6]/10 rounded-full -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Side - Wallet or Launch App */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 relative z-20">
            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-[#14B8A6] transition-colors border border-transparent focus:border-[#14B8A6]/20 focus:bg-[#14B8A6]/5 focus:text-[#14B8A6] outline-none"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.svg
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    className="w-6 h-6"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    className="w-6 h-6"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>
            
            {isLandingPage ? (
              <Link
                href="/markets"
                className="group relative inline-flex items-center justify-center rounded-full bg-[#14B8A6] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#14B8A6]/25 hover:bg-[#0D9488] hover:shadow-xl hover:shadow-[#14B8A6]/30 transition-all duration-300 active:scale-95"
              >
                <span className="mr-2">Launch App</span>
                <svg 
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <div className="wallet-connect-wrapper">
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
                      (!authenticationStatus ||
                        authenticationStatus === 'authenticated');

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
                                onClick={openConnectModal}
                                type="button"
                                className="group relative inline-flex items-center justify-center rounded-full bg-[#14B8A6] px-5 sm:px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#14B8A6]/25 hover:bg-[#0D9488] hover:shadow-xl hover:shadow-[#14B8A6]/30 transition-all duration-300 active:scale-95"
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

                          return (
                            <div className="flex items-center gap-2 sm:gap-3">
                              <button
                                onClick={openChainModal}
                                type="button"
                                className="hidden sm:flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-2 hover:border-gray-300 hover:shadow-sm transition-all"
                              >
                                {chain.hasIcon && (
                                  <div
                                    className="w-5 h-5 rounded-full overflow-hidden shadow-sm"
                                    style={{ background: chain.iconBackground }}
                                  >
                                    {chain.iconUrl && (
                                      <Image
                                        alt={chain.name ?? 'Chain icon'}
                                        src={chain.iconUrl}
                                        width={20}
                                        height={20}
                                        className="object-cover"
                                        unoptimized
                                      />
                                    )}
                                  </div>
                                )}
                                <span className="text-sm font-bold text-gray-700">
                                  {chain.name}
                                </span>
                              </button>

                              <button
                                onClick={openAccountModal}
                                type="button"
                                className="group flex items-center gap-2 sm:gap-3 rounded-full bg-white border border-gray-200 pl-2 sm:pl-3 pr-2 sm:pr-4 py-1.5 hover:border-[#14B8A6] hover:ring-2 hover:ring-[#14B8A6]/10 transition-all shadow-sm hover:shadow-md"
                              >
                                <div className="flex flex-col items-end leading-none hidden sm:flex">
                                  <span className="text-xs font-bold text-gray-900">
                                    {account.displayBalance
                                      ? account.displayBalance
                                      : ''}
                                  </span>
                                  <span className="text-[10px] font-semibold text-gray-500 group-hover:text-[#14B8A6] transition-colors">
                                    {account.displayName}
                                  </span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#14B8A6] to-emerald-600 flex items-center justify-center text-white shadow-sm">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden absolute top-full left-0 right-0 border-t border-gray-100 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden"
            >
              <nav className="flex flex-col py-4 space-y-2 px-4 bg-white">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`relative px-4 py-3 rounded-xl text-base font-bold transition-all ${
                        active
                          ? 'text-[#14B8A6] bg-[#14B8A6]/5'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {link.label}
                        {active && (
                          <motion.div
                            layoutId="mobile-menu-indicator"
                            className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]"
                          />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
