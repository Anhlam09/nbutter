import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import type { AutomationAction, AutomationCondition, AutomationRule, AutomationTrigger } from '@/types';
import {
  ACTION_TYPES, FIELDS, ROLES, STATUSES, TRIGGERS, defaultAction, plainEnglish, roleLabel, statusLabel, valueOptions,
} from './labels';

export type RuleDraft = Omit<AutomationRule, 'id' | 'runCount'> & { id?: string };

export const emptyDraft = (): RuleDraft => ({
  name: '', description: '', enabled: true, trigger: 'request.created',
  conditions: [{ field: 'always', op: 'equals', value: '' }],
  actions: [{ type: 'notify', message: '' }],
});

export function Builder({ initial, onClose, onSave }: {
  initial: RuleDraft; onClose: () => void; onSave: (r: RuleDraft) => void;
}) {
  const [d, setD] = useState<RuleDraft>(initial);
  const [tried, setTried] = useState(false);

  const setCond = (i: number, patch: Partial<AutomationCondition>) =>
    setD({ ...d, conditions: d.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const setAction = (i: number, a: AutomationAction) => setD({ ...d, actions: d.actions.map((x, j) => (j === i ? a : x)) });

  const actionError = (a: AutomationAction): string | undefined => {
    if (a.type === 'create_task' && !a.title.trim()) return 'Enter a task title';
    if (a.type === 'complete_task_matching' && !a.titleIncludes.trim()) return 'Enter the text to match';
    if (a.type === 'notify' && !a.message.trim()) return 'Enter a message';
    return undefined;
  };
  const nameError = !d.name.trim() ? 'Give the automation a name' : undefined;
  const valid = !nameError && d.actions.length > 0 && !d.actions.some(actionError) &&
    !d.conditions.some((c) => c.field !== 'always' && !c.value.trim());

  const save = () => {
    setTried(true);
    if (!valid) return;
    const conditions = d.conditions.filter((c) => c.field !== 'always');
    onSave({ ...d, name: d.name.trim(), description: d.description.trim(), conditions: conditions.length ? conditions : [{ field: 'always', op: 'equals', value: '' }] });
  };

  return (
    <Modal
      open onClose={onClose} size="lg"
      title={initial.id ? 'Edit automation' : 'New automation'}
      description="Choose when it runs, what it checks, and what it does."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save automation</Button></>}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" required error={tried ? nameError : undefined}>
            <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
          <Field label="When this happens (trigger)">
            <Select value={d.trigger} onChange={(e) => setD({ ...d, trigger: e.target.value as AutomationTrigger })}>
              {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Description">
          <Textarea rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">If (conditions, all must match)</legend>
          {d.conditions.map((c, i) => {
            const opts = valueOptions(c.field);
            const multi = c.value.includes(',');
            return (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                <Field label={`Condition ${i + 1} field`} className="min-w-40 flex-1">
                  <Select value={c.field} onChange={(e) => setCond(i, { field: e.target.value as AutomationCondition['field'], value: '' })}>
                    {FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </Select>
                </Field>
                {c.field !== 'always' && (
                  <>
                    <Field label="Operator" className="w-32">
                      <Select value={c.op} onChange={(e) => setCond(i, { op: e.target.value as AutomationCondition['op'] })}>
                        <option value="equals">is</option><option value="not_equals">is not</option>
                      </Select>
                    </Field>
                    <Field label="Value" className="min-w-40 flex-1" error={tried && !c.value.trim() ? 'Choose a value' : undefined}>
                      {multi ? (
                        <Input value={c.value} onChange={(e) => setCond(i, { value: e.target.value })} />
                      ) : (
                        <Select value={c.value} onChange={(e) => setCond(i, { value: e.target.value })}>
                          <option value="">Choose…</option>
                          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                      )}
                    </Field>
                  </>
                )}
                <Button variant="ghost" size="sm" aria-label={`Remove condition ${i + 1}`} disabled={d.conditions.length === 1}
                  onClick={() => setD({ ...d, conditions: d.conditions.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            );
          })}
          <Button variant="secondary" size="sm" iconLeft={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => setD({ ...d, conditions: [...d.conditions, { field: 'urgency', op: 'equals', value: '' }] })}>
            Add condition
          </Button>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Then (actions, run in order)</legend>
          {d.actions.map((a, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-ink-200 p-3 dark:border-ink-800">
              <Field label={`Action ${i + 1} type`} className="min-w-44">
                <Select value={a.type} onChange={(e) => setAction(i, defaultAction(e.target.value as AutomationAction['type']))}>
                  {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              {a.type === 'set_status' && (
                <Field label="Status" className="min-w-40 flex-1">
                  <Select value={a.status} onChange={(e) => setAction(i, { ...a, status: e.target.value as typeof a.status })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </Select>
                </Field>
              )}
              {a.type === 'assign_role' && (
                <Field label="Role" className="min-w-40 flex-1">
                  <Select value={a.role} onChange={(e) => setAction(i, { ...a, role: e.target.value as typeof a.role })}>
                    {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </Select>
                </Field>
              )}
              {a.type === 'create_task' && (
                <>
                  <Field label="Task title" className="min-w-48 flex-1" error={tried ? actionError(a) : undefined}>
                    <Input value={a.title} onChange={(e) => setAction(i, { ...a, title: e.target.value })} />
                  </Field>
                  <Field label="Due in (days)" className="w-28">
                    <Input type="number" min={0} max={90} value={a.dueInDays}
                      onChange={(e) => setAction(i, { ...a, dueInDays: Math.max(0, Number(e.target.value) || 0) })} />
                  </Field>
                  <label className="flex h-10 items-center gap-2 text-sm">
                    <input type="checkbox" checked={a.clinical} onChange={(e) => setAction(i, { ...a, clinical: e.target.checked })} />
                    Clinical task
                  </label>
                </>
              )}
              {a.type === 'complete_task_matching' && (
                <Field label="Task title contains" className="min-w-48 flex-1" error={tried ? actionError(a) : undefined}>
                  <Input value={a.titleIncludes} onChange={(e) => setAction(i, { ...a, titleIncludes: e.target.value })} />
                </Field>
              )}
              {a.type === 'notify' && (
                <Field label="Message" className="min-w-48 flex-1" error={tried ? actionError(a) : undefined}>
                  <Input value={a.message} onChange={(e) => setAction(i, { ...a, message: e.target.value })} />
                </Field>
              )}
              <Button variant="ghost" size="sm" aria-label={`Remove action ${i + 1}`} disabled={d.actions.length === 1}
                onClick={() => setD({ ...d, actions: d.actions.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" iconLeft={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => setD({ ...d, actions: [...d.actions, defaultAction('notify')] })}>
            Add action
          </Button>
        </fieldset>

        <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600 dark:text-ink-400">Preview</p>
          <p className="mt-1 text-sm">{plainEnglish(d)}</p>
        </div>
      </div>
    </Modal>
  );
}
