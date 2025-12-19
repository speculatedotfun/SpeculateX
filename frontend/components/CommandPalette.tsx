'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Home, BarChart2, User, Trophy, Book, Settings, X, CornerDownLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getMarketCount, getMarket } from '@/lib/hooks';

interface CommandItem {
  icon: any;
  label: string;
  href: string;
  category: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [markets, setMarkets] = useState<{id: number, question: string}[]>([]);
  const router = useRouter();

  const staticCommands: CommandItem[] = [
    { icon: Home, label: 'Home', href: '/', category: 'Navigation' },
    { icon: BarChart2, label: 'Explore Markets', href: '/markets', category: 'Navigation' },
    { icon: User, label: 'Portfolio', href: '/portfolio', category: 'Navigation' },
    { icon: Trophy, label: 'Leaderboard', href: '/leaderboard', category: 'Navigation' },
    { icon: Book, label: 'Documentation', href: '/docs', category: 'Navigation' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      loadRecentMarkets();
    }
  }, [isOpen]);

  const loadRecentMarkets = async () => {
    try {
      const count = await getMarketCount();
      const countNum = Number(count);
      const recentIds = Array.from({ length: Math.min(5, countNum) }, (_, i) => countNum - i);
      
      const marketPromises = recentIds.map(async (id) => {
        const m = await getMarket(BigInt(id));
        return { id, question: m.question };
      });
      
      const results = await Promise.all(marketPromises);
      setMarkets(results);
    } catch (e) {
      console.error('Failed to load markets for palette', e);
    }
  };

  const filteredCommands = query === '' 
    ? staticCommands 
    : staticCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  const filteredMarkets = query === ''
    ? markets
    : markets.filter(m => m.question.toLowerCase().includes(query.toLowerCase()));

  const allItems = [
    ...filteredCommands.map(c => ({ ...c, type: 'command' })),
    ...filteredMarkets.map(m => ({ label: m.question, href: `/markets/${m.id}`, icon: BarChart2, type: 'market', category: 'Markets' }))
  ];

  const handleSelect = useCallback((item: any) => {
    router.push(item.href);
    setIsOpen(false);
  }, [router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[24px] shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search markets, pages, or commands..."
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-lg placeholder:text-gray-400"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Esc
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
              {allItems.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No results found for &quot;{query}&quot;</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {['Navigation', 'Markets'].map(category => {
                    const categoryItems = allItems.filter(item => item.category === category);
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {category}
                        </div>
                        <div className="space-y-1">
                          {categoryItems.map((item, i) => {
                            const globalIndex = allItems.indexOf(item);
                            const isSelected = globalIndex === selectedIndex;
                            
                            return (
                              <button
                                key={item.label}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all ${
                                  isSelected 
                                    ? 'bg-[#14B8A6] text-white' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                                  <span className="font-bold text-sm truncate">{item.label}</span>
                                </div>
                                {isSelected && (
                                  <div className="flex items-center gap-1 opacity-60">
                                    <CornerDownLeft className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Enter</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5"><span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">↑↓</span> Navigate</span>
                <span className="flex items-center gap-1.5"><span className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">Enter</span> Select</span>
              </div>
              <div className="flex items-center gap-1.5 font-black text-[#14B8A6]">
                SpeculateX Command
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

