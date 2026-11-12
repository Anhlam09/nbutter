import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Plus, Send } from 'lucide-react';
import clsx from 'clsx';
import {
  ApprovalGate, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Select, Table, TBody, TD,
  TH, THead, Tabs, TR, Textarea, useToast,
} from '@/components/ui';
import { useCurrentStaff, useStore } from '@/store/useStore';
import { can, denyReason } from '@/lib/permissions';
import { fmtDate, referralStatusLabel } from '@/lib/format';
import { isOverdue } from '@/store/selectors';
import type { Referral, ReferralStatus } from '@/types';
import { useHighlight } from '@/pages/receptionist/useHighlight';

const PIPELINE: ReferralStatus[] = ['drafted', 'sent', 'acknowledged', 'booked', 'completed'];
const PRIORITY: Record<Referral['priority'], { label: string; tone: 'neutral' | 'amber' | 'red' }> = {
  routine: { label: 'Routine', tone: 'neutral' }, urgent: { label: 'Urgent', tone: 'amber' }, two_week_wait: { label: 'Two-week wait', tone: 'red' },
};

function Pipeline({ status }: { status: ReferralStatus }) {
  const at = PIPELINE.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label={`Status: ${referralStatusLabel(status)}`}>
      {PIPELINE.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span
            aria-current={i === at ? 'step' : undefined}
            className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
              i === at ? 'bg-brand-700 text-white ring-brand-700 dark:bg-brand-600 dark:ring-brand-600'
                : i < at ? 'bg-brand-50 text-brand-900 ring-brand-200 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-800'
                  : 'bg-ink-50 text-ink-600 ring-ink-200 dark:bg-ink-900 dark:text-ink-400 dark:ring-ink-700')}
          >
            {i < at && <Check className="h-3 w-3" aria-hidden="true" />}
            {referralStatusLabel(s)}
          </span>
          {i < PIPELINE.length - 1 && <ChevronRight className="h-3 w-3 text-ink-500" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export default function Referrals() {
  const referrals = useStore((s) => s.referrals);
  const patients = useStore((s) => s.patients);
  const tasks = useStore((s) => s.tasks);
  const staffList = useStore((s) => s.staff);
  const setStatus = useStore((s) => s.setReferralStatus);
  const createReferral = useStore((s) => s.createReferral);
  const completeTask = useStore((s) => s.completeTask);
  const staff = useCurrentStaff();
  const { toast } = useToast();
  const highlight = useHighlight();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('mine');
  const [form, setForm] = useState({ patientId: '', specialty: '', destination: '', reason: '', priority: 'routine' as Referral['priority'], expectedBy: inDays(28) });
  const [tried, setTried] = useState(false);

  const pname = (id?: string) => patients.find((p) => p.id === id)?.name ?? '—';
  const sname = (id?: string) => staffList.find((s) => s.id === id)?.name ?? 'Unassigned';
  const now = new Date();

  const advance = (r: Referral) => {
    const next = PIPELINE[PIPELINE.indexOf(r.status) + 1];
    if (!next) return;
    const res = setStatus(r.id, next);
    toast(res.ok ? { title: 'Referral updated', description: `Now: ${referralStatusLabel(next)}`, tone: 'green' } : { title: 'Could not update', description: res.error, tone: 'red' });
  };

  const submit = () => {
    setTried(true);
    if (!form.patientId || !form.specialty.trim() || !form.destination.trim() || !form.reason.trim() || !form.expectedBy) return;
    const res = createReferral({ ...form, specialty: form.specialty.trim(), destination: form.destination.trim(), reason: form.reason.trim(), expectedBy: new Date(form.expectedBy).toISOString() });
    if (!res.ok) return toast({ title: 'Could not create referral', description: res.error, tone: 'red' });
    toast({ title: 'Referral drafted', description: 'It starts at "Drafted" and needs sending.', tone: 'green' });
    setOpen(false); setTried(false);
    setForm({ ...form, patientId: '', specialty: '', destination: '', reason: '' });
  };

  const openTasks = useMemo(() => tasks.filter((t) => t.status === 'open'), [tasks]);
  const filtered = openTasks.filter((t) =>
    tab === 'mine' ? t.assigneeId === staff.id : tab === 'overdue' ? isOverdue(t.due, now) : tab === 'clinical' ? t.clinical : true,
  ).sort((a, b) => (a.due ?? '9').localeCompare(b.due ?? '9'));

  const sortedRefs = [...referrals].sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || a.expectedBy.localeCompare(b.expectedBy));
  const err = (v: string) => (tried && !v.trim() ? 'Required' : undefined);

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Referrals and follow-ups"
          description="Track referrals from draft to completion, and keep on top of open follow-up tasks. All destinations are fictional."
          actions={<Button onClick={() => setOpen(true)} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>New referral</Button>}
        />
        <Card>
          {sortedRefs.length === 0 ? (
            <EmptyState icon={<Send className="h-5 w-5" />} title="No referrals" description="Create a referral to start tracking it." />
          ) : (
            <Table className="min-w-[60rem]">
              <caption className="sr-only">Referrals</caption>
              <THead><tr><TH>Patient</TH><TH>Referral</TH><TH>Progress</TH><TH>Expected by</TH><TH><span className="sr-only">Action</span></TH></tr></THead>
              <TBody>
                {sortedRefs.map((r) => {
                  const overdue = r.status !== 'completed' && isOverdue(r.expectedBy, now);
                  return (
                    <TR key={r.id} data-entity-id={r.id} highlighted={highlight === r.id}>
                      <TD><Link className="font-medium text-brand-800 underline dark:text-brand-300" to={`/patients/${r.patientId}`}>{pname(r.patientId)}</Link></TD>
                      <TD>
                        <p className="font-medium">{r.specialty} <Badge tone={PRIORITY[r.priority].tone}>{PRIORITY[r.priority].label}</Badge></p>
                        <p className="text-xs text-ink-600 dark:text-ink-400">{r.destination}</p>
                        <p className="text-xs text-ink-600 dark:text-ink-400">{r.reason}</p>
                      </TD>
                      <TD><Pipeline status={r.status} /></TD>
                      <TD>
                        {fmtDate(r.expectedBy)} {overdue && <Badge tone="red">Overdue</Badge>}
                      </TD>
                      <TD>
                        {r.status !== 'completed' && (
                          <Button size="sm" variant="secondary" onClick={() => advance(r)}
                            aria-label={`Advance referral for ${pname(r.patientId)} to ${referralStatusLabel(PIPELINE[PIPELINE.indexOf(r.status) + 1])}`}>
                            Advance
                          </Button>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <section aria-labelledby="fu">
        <Card>
          <CardHeader title={<span id="fu">Follow-up tasks</span>} description="Open tasks across all patients. Clinical tasks can only be completed by a clinician." />
          <div className="px-5 pt-2">
            <Tabs label="Task filter" value={tab} onChange={setTab} items={[
              { value: 'mine', label: 'Mine', count: openTasks.filter((t) => t.assigneeId === staff.id).length },
              { value: 'all', label: 'All', count: openTasks.length },
              { value: 'overdue', label: 'Overdue', count: openTasks.filter((t) => isOverdue(t.due, now)).length },
              { value: 'clinical', label: 'Clinical', count: openTasks.filter((t) => t.clinical).length },
            ]} />
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="Nothing here" description="No open tasks match this filter." />
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {filtered.map((t) => {
                const allowed = !t.clinical || can(staff, 'completeClinicalTask');
                const late = isOverdue(t.due, now);
                return (
                  <li key={t.id} data-entity-id={t.id} className={clsx('flex flex-wrap items-center justify-between gap-3 px-5 py-3', highlight === t.id && 'bg-brand-50 dark:bg-brand-950/40')}>
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900 dark:text-ink-50">{t.title}</p>
                      <p className="text-xs text-ink-600 dark:text-ink-400">
                        {t.patientId ? <Link className="underline" to={`/patients/${t.patientId}`}>{pname(t.patientId)}</Link> : 'No patient'}
                        {' · '}{sname(t.assigneeId)} · Due {fmtDate(t.due)}{' '}
                        {late && <Badge tone="red">Overdue</Badge>} {t.clinical && <Badge tone="brand">Clinical</Badge>}
                      </p>
                    </div>
                    <ApprovalGate allowed={allowed} reason={denyReason('completeClinicalTask')}>
                      <Button size="sm" variant="secondary" disabled={!allowed} aria-label={`Complete task: ${t.title}`}
                        onClick={() => {
                          const res = completeTask(t.id);
                          toast(res.ok ? { title: 'Task completed', tone: 'green' } : { title: 'Could not complete task', description: res.error, tone: 'red' });
                        }}>
                        Mark done
                      </Button>
                    </ApprovalGate>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <Modal
        open={open} onClose={() => setOpen(false)} title="New referral"
        description="Creates a draft. Nothing is sent anywhere. All providers here are fictional."
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Create referral</Button></>}
      >
        <div className="space-y-3">
          <Field label="Patient" required error={tried && !form.patientId ? 'Choose a patient' : undefined}>
            <Select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
              <option value="">Choose…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Specialty" required error={err(form.specialty)}><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Cardiology" /></Field>
            <Field label="Destination (fictional)" required error={err(form.destination)}><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Northbank Hospital outpatients" /></Field>
          </div>
          <Field label="Reason" required error={err(form.reason)}><Textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Referral['priority'] })}>
                <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="two_week_wait">Two-week wait</option>
              </Select>
            </Field>
            <Field label="Expected by" required><Input type="date" value={form.expectedBy} onChange={(e) => setForm({ ...form, expectedBy: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
