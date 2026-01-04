'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface CounterProps {
  value: string | number;
  duration?: number;
}

export function Counter({ value, duration = 1 }: CounterProps) {
  // If value is a string (like "$1.2M"), just display it
  if (typeof value === 'string' && (value.includes('$') || value.includes('K') || value.includes('M') || value.includes('B'))) {
    return <span>{value}</span>;
  }

  // For numeric values, animate them
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
  const spring = useSpring(0, { stiffness: 50, damping: 30 });
  const display = useTransform(spring, (current) => {
    if (Number.isInteger(numValue)) {
      return Math.floor(current).toLocaleString();
    }
    return current.toFixed(2).toLocaleString();
  });

  useEffect(() => {
    spring.set(numValue);
  }, [numValue, spring]);

  return <motion.span>{display}</motion.span>;
}

