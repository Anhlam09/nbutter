import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaTone?: 'good' | 'bad' | 'neutral';
  hint?: string;
  icon?: ReactNode;
  className?: string;
}
const deltaTones = {
  good: 'text-green-700 dark:text-green-400',
  bad: 'text-red-700 dark:text-red-400',
  neutral: 'text-ink-600 dark:text-ink-400',
};

export function StatCard({ label, value, delta, deltaTone = 'neutral', hint, icon, className }: StatCardProps) {
  return (
    <Card className={clsx('px-5 py-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-600 dark:text-ink-400">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center text-brand-500 dark:text-brand-300" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">{value}</span>
        {delta && <span className={clsx('text-xs font-medium', deltaTones[deltaTone])}>{delta}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-600 dark:text-ink-400">{hint}</p>}
    </Card>
  );
}
