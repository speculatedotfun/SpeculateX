'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useConnect, useAccount, useDisconnect, Connector } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, ChevronRight, ChevronDown, Loader2, CheckCircle2, AlertCircle, Sparkles, Zap } from 'lucide-react';
import Image from 'next/image';

// Wallet icons mapping
const WALLET_ICONS: Record<string, string> = {
    metamask: '/wallets/metamask.svg',
    'com.rabby': '/wallets/rabby.svg',
    rabby: '/wallets/rabby.svg',
    okx: '/wallets/okx.svg',
    'okx wallet': '/wallets/okx.svg',
    trust: '/wallets/trust.svg',
    'trust wallet': '/wallets/trust.svg',
    coinbase: '/wallets/coinbase.svg',
    'coinbase wallet': '/wallets/coinbase.svg',
    walletconnect: '/wallets/walletconnect.svg',
    safe: '/wallets/safe.svg',
    ledger: '/wallets/ledger.svg',
    argent: '/wallets/argent.svg',
    rainbow: '/wallets/rainbow.svg',
    injected: '/wallets/injected.svg',
    // BSC Popular wallets
    binance: '/wallets/binance.svg',
    'binance wallet': '/wallets/binance.svg',
    'bnb chain': '/wallets/binance.svg',
    tokenpocket: '/wallets/tokenpocket.svg',
    'token pocket': '/wallets/tokenpocket.svg',
    bitget: '/wallets/bitget.svg',
    'bitget wallet': '/wallets/bitget.svg',
    phantom: '/wallets/phantom.svg',
    zerion: '/wallets/zerion.svg',
    imtoken: '/wallets/imtoken.svg',
};

// Get wallet icon with fallback
function getWalletIcon(connectorId: string, connectorName: string): string {
    const id = connectorId.toLowerCase();
    const name = connectorName.toLowerCase();

    return WALLET_ICONS[id] || WALLET_ICONS[name] || '/wallets/default.svg';
}

// Wallet group definitions based on connector IDs and names
const WALLET_GROUPS = {
    popularBsc: [
        'metamask', 'metaMask', 'binance', 'bnb', 'trust', 'trust wallet',
        'okx', 'okx wallet', 'bitget', 'tokenpocket', 'token pocket'
    ],
    moreWallets: [
        'rabby', 'com.rabby', 'coinbase', 'coinbase wallet', 'phantom',
        'zerion', 'imtoken', 'rainbow'
    ],
    walletconnect: ['walletconnect', 'walletConnect'],
    multisigHardware: ['safe', 'gnosis safe', 'ledger'],
    other: ['argent', 'injected', 'io.metamask'],
};

function getWalletGroup(connectorId: string, connectorName: string): 'popularBsc' | 'moreWallets' | 'walletconnect' | 'multisigHardware' | 'other' {
    const id = connectorId.toLowerCase();
    const name = connectorName.toLowerCase();

    // Check both ID and name for matching
    if (WALLET_GROUPS.popularBsc.some(w => id.includes(w) || name.includes(w))) return 'popularBsc';
    if (WALLET_GROUPS.moreWallets.some(w => id.includes(w) || name.includes(w))) return 'moreWallets';
    if (WALLET_GROUPS.walletconnect.some(w => id.includes(w) || name.includes(w))) return 'walletconnect';
    if (WALLET_GROUPS.multisigHardware.some(w => id.includes(w) || name.includes(w))) return 'multisigHardware';
    return 'other';
}

interface ConnectWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
    const { connectors, connect, isPending, error } = useConnect();
    const { isConnected, address } = useAccount();
    const { disconnect } = useDisconnect();

    const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
    const [connectionSuccess, setConnectionSuccess] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [showMoreWallets, setShowMoreWallets] = useState(false);

    // Filter out duplicate connectors and organize by group
    const uniqueConnectors = connectors.reduce((acc, connector) => {
        // Skip duplicates based on name
        if (!acc.find(c => c.name === connector.name)) {
            acc.push(connector);
        }
        return acc;
    }, [] as Connector[]);

    // Group connectors
    const groupedConnectors = {
        popularBsc: uniqueConnectors.filter(c => getWalletGroup(c.id, c.name) === 'popularBsc'),
        moreWallets: uniqueConnectors.filter(c => getWalletGroup(c.id, c.name) === 'moreWallets'),
        walletconnect: uniqueConnectors.filter(c => getWalletGroup(c.id, c.name) === 'walletconnect'),
        multisigHardware: uniqueConnectors.filter(c => getWalletGroup(c.id, c.name) === 'multisigHardware'),
        other: uniqueConnectors.filter(c => getWalletGroup(c.id, c.name) === 'other'),
    };

    // Handle successful connection
    useEffect(() => {
        if (isConnected && connectingWallet) {
            setConnectionSuccess(true);
            const timer = setTimeout(() => {
                onClose();
                setConnectionSuccess(false);
                setConnectingWallet(null);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isConnected, connectingWallet, onClose]);

    // Handle connection errors
    useEffect(() => {
        if (error) {
            setConnectionError(error.message);
            setConnectingWallet(null);
            const timer = setTimeout(() => setConnectionError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setConnectingWallet(null);
            setConnectionSuccess(false);
            setConnectionError(null);
            setShowMoreWallets(false);
        }
    }, [isOpen]);

    const handleConnect = useCallback(async (connector: Connector) => {
        const isSafe = connector.name.toLowerCase().includes('safe') || connector.id.toLowerCase().includes('safe');

        // Safe wallet requires being inside the Safe app environment
        // Check if we're in a Safe context by looking for the Safe provider
        if (isSafe) {
            // Check if Safe provider is available in window
            const hasSafeProvider = typeof window !== 'undefined' &&
                (window as any).parent !== window || // iframe check
                (window as any).ethereum?.isSafe; // Safe provider check

            if (!hasSafeProvider) {
                setConnectionError(
                    'Safe is only available inside the Safe app. To connect your Safe wallet, please use WalletConnect instead - it works great with Safe!'
                );
                return;
            }
        }

        // Some connectors are only "ready" in specific environments
        // Prevent calling connect() when the provider is not injected
        if (connector.ready === false) {
            setConnectionError(
                `${connector.name} is not available in this browser. Please use WalletConnect or install the ${connector.name} extension.`
            );
            return;
        }

        setConnectingWallet(connector.id);
        setConnectionError(null);
        try {
            await connect({ connector });
        } catch (err: any) {
            console.error('Connection error:', err);
            // Provide user-friendly error messages
            const errorMessage = err?.message || 'Connection failed';
            if (errorMessage.includes('Provider not found')) {
                setConnectionError(
                    `${connector.name} provider not found. Please make sure you have the wallet extension installed, or use WalletConnect instead.`
                );
            } else if (errorMessage.includes('User rejected')) {
                setConnectionError('Connection was cancelled. Please try again.');
            } else {
                setConnectionError(errorMessage);
            }
            setConnectingWallet(null);
        }
    }, [connect]);

    // Keyboard handler for ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Don't render on server or if not open
    if (!isOpen || typeof document === 'undefined') return null;

    // Use portal to render modal at body level, escaping any parent container constraints
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="bg-white dark:bg-[#1E2030] rounded-[28px] shadow-2xl w-full max-w-[420px] max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-700/50 pointer-events-auto flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-100 dark:border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 dark:from-cyan-400 dark:to-blue-500 flex items-center justify-center shadow-lg">
                                        <Wallet className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                            Connect Wallet
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Choose a wallet to continue
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all hover:scale-105 active:scale-95 group"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                                </button>
                            </div>

                            {/* Connection Success State */}
                            {connectionSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-10 flex flex-col items-center justify-center"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                                        className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/40 mb-5"
                                    >
                                        <CheckCircle2 className="w-10 h-10 text-white" />
                                    </motion.div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                                        Connected!
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-full">
                                        {address?.slice(0, 6)}...{address?.slice(-4)}
                                    </p>
                                </motion.div>
                            )}

                            {/* Connection Error State */}
                            {connectionError && !connectionSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mx-5 mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-red-800 dark:text-red-200">
                                                Connection Failed
                                            </p>
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 line-clamp-2">
                                                {connectionError}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Wallet List */}
                            {!connectionSuccess && (
                                <div className="flex-1 overflow-y-auto p-5 pt-4 space-y-4">
                                    {/* WalletConnect first (best coverage) - Featured */}
                                    {groupedConnectors.walletconnect.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-3.5 h-3.5 text-teal-500 dark:text-cyan-400" />
                                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Recommended
                                                </span>
                                            </div>
                                            {groupedConnectors.walletconnect.map((connector, index) => (
                                                <motion.div
                                                    key={connector.uid}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                >
                                                    <WalletButtonWide
                                                        connector={connector}
                                                        isConnecting={connectingWallet === connector.id}
                                                        isPending={isPending}
                                                        onConnect={() => handleConnect(connector)}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Popular on BSC */}
                                    {groupedConnectors.popularBsc.length > 0 && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Popular on BSC
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {groupedConnectors.popularBsc.map((connector, index) => (
                                                    <motion.div
                                                        key={connector.uid}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 + index * 0.03 }}
                                                    >
                                                        <WalletButton
                                                            connector={connector}
                                                            isConnecting={connectingWallet === connector.id}
                                                            isPending={isPending}
                                                            onConnect={() => handleConnect(connector)}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Show more toggle - only if there are additional wallets */}
                                    {(groupedConnectors.multisigHardware.length + groupedConnectors.moreWallets.length + groupedConnectors.other.length) > 0 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setShowMoreWallets(v => !v)}
                                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all border border-dashed border-gray-200 dark:border-gray-700"
                                            >
                                                <span>{showMoreWallets ? 'Show less' : 'More wallets'}</span>
                                                <motion.div
                                                    animate={{ rotate: showMoreWallets ? 180 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </motion.div>
                                            </button>

                                            <AnimatePresence>
                                                {showMoreWallets && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="space-y-4 overflow-hidden"
                                                    >
                                                        {/* Multisig & Hardware */}
                                                        {groupedConnectors.multisigHardware.length > 0 && (
                                                            <div className="space-y-2.5">
                                                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                                                                    Multisig & Hardware
                                                                </span>
                                                                <div className="space-y-2">
                                                                    {groupedConnectors.multisigHardware.map((connector, index) => (
                                                                        <motion.div
                                                                            key={connector.uid}
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: index * 0.03 }}
                                                                        >
                                                                            <WalletButtonCompact
                                                                                connector={connector}
                                                                                isConnecting={connectingWallet === connector.id}
                                                                                isPending={isPending}
                                                                                onConnect={() => handleConnect(connector)}
                                                                            />
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* More Wallets */}
                                                        {groupedConnectors.moreWallets.length > 0 && (
                                                            <div className="space-y-2.5">
                                                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                                                                    More Wallets
                                                                </span>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {groupedConnectors.moreWallets.map((connector, index) => (
                                                                        <motion.div
                                                                            key={connector.uid}
                                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            transition={{ delay: index * 0.03 }}
                                                                        >
                                                                            <WalletButton
                                                                                connector={connector}
                                                                                isConnecting={connectingWallet === connector.id}
                                                                                isPending={isPending}
                                                                                onConnect={() => handleConnect(connector)}
                                                                            />
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Other Wallets */}
                                                        {groupedConnectors.other.length > 0 && (
                                                            <div className="space-y-2.5">
                                                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                                                                    Other
                                                                </span>
                                                                <div className="space-y-2">
                                                                    {groupedConnectors.other.map((connector, index) => (
                                                                        <motion.div
                                                                            key={connector.uid}
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: index * 0.03 }}
                                                                        >
                                                                            <WalletButtonCompact
                                                                                connector={connector}
                                                                                isConnecting={connectingWallet === connector.id}
                                                                                isPending={isPending}
                                                                                onConnect={() => handleConnect(connector)}
                                                                            />
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Footer */}
                            {!connectionSuccess && (
                                <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700/50">
                                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                        By connecting, you agree to our{' '}
                                        <a href="/terms" className="text-teal-500 dark:text-cyan-400 hover:text-teal-600 dark:hover:text-cyan-300 font-medium transition-colors">
                                            Terms of Service
                                        </a>
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

// Grid wallet button (for recommended wallets)
function WalletButton({
    connector,
    isConnecting,
    isPending,
    onConnect
}: {
    connector: Connector;
    isConnecting: boolean;
    isPending: boolean;
    onConnect: () => void;
}) {
    const icon = getWalletIcon(connector.id, connector.name);
    const isDisabled = (isPending && !isConnecting) || connector.ready === false;
    const showNotAvailable = connector.ready === false;

    return (
        <motion.button
            whileHover={!isDisabled ? { scale: 1.02, y: -1 } : {}}
            whileTap={!isDisabled ? { scale: 0.97 } : {}}
            onClick={onConnect}
            disabled={isDisabled}
            className={`
                group relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200
                ${isConnecting
                    ? 'bg-teal-50 dark:bg-cyan-900/30 border-teal-400 dark:border-cyan-500 shadow-md shadow-teal-500/20 dark:shadow-cyan-500/20'
                    : 'bg-white dark:bg-[#262837] border-gray-200 dark:border-gray-700/50 hover:border-teal-400 dark:hover:border-cyan-500/50 hover:shadow-md hover:shadow-teal-500/10 dark:hover:shadow-cyan-500/10 hover:bg-teal-50/50 dark:hover:bg-[#2a2f42]'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            <div className={`
                relative w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-200
                ${isConnecting
                    ? 'bg-teal-100 dark:bg-cyan-800/50'
                    : 'bg-gray-100 dark:bg-white/10 group-hover:bg-teal-100/70 dark:group-hover:bg-cyan-800/30'
                }
            `}>
                {isConnecting ? (
                    <Loader2 className="w-5 h-5 text-teal-500 dark:text-cyan-400 animate-spin" />
                ) : (
                    <WalletIcon name={connector.name} iconPath={icon} />
                )}
            </div>
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 group-hover:text-teal-600 dark:group-hover:text-cyan-400 transition-colors text-center leading-tight line-clamp-1">
                {connector.name}
            </span>
            {showNotAvailable && (
                <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 leading-tight text-center">
                    Not available
                </span>
            )}
        </motion.button>
    );
}

// Wide wallet button (for WalletConnect) - Featured/Recommended style
function WalletButtonWide({
    connector,
    isConnecting,
    isPending,
    onConnect
}: {
    connector: Connector;
    isConnecting: boolean;
    isPending: boolean;
    onConnect: () => void;
}) {
    const icon = getWalletIcon(connector.id, connector.name);
    const isDisabled = (isPending && !isConnecting) || connector.ready === false;
    const showNotAvailable = connector.ready === false;

    return (
        <motion.button
            whileHover={!isDisabled ? { scale: 1.01, y: -2 } : {}}
            whileTap={!isDisabled ? { scale: 0.99 } : {}}
            onClick={onConnect}
            disabled={isDisabled}
            className={`
                w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200
                ${isConnecting
                    ? 'bg-gradient-to-r from-teal-100 to-cyan-100 dark:from-cyan-900/40 dark:to-blue-900/40 border-teal-400 dark:border-cyan-500 shadow-xl shadow-teal-500/25 dark:shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-teal-300 dark:border-cyan-700 hover:border-teal-400 dark:hover:border-cyan-500 hover:shadow-xl hover:shadow-teal-500/20 dark:hover:shadow-cyan-500/20'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200
                ${isConnecting
                    ? 'bg-gradient-to-br from-teal-400 to-cyan-500 dark:from-cyan-400 dark:to-blue-500 shadow-teal-500/40 dark:shadow-cyan-500/40'
                    : 'bg-gradient-to-br from-teal-500 to-cyan-600 dark:from-cyan-500 dark:to-blue-600 shadow-teal-500/30 dark:shadow-cyan-500/30'
                }
            `}>
                {isConnecting ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                    <WalletIcon name={connector.name} iconPath={icon} />
                )}
            </div>
            <div className="flex-1 text-left">
                <span className="text-base font-black text-gray-900 dark:text-white block">
                    {connector.name}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                    {showNotAvailable ? 'Not available in this browser' : 'Scan QR or use your wallet app'}
                </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-cyan-800/50 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-teal-600 dark:text-cyan-400" />
            </div>
        </motion.button>
    );
}

// Compact wallet button (for other wallets)
function WalletButtonCompact({
    connector,
    isConnecting,
    isPending,
    onConnect
}: {
    connector: Connector;
    isConnecting: boolean;
    isPending: boolean;
    onConnect: () => void;
}) {
    const icon = getWalletIcon(connector.id, connector.name);
    const isSafe = connector.name.toLowerCase().includes('safe') || connector.id.toLowerCase().includes('safe');

    // For Safe, check if we're in the Safe environment
    const isInSafeContext = typeof window !== 'undefined' &&
        ((window as any).parent !== window || (window as any).ethereum?.isSafe);
    const safeNotAvailable = isSafe && !isInSafeContext;

    const isDisabled = (isPending && !isConnecting);

    return (
        <motion.button
            whileHover={!isDisabled ? { x: 4 } : {}}
            whileTap={!isDisabled ? { scale: 0.98 } : {}}
            onClick={onConnect}
            disabled={isDisabled}
            className={`
                group w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200
                ${isConnecting
                    ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-400 dark:border-teal-600'
                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-teal-300 dark:hover:border-teal-700'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
                ${isConnecting
                    ? 'bg-teal-100 dark:bg-teal-800/50'
                    : 'bg-gray-100 dark:bg-white/10 group-hover:bg-teal-100/50 dark:group-hover:bg-teal-800/30'
                }
            `}>
                {isConnecting ? (
                    <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                ) : (
                    <WalletIcon name={connector.name} iconPath={icon} size="sm" />
                )}
            </div>
            <div className="flex-1 text-left">
                <div className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {connector.name}
                </div>
                {safeNotAvailable && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400">
                        Use WalletConnect to connect Safe
                    </div>
                )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
        </motion.button>
    );
}

// Wallet icon component with fallback
function WalletIcon({ name, iconPath, size = 'md' }: { name: string; iconPath: string; size?: 'sm' | 'md' }) {
    const [hasError, setHasError] = useState(false);
    const sizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';

    // Generate a fallback gradient based on name
    const getGradient = (name: string) => {
        const colors = [
            ['from-orange-400', 'to-pink-500'],
            ['from-blue-400', 'to-purple-500'],
            ['from-green-400', 'to-teal-500'],
            ['from-yellow-400', 'to-orange-500'],
            ['from-purple-400', 'to-indigo-500'],
        ];
        const index = name.length % colors.length;
        return colors[index];
    };

    if (hasError) {
        const [from, to] = getGradient(name);
        return (
            <div className={`${sizeClasses} rounded-lg bg-gradient-to-br ${from} ${to} flex items-center justify-center text-white font-bold text-xs`}>
                {name.charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <Image
            src={iconPath}
            alt={`${name} icon`}
            width={size === 'sm' ? 20 : 32}
            height={size === 'sm' ? 20 : 32}
            className={sizeClasses}
            onError={() => setHasError(true)}
            unoptimized
        />
    );
}

export default ConnectWalletModal;
