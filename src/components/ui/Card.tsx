import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white shadow-card ring-1 ring-ink-900/[0.03] dark:bg-ink-900 dark:shadow-none dark:ring-white/[0.06]',
        className,
      )}
      {...rest}
    />
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}
export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div
      className={clsx(
        'flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 dark:border-ink-800',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-5', className)} {...rest} />;
}
