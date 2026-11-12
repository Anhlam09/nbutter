import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

export interface ApprovalGateProps {
  allowed: boolean;
  /** Explanation shown when not allowed, e.g. "Requires GP approval: switch role in the top bar" */
  reason: string;
  children: ReactNode;
}

/**
 * Wraps an approve action. When not allowed, children are rendered inert (pointer-events and
 * aria-disabled) next to a visible lock + reason. Children should also set their own `disabled`
 * from the same flag for full keyboard safety.
 */
export function ApprovalGate({ allowed, reason, children }: ApprovalGateProps) {
  if (allowed) return <>{children}</>;
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span
        inert
        aria-disabled="true"
        className="pointer-events-none inline-flex opacity-50"
      >
        {children}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        {reason}
      </span>
    </div>
  );
}
