import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-600 dark:text-ink-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
