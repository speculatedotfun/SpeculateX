'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  type?: ToastType;
  title: string;
  description?: string;
  persist?: boolean;
  durationMs?: number;
};

type ToastContextValue = {
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastHost>');
  }
  return ctx;
}

export function ToastHost({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const mountedRef = useRef(false);
  const timersRef = useRef<Map<string, number>>(new Map());
  const [isClient, setIsClient] = useState(false);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timerId = timersRef.current.get(id);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const item: ToastItem = { id, durationMs: 5000, ...toast }; // Default 5s
    setToasts(prev => [item, ...prev]); // Add new toasts to the top of the stack logic, but UI will stack bottom-up
    if (!item.persist && typeof window !== 'undefined') {
      const timeoutId = window.setTimeout(() => {
        if (mountedRef.current) {
          removeToast(id);
        }
      }, item.durationMs);
      timersRef.current.set(id, timeoutId);
    }
  }, [removeToast]);

  useEffect(() => {
    mountedRef.current = true;
    setIsClient(true);
    const timers = timersRef.current;
    return () => {
      mountedRef.current = false;
      timers.forEach(timeoutId => window.clearTimeout(timeoutId));
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ pushToast, removeToast }), [pushToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {isClient && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
          <AnimatePresence mode="popLayout">
            {toasts.map(toast => (
              <ToastCard key={toast.id} item={toast} onClose={() => removeToast(toast.id)} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

type ToastCardProps = {
  item: ToastItem;
  onClose: () => void;
};

function ToastCard({ item, onClose }: ToastCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const styles = {
    success: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-green-200 dark:border-green-800',
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      title: 'text-gray-900 dark:text-white',
    },
    error: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-red-200 dark:border-red-800',
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      title: 'text-gray-900 dark:text-white',
    },
    warning: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-amber-200 dark:border-amber-800',
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      title: 'text-gray-900 dark:text-white',
    },
    info: {
      bg: 'bg-white dark:bg-gray-800',
      border: 'border-blue-200 dark:border-blue-800',
      icon: <Info className="w-5 h-5 text-blue-500" />,
      title: 'text-gray-900 dark:text-white',
    },
  };

  const style = styles[item.type || 'info'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      layout
      className={`pointer-events-auto w-full rounded-[24px] shadow-2xl border p-4 ${style.bg}/80 backdrop-blur-xl ${style.border} flex flex-col gap-2 ring-1 ring-black/5`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{style.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-bold ${style.title}`}>{item.title}</h3>
          {item.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {item.description && item.description.length > 100 && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-[10px] font-bold text-gray-400 hover:text-[#14B8A6] self-start ml-8 uppercase tracking-wider"
        >
          {showDetails ? 'Hide' : 'Expand'}
        </button>
      )}
      
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="ml-8 text-[10px] font-mono bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800 overflow-x-auto"
        >
          {item.description}
        </motion.div>
      )}
    </motion.div>
  );
}