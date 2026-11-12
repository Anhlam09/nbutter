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
    <Card className={clsx('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-600 dark:text-ink-400">{label}</p>
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="font-display mt-2 text-4xl font-medium tracking-tight text-ink-900 dark:text-ink-50">{value}</p>
      {(delta || hint) && (
        <p className="mt-1 text-xs text-ink-600 dark:text-ink-400">
          {delta && <span className={clsx('mr-1 font-medium', deltaTones[deltaTone])}>{delta}</span>}
          {hint}
        </p>
      )}
    </Card>
  );
}
