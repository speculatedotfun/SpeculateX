'use client';

import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLink?: string;
  actionText?: string;
  icon?: any;
}

export function EmptyState({ 
  title, 
  description, 
  actionLink, 
  actionText,
  icon: Icon = Search 
}: EmptyStateProps) {
  return (
    <div className="text-center py-20 px-4 group">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner border border-gray-100 dark:border-gray-800 transition-transform group-hover:scale-110 group-hover:rotate-3"
      >
        <Icon className="w-10 h-10 text-gray-300 dark:text-gray-600 transition-colors group-hover:text-[#14B8A6]" />
      </motion.div>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-10 leading-relaxed font-medium">{description}</p>
      {actionLink && actionText && (
        <Link href={actionLink}>
          <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white font-black rounded-2xl px-10 py-4 shadow-xl shadow-[#14B8A6]/20 transition-all hover:scale-105 active:scale-95">
            {actionText}
          </Button>
        </Link>
      )}
    </div>
  );
}

