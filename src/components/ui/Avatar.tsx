import clsx from 'clsx';

export interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}
const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };

export function Avatar({ initials, size = 'md', className, label }: AvatarProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={clsx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-900 dark:bg-brand-900 dark:text-brand-100',
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
