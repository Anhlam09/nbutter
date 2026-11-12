import { useState } from 'react';
import { ArrowRight, ArrowDown, Filter, Pencil, Plus, Trash2, Workflow, Zap } from 'lucide-react';
import clsx from 'clsx';
import {
  ApprovalGate, Badge, Button, Card, CardBody, CardHeader, EmptyState, Modal, PageHeader, useToast,
} from '@/components/ui';
import { useCurrentStaff, useStore } from '@/store/useStore';
import { can, denyReason } from '@/lib/permissions';
import { fmtDateTime, relativeTime } from '@/lib/format';
import { describeAction } from '@/store/automations';
import type { AutomationRule } from '@/types';
import { Builder, emptyDraft, type RuleDraft } from '@/pages/automations/Builder';
import { describeCondition, plainEnglish, triggerLabel } from '@/pages/automations/labels';
import { useHighlight } from '@/pages/receptionist/useHighlight';

function Node({ tone, icon, label, children }: { tone: 'brand' | 'amber' | 'sky'; icon: React.ReactNode; label: string; children: React.ReactNode }) {
  const tones = {
    brand: 'border-brand-300 bg-brand-50/70 dark:border-brand-800 dark:bg-brand-950/30',
    amber: 'border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30',
    sky: 'border-sky-300 bg-sky-50/70 dark:border-sky-800 dark:bg-sky-950/30',
  };
  return (
    <div className={clsx('min-w-0 flex-1 rounded-xl border p-3', tones[tone])}>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-700 dark:text-ink-300">
        <span aria-hidden="true">{icon}</span>{label}
      </p>
      <div className="space-y-1 text-sm text-ink-900 dark:text-ink-100">{children}</div>
    </div>
  );
}
const Connector = () => (
  <>
    <ArrowRight className="hidden h-5 w-5 shrink-0 self-center text-ink-500 dark:text-ink-400 lg:block" aria-hidden="true" />
    <ArrowDown className="mx-auto h-5 w-5 shrink-0 text-ink-500 dark:text-ink-400 lg:hidden" aria-hidden="true" />
  </>
);

export default function Automations() {
  const automations = useStore((s) => s.automations);
  const activities = useStore((s) => s.activities);
  const toggle = useStore((s) => s.toggleAutomation);
  const upsert = useStore((s) => s.upsertAutomation);
  const remove = useStore((s) => s.deleteAutomation);
  const staff = useCurrentStaff();
  const allowed = can(staff, 'manageAutomations');
  const { toast } = useToast();
  const highlight = useHighlight();
  const [editing, setEditing] = useState<RuleDraft | null>(null);
  const [deleting, setDeleting] = useState<AutomationRule | null>(null);

  const runs = activities.filter((a) => a.kind === 'automation.ran').slice(0, 15);
  const fail = (title: string, error: string) => toast({ title, description: error, tone: 'red' });

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Rules that run on their own: WHEN something happens, IF it matches, THEN do these steps. Automations never change clinical notes or coding."
        actions={
          <ApprovalGate allowed={allowed} reason={denyReason('manageAutomations')}>
            <Button disabled={!allowed} onClick={() => setEditing(emptyDraft())} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
              New automation
            </Button>
          </ApprovalGate>
        }
      />

      {automations.length === 0 ? (
        <Card><EmptyState icon={<Workflow className="h-5 w-5" />} title="No automations yet" description="Create one to save repetitive admin steps." /></Card>
      ) : (
        <ul className="space-y-4">
          {automations.map((r) => {
            const conds = r.conditions.filter((c) => c.field !== 'always');
            return (
              <li key={r.id} data-entity-id={r.id}>
                <Card className={clsx('p-4', highlight === r.id && 'ring-2 ring-ai-500', !r.enabled && 'opacity-80')}>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-ink-900 dark:text-ink-50">{r.name}</h2>
                      <p className="text-sm text-ink-600 dark:text-ink-400">{r.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-ink-600 dark:text-ink-400">
                        {r.runCount} run{r.runCount === 1 ? '' : 's'} · Last run {r.lastRunAt ? relativeTime(r.lastRunAt) : 'never'}
                      </span>
                      <ApprovalGate allowed={allowed} reason={denyReason('manageAutomations')}>
                        <button
                          type="button" role="switch" aria-checked={r.enabled} disabled={!allowed}
                          aria-label={`${r.name}: ${r.enabled ? 'enabled' : 'disabled'}`}
                          onClick={() => { const res = toggle(r.id); if (!res.ok) fail('Could not change automation', res.error); }}
                          className={clsx('inline-flex items-center gap-2 rounded-full px-1 py-1 pr-3 text-xs font-medium ring-1 ring-inset',
                            r.enabled ? 'bg-brand-50 text-brand-900 ring-brand-300 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-800' : 'bg-ink-100 text-ink-700 ring-ink-300 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-600')}
                        >
                          <span className={clsx('h-5 w-9 rounded-full p-0.5 transition-colors', r.enabled ? 'bg-brand-700 dark:bg-brand-500' : 'bg-ink-400 dark:bg-ink-600')} aria-hidden="true">
                            <span className={clsx('block h-4 w-4 rounded-full bg-white transition-transform', r.enabled && 'translate-x-4')} />
                          </span>
                          {r.enabled ? 'On' : 'Off'}
                        </button>
                      </ApprovalGate>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:flex-row">
                    <Node tone="brand" icon={<Zap className="h-3.5 w-3.5" />} label="When"><p>{triggerLabel(r.trigger)}</p></Node>
                    <Connector />
                    <Node tone="amber" icon={<Filter className="h-3.5 w-3.5" />} label="If">
                      {conds.length ? conds.map((c, i) => <p key={i}>{describeCondition(c)}</p>) : <p>Always</p>}
                    </Node>
                    <Connector />
                    <Node tone="sky" icon={<Workflow className="h-3.5 w-3.5" />} label="Then">
                      {r.actions.map((a, i) => <p key={i}>{i + 1}. {describeAction(a)}</p>)}
                    </Node>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-ink-600 dark:text-ink-400">{plainEnglish(r)}</p>
                    <ApprovalGate allowed={allowed} reason={denyReason('manageAutomations')}>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled={!allowed} aria-label={`Edit ${r.name}`}
                          onClick={() => setEditing({ ...r, conditions: r.conditions.length ? r.conditions : [{ field: 'always', op: 'equals', value: '' }] })}
                          iconLeft={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}>Edit</Button>
                        <Button variant="ghost" size="sm" disabled={!allowed} aria-label={`Delete ${r.name}`} onClick={() => setDeleting(r)}
                          iconLeft={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}>Delete</Button>
                      </div>
                    </ApprovalGate>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="mt-8">
        <CardHeader title="Recent automation runs" description="Latest entries from the activity log." />
        {runs.length === 0 ? (
          <EmptyState title="No runs yet" description="Runs appear when an event matches an enabled rule, for example a new request." />
        ) : (
          <CardBody>
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {runs.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                  <span>{a.message}</span>
                  <span className="text-xs text-ink-600 dark:text-ink-400"><Badge tone="neutral">Automation</Badge> {fmtDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        )}
      </Card>

      {editing && (
        <Builder
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(rule) => {
            const res = upsert(rule);
            if (!res.ok) return fail('Could not save automation', res.error);
            toast({ title: 'Automation saved', description: rule.name, tone: 'green' });
            setEditing(null);
          }}
        />
      )}
      <Modal
        open={!!deleting} onClose={() => setDeleting(null)} size="sm" title="Delete this automation?"
        description={deleting ? `"${deleting.name}" will stop running. Past runs stay in the activity log.` : undefined}
        footer={<>
          <Button variant="secondary" onClick={() => setDeleting(null)}>Keep it</Button>
          <Button variant="danger" onClick={() => {
            if (!deleting) return;
            const res = remove(deleting.id);
            if (!res.ok) fail('Could not delete', res.error); else toast({ title: 'Automation deleted', tone: 'neutral' });
            setDeleting(null);
          }}>Delete</Button>
        </>}
      />
    </div>
  );
}
