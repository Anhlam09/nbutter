import { ShieldAlert } from 'lucide-react';
import type { SecurityFlag } from '@/types';

const KIND_LABEL: Record<SecurityFlag['kind'], string> = {
  injection: 'Instruction-like text',
  secret: 'Secret removed',
  truncated: 'Shortened',
  hidden_chars: 'Hidden characters removed',
  markup: 'Markup shown as text',
  pii: 'Personal data removed',
};

/** Shown wherever untrusted input is reviewed: explains that suspicious text is treated as data, never obeyed. */
export function SecurityFlagsNotice({ flags }: { flags?: SecurityFlag[] }) {
  if (!flags?.length) return null;
  return (
    <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="flex items-center gap-2 font-semibold">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        Security check: treated as data only
      </p>
      <p className="mt-1">
        This content came from outside the clinic. It was cleaned before saving, and nothing in it can change permissions,
        approve actions, or instruct the simulated AI.
      </p>
      <ul className="mt-2 space-y-0.5">
        {flags.map((f, i) => (
          <li key={i}>
            <span className="font-medium">{KIND_LABEL[f.kind]}:</span> {f.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}
