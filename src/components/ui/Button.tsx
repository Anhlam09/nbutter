import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500 dark:text-white border-transparent',
  secondary:
    'bg-white text-ink-800 border-ink-300 hover:bg-ink-50 dark:bg-ink-800 dark:text-ink-100 dark:border-ink-600 dark:hover:bg-ink-700',
  ghost:
    'bg-transparent text-ink-700 border-transparent hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800',
  danger: 'bg-red-700 text-white hover:bg-red-800 border-transparent dark:bg-red-600 dark:hover:bg-red-500',
  ai: 'bg-ai-700 text-white hover:bg-ai-800 border-transparent dark:bg-ai-600 dark:hover:bg-ai-500',
};
const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, iconLeft, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center rounded-xl border font-medium transition-colors whitespace-nowrap [&_svg]:shrink-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : iconLeft}
      {children}
    </button>
  );
});
