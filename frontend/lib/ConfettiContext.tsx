'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiContextType {
  trigger: () => void;
}

const ConfettiContext = createContext<ConfettiContextType | null>(null);

export const useConfetti = () => {
  const ctx = useContext(ConfettiContext);
  if (!ctx) throw new Error('useConfetti must be used within ConfettiProvider');
  return ctx;
};

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; y: number; color: string; rotation: number }[]>([]);

  const trigger = useCallback(() => {
    const colors = ['#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6', '#F59E0B'];
    const newPieces = Array.from({ length: 50 }).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100, // percentage
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
    }));
    
    setPieces(prev => [...prev, ...newPieces]);
    setTimeout(() => {
      setPieces(prev => prev.filter(p => !newPieces.includes(p)));
    }, 3000);
  }, []);

  return (
    <ConfettiContext.Provider value={{ trigger }}>
      {children}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        <AnimatePresence>
          {pieces.map(piece => (
            <motion.div
              key={piece.id}
              initial={{ y: '100vh', x: `${piece.x}vw`, opacity: 1, rotate: piece.rotation }}
              animate={{ 
                y: '-10vh', 
                x: `${piece.x + (Math.random() * 20 - 10)}vw`,
                rotate: piece.rotation + 720 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 + Math.random(), ease: 'easeOut' }}
              className="absolute w-2 h-2 rounded-sm"
              style={{ backgroundColor: piece.color }}
            />
          ))}
        </AnimatePresence>
      </div>
    </ConfettiContext.Provider>
  );
}

