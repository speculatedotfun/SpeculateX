'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PriceDisplayProps {
  price: number;
  prefix?: string;
  className?: string;
  priceClassName?: string;
  showInCents?: boolean;
}

export function PriceDisplay({ 
  price, 
  prefix = '$', 
  className = '', 
  priceClassName = '',
  showInCents = true
}: PriceDisplayProps) {
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(price);

  useEffect(() => {
    if (price > prevPriceRef.current) {
      setDirection('up');
      const timer = setTimeout(() => setDirection(null), 1000);
      prevPriceRef.current = price;
      return () => clearTimeout(timer);
    } else if (price < prevPriceRef.current) {
      setDirection('down');
      const timer = setTimeout(() => setDirection(null), 1000);
      prevPriceRef.current = price;
      return () => clearTimeout(timer);
    }
  }, [price]);

  const displayPrice = showInCents 
    ? (price * 100).toFixed(1).replace(/\.0$/, '') + '¢'
    : prefix + price.toFixed(2);

  return (
    <div className={`relative flex items-center ${className}`}>
      <motion.span
        key={price}
        initial={{ y: direction === 'up' ? 5 : direction === 'down' ? -5 : 0, opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        className={`font-black tracking-tight transition-colors duration-500 ${priceClassName} ${
          direction === 'up' 
            ? 'text-emerald-500' 
            : direction === 'down' 
            ? 'text-rose-500' 
            : ''
        }`}
      >
        {displayPrice}
      </motion.span>
      
      <AnimatePresence>
        {direction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 0 }}
            animate={{ opacity: 0.2, scale: 1.2, y: direction === 'up' ? -20 : 20 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 rounded-full blur-xl pointer-events-none ${
              direction === 'up' ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

