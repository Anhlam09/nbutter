import { useState } from 'react';
import { Check, Pencil, Undo2, X } from 'lucide-react';
import { useCurrentStaff, useStore } from '@/store/useStore';
import { can, denyReason, type Permission } from '@/lib/permissions';
import { ApprovalGate, Button, DecisionBadge, Input, useToast } from '@/components/ui';
import type { Suggestion } from '@/types';
import { suggestionPermission } from '@/store/core';
import { staffNameOf } from '../patients/helpers';

// Single source of truth lives in the store, so UI gates and store checks always agree.
export const permissionFor = (s: Suggestion): Permission => suggestionPermission(s.kind);

export function SuggestionItem({ docId, s }: { docId: string; s: Suggestion }) {
  const staff = useCurrentStaff();
  const allStaff = useStore((st) => st.staff);
  const decide = useStore((st) => st.decideSuggestion);
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.editedText ?? s.text);

  const perm = permissionFor(s);
  const allowed = can(staff, perm);
  const shown = s.editedText ?? s.text;
  const pending = s.decision === 'pending';

  const run = (decision: 'pending' | 'approved' | 'rejected', text?: string) => {
    const r = decide(docId, s.id, decision, text);
    if (!r.ok) toast({ title: 'Could not record decision', description: r.error, tone: 'red' });
    return r.ok;
  };

  const saveEdit = () => {
    if (!draft.trim()) {
      toast({ title: 'Text cannot be empty', tone: 'red' });
      return;
    }
    if (run('pending', draft)) {
      setEditing(false);
      toast({ title: 'Edit saved', description: 'Still needs your decision.', tone: 'sky' });
    }
  };

  return (
    <li className="rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-700 dark:bg-ink-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={`edit-${s.id}`} className="sr-only">Edit suggestion text</label>
              <Input id={`edit-${s.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} className="min-w-0 flex-1" />
              <Button size="sm" onClick={saveEdit}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(shown); }}>Cancel</Button>
            </div>
          ) : (
            <p className="text-sm font-medium text-ink-900 dark:text-ink-100">
              {shown}
              {s.editedText && <span className="ml-2 text-xs font-normal text-ink-600 dark:text-ink-400">(edited; original: {s.text})</span>}
            </p>
          )}
          {s.detail && <p className="mt-0.5 text-xs text-ink-600 dark:text-ink-400">{s.detail}</p>}
          {s.code && <p className="mt-0.5 text-xs text-ink-600 dark:text-ink-400">Code: {s.code} (placeholder code)</p>}
          {!pending && s.decidedBy && (
            <p className="mt-0.5 text-xs text-ink-600 dark:text-ink-400">
              {s.decision === 'approved' ? 'Approved' : 'Rejected'} by {staffNameOf(allStaff, s.decidedBy)}
            </p>
          )}
        </div>
        <DecisionBadge decision={s.decision} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {pending ? (
          <>
            <ApprovalGate allowed={allowed} reason={denyReason(perm)}>
              <span className="inline-flex gap-2">
                <Button size="sm" iconLeft={<Check className="h-3.5 w-3.5" aria-hidden="true" />} disabled={!allowed}
                  onClick={() => run('approved', editing ? draft : undefined) && setEditing(false)}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" iconLeft={<X className="h-3.5 w-3.5" aria-hidden="true" />} disabled={!allowed}
                  onClick={() => run('rejected')}>
                  Reject
                </Button>
              </span>
            </ApprovalGate>
            {!editing && allowed && (
              <Button size="sm" variant="ghost" iconLeft={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => { setDraft(shown); setEditing(true); }}>
                Edit text
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" variant="secondary" iconLeft={<Undo2 className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => run('pending')}
            disabled={!allowed} title={allowed ? undefined : denyReason(perm)}>
            Undo
          </Button>
        )}
      </div>
    </li>
  );
}
