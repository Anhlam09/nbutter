import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { Archive, CalendarCheck, CheckCircle2, CircleDot, Eye, Sparkles, UserCheck, type LucideIcon } from 'lucide-react';
import type { Decision, RequestStatus, Urgency } from '@/types';

export type BadgeTone = 'neutral' | 'brand' | 'red' | 'orange' | 'amber' | 'sky' | 'ai' | 'green';

export const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-800',
  red: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800',
  orange: 'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-800',
  amber: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800',
  sky: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800',
  ai: 'bg-ai-50 text-ai-800 ring-ai-200 dark:bg-ai-950 dark:text-ai-300 dark:ring-ai-800',
  green: 'bg-green-50 text-green-800 ring-green-200 dark:bg-green-950 dark:text-green-300 dark:ring-green-800',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children?: ReactNode;
}
export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        badgeToneClasses[tone],
        className,
      )}
      {...rest}
    />
  );
}

const urgencyMap: Record<Urgency, { tone: BadgeTone; label: string }> = {
  emergency: { tone: 'red', label: 'Emergency' },
  urgent: { tone: 'orange', label: 'Urgent' },
  soon: { tone: 'amber', label: 'Soon' },
  routine: { tone: 'sky', label: 'Routine' },
};
export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const u = urgencyMap[urgency];
  return (
    <Badge tone={u.tone}>
      <span
        aria-hidden="true"
        className={clsx('h-1.5 w-1.5 rounded-full bg-current', urgency === 'emergency' && 'animate-pulse')}
      />
      {u.label}
    </Badge>
  );
}

/**
 * Request status has its own visual language (icon + calm tone) so it can never be confused with
 * urgency, which uses red/orange/amber/sky with a dot. Text + icon means status never relies on colour alone.
 */
const statusMap: Record<RequestStatus, { tone: BadgeTone; label: string; icon: LucideIcon }> = {
  new: { tone: 'brand', label: 'New', icon: CircleDot },
  in_review: { tone: 'neutral', label: 'In review', icon: Eye },
  assigned: { tone: 'neutral', label: 'Assigned', icon: UserCheck },
  scheduled: { tone: 'neutral', label: 'Scheduled', icon: CalendarCheck },
  completed: { tone: 'green', label: 'Completed', icon: CheckCircle2 },
  closed: { tone: 'neutral', label: 'Closed', icon: Archive },
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const s = statusMap[status];
  const Icon = s.icon;
  return (
    <Badge tone={s.tone} className="gap-1">
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {s.label}
    </Badge>
  );
}

const decisionMap: Record<Decision, { tone: BadgeTone; label: string }> = {
  pending: { tone: 'amber', label: 'Pending review' },
  approved: { tone: 'green', label: 'Approved' },
  rejected: { tone: 'red', label: 'Rejected' },
};
export function DecisionBadge({ decision }: { decision: Decision }) {
  const d = decisionMap[decision];
  return <Badge tone={d.tone}>{d.label}</Badge>;
}

export function AiBadge({ className }: { className?: string }) {
  return (
    <Badge tone="ai" className={className}>
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      Simulated AI
    </Badge>
  );
}
