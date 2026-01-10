'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Link2, Check, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export function ReferralCopyButton() {
    const { address, isConnected } = useAccount();
    const { pushToast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        if (!address) return;

        // Construct link: Current URL base + ?ref=ADDRESS
        // We strive to keep the current path if possible, or just root
        const baseUrl = window.location.origin + window.location.pathname;
        const referralLink = `${baseUrl}?ref=${address}`;

        navigator.clipboard.writeText(referralLink).then(() => {
            setCopied(true);
            pushToast({
                title: 'Referral Link Copied',
                description: 'Share this link to earn referral rewards!',
                type: 'success',
            });
            setTimeout(() => setCopied(false), 2000);
        });
    }, [address, pushToast]);

    if (!isConnected || !address) return null;

    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-[#14B8A6] dark:hover:text-[#14B8A6] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:border-[#14B8A6] transition-all shadow-sm group"
            title="Copy Referral Link"
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4 text-[#14B8A6]" />
                    <span className="text-[#14B8A6] hidden sm:inline">Copied!</span>
                </>
            ) : (
                <>
                    <Link2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Invite</span>
                </>
            )}
        </button>
    );
}
