import { useId, useRef, type KeyboardEvent } from 'react';
import clsx from 'clsx';

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}
export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

/** Tablist only; render your own panel (give it role="tabpanel" if desired). */
export function Tabs({ items, value, onChange, label = 'Tabs', className }: TabsProps) {
  const id = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: KeyboardEvent) => {
    const idx = items.findIndex((i) => i.value === value);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else return;
    e.preventDefault();
    const target = items[next];
    onChange(target.value);
    refs.current[target.value]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={clsx('flex gap-1 overflow-x-auto border-b border-ink-200 dark:border-ink-800', className)}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[item.value] = el;
            }}
            role="tab"
            id={`${id}-${item.value}`}
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={clsx(
              '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              selected
                ? 'border-brand-700 text-brand-800 dark:border-brand-400 dark:text-brand-300'
                : 'border-transparent text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-ink-100 px-1.5 text-xs text-ink-700 dark:bg-ink-800 dark:text-ink-300">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
