'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
    const item: ToastItem = { id, durationMs: 6000, ...toast };
    setToasts(prev => [item, ...prev]);
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
        <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 w-[min(92vw,380px)]">
          {toasts.map(toast => (
            <ToastCard key={toast.id} item={toast} onClose={() => removeToast(toast.id)} />
          ))}
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
  const color =
    item.type === 'success' ? 'bg-emerald-500' :
    item.type === 'warning' ? 'bg-amber-500' :
    item.type === 'info'    ? 'bg-sky-500' :
    'bg-rose-500';

  const subtle =
    item.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' :
    item.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800' :
    item.type === 'info'    ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800' :
    'bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800';

  return (
    <div className={`rounded-xl border ${subtle} shadow-lg overflow-hidden`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
        <div className="flex-1 font-semibold">{item.title}</div>
        <button
          onClick={onClose}
          className="text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
      {item.description && (
        <div className="px-3 pb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{item.description}</p>
          <button
            className="mt-1 text-xs text-gray-600 dark:text-gray-400 underline decoration-dotted hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            onClick={() => setShowDetails(prev => !prev)}
          >
            {showDetails ? 'Hide details' : 'View details'}
          </button>
          {showDetails && (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] font-mono bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-gray-100">
              {item.description}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
