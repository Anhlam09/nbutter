import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import clsx from 'clsx';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** a single Input/Textarea/Select element; id and aria props are injected */
  children: ReactNode;
  className?: string;
  required?: boolean;
}

export function Field({ label, hint, error, children, className, required }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required: required || undefined,
      })
    : children;
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-800 dark:text-ink-200">
        {label}
        {required && <span className="ml-0.5 text-red-700 dark:text-red-400" aria-hidden="true">*</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-600 dark:text-ink-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-xs font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

const control =
  'w-full rounded-xl border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-600 ' +
  'dark:border-ink-600 dark:bg-ink-900 dark:text-ink-100 dark:placeholder:text-ink-400';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(control, 'h-10', className)} {...rest} />;
}
export function Textarea({ className, rows = 4, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={clsx(control, 'py-2', className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(control, 'h-10 pr-8', className)} {...rest}>
      {children}
    </select>
  );
}
