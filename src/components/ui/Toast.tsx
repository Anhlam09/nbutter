import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { BadgeTone } from './Badge';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: BadgeTone;
}
interface ToastItem extends ToastInput {
  id: number;
}
type ToastFn = (t: ToastInput) => void;

const ToastContext = createContext<ToastFn | null>(null);

const bar: Record<BadgeTone, string> = {
  neutral: 'bg-ink-500',
  brand: 'bg-brand-600',
  red: 'bg-red-600',
  orange: 'bg-orange-600',
  amber: 'bg-amber-500',
  sky: 'bg-sky-600',
  ai: 'bg-ai-600',
  green: 'bg-green-600',
};

export function ToastProvider({ children, duration = 4500 }: { children: ReactNode; duration?: number }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastFn>(
    (t) => {
      const id = ++counter.current;
      setItems((l) => [...l.slice(-3), { ...t, id }]);
      timers.current.push(window.setTimeout(() => dismiss(id), duration));
    },
    [dismiss, duration],
  );
  useEffect(() => {
    const ts = timers.current;
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, []);
  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-14 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="anim-slide-up pointer-events-auto flex overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-800"
          >
            <span className={clsx('w-1.5 shrink-0', bar[t.tone ?? 'brand'])} aria-hidden="true" />
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-ink-600 dark:text-ink-300">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="m-1.5 h-6 w-6 shrink-0 rounded-md p-1 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): { toast: ToastFn } {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return useMemo(() => ({ toast: ctx }), [ctx]);
}
