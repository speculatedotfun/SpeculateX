'use client';

import { useTheme } from '@/lib/theme';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={toggleTheme}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="relative p-2 rounded-full border border-black/5 dark:border-white/5 bg-white/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:text-[#14B8A6] dark:hover:text-[#14B8A6] hover:bg-white/80 dark:hover:bg-gray-800/60 transition-all hover:-translate-y-[1px] hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-[#14B8A6]/20"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'dark' ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none z-50"
            role="tooltip"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}