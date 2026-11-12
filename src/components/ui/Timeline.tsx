import type { ReactNode } from 'react';
import clsx from 'clsx';
import { badgeToneClasses, type BadgeTone } from './Badge';

export interface TimelineItem {
  id: string;
  at: string;
  title: string;
  description?: string;
  actorLabel?: string;
  tone?: BadgeTone;
  icon?: ReactNode;
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={clsx('relative', className)}>
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < items.length - 1 && (
            <span aria-hidden="true" className="absolute left-3.5 top-7 bottom-0 w-px bg-ink-200 dark:bg-ink-800" />
          )}
          <span
            aria-hidden="true"
            className={clsx(
              'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset [&>svg]:h-3.5 [&>svg]:w-3.5',
              badgeToneClasses[item.tone ?? 'neutral'],
            )}
          >
            {item.icon ?? <span className="h-2 w-2 rounded-full bg-current" />}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{item.title}</p>
            {item.description && <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-400">{item.description}</p>}
            <p className="mt-0.5 text-xs text-ink-600 dark:text-ink-400">
              <time>{item.at}</time>
              {item.actorLabel && <span> · {item.actorLabel}</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
