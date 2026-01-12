'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, Loader2 } from 'lucide-react';
import { Button } from './button';

export type ConfirmDialogType = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: ConfirmDialogType;
    isLoading?: boolean;
    addressDisplay?: string; // Optional address to show prominently
    roleInfo?: string; // Optional role info
}

const typeStyles = {
    danger: {
        icon: AlertTriangle,
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400',
        confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
        border: 'border-red-200 dark:border-red-800/50',
        glow: 'bg-red-500/10',
    },
    warning: {
        icon: AlertTriangle,
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
        border: 'border-amber-200 dark:border-amber-800/50',
        glow: 'bg-amber-500/10',
    },
    info: {
        icon: Shield,
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
        border: 'border-blue-200 dark:border-blue-800/50',
        glow: 'bg-blue-500/10',
    },
};

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    isLoading = false,
    addressDisplay,
    roleInfo,
}: ConfirmDialogProps) {
    const styles = typeStyles[type];
    const Icon = styles.icon;

    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className={`relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border ${styles.border} overflow-hidden`}
                        >
                            {/* Glow effect */}
                            <div className={`absolute top-0 left-0 right-0 h-32 ${styles.glow} blur-3xl`} />

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Content */}
                            <div className="relative p-6">
                                {/* Icon */}
                                <div className="flex justify-center mb-4">
                                    <div className={`p-4 rounded-2xl ${styles.iconBg}`}>
                                        <Icon className={`w-8 h-8 ${styles.iconColor}`} />
                                    </div>
                                </div>

                                {/* Title */}
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                                    {title}
                                </h2>

                                {/* Description */}
                                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                                    {description}
                                </p>

                                {/* Address display */}
                                {addressDisplay && (
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 mb-4">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                            Target Address
                                        </div>
                                        <div className="font-mono text-sm text-gray-900 dark:text-white break-all">
                                            {addressDisplay}
                                        </div>
                                    </div>
                                )}

                                {/* Role info */}
                                {roleInfo && (
                                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 mb-4">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                                            Role(s) Affected
                                        </div>
                                        <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                            {roleInfo}
                                        </div>
                                    </div>
                                )}

                                {/* Warning box for danger type */}
                                {type === 'danger' && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3 mb-6">
                                        <p className="text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>
                                                This action cannot be undone easily. Make sure you understand the
                                                implications before proceeding.
                                            </span>
                                        </p>
                                    </div>
                                )}

                                {/* Buttons */}
                                <div className="flex gap-3 mt-6">
                                    <Button
                                        onClick={onClose}
                                        disabled={isLoading}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        {cancelText}
                                    </Button>
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={isLoading}
                                        className={`flex-1 ${styles.confirmBtn}`}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Processing...
                                            </>
                                        ) : (
                                            confirmText
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
