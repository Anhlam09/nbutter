import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useHighlight } from './helpers';

/** A card/row wrapper that carries data-entity-id and the demo highlight ring. */
export function EntityCard({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const highlighted = useHighlight(id);
  return (
    <div
      data-entity-id={id}
      className={clsx(
        'rounded-2xl bg-white shadow-card p-4 ring-1 ring-ink-900/[0.03] dark:bg-ink-900 dark:ring-white/[0.06]',
        highlighted && 'ring-2 ring-brand-400',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-ink-900 dark:text-ink-50">{children}</h3>;
}

export const muted = 'text-ink-600 dark:text-ink-400';
