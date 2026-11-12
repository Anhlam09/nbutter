import type { HTMLAttributes, KeyboardEvent, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import clsx from 'clsx';

export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={clsx('w-full min-w-[40rem] border-collapse text-left text-sm', className)} {...rest} />
    </div>
  );
}
export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={clsx('border-b border-ink-200 dark:border-ink-800', className)} {...rest} />;
}
export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={clsx('divide-y divide-ink-100 dark:divide-ink-800', className)} {...rest} />;
}

export interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  highlighted?: boolean;
}
export function TR({ onClick, highlighted, className, onKeyDown, ...rest }: TRProps) {
  const handleKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    onKeyDown?.(e);
    if (!e.defaultPrevented && onClick && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.currentTarget.click();
    }
  };
  return (
    <tr
      onClick={onClick}
      onKeyDown={onClick ? handleKey : onKeyDown}
      tabIndex={onClick ? 0 : undefined}
      aria-selected={highlighted || undefined}
      className={clsx(
        onClick && 'cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800/60',
        highlighted && 'bg-brand-50 dark:bg-brand-950/40',
        className,
      )}
      {...rest}
    />
  );
}
export function TH({ className, scope = 'col', ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={clsx(
        'whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-600 dark:text-ink-400',
        className,
      )}
      {...rest}
    />
  );
}
export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={clsx('px-4 py-3 align-middle text-ink-800 dark:text-ink-200', className)} {...rest} />;
}
