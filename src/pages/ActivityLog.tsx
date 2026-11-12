import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ScrollText } from 'lucide-react';
import { Badge, Card, EmptyState, Field, Input, PageHeader, Select, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { fmtDateTime } from '@/lib/format';
import type { Activity } from '@/types';
import { useHighlight } from '@/pages/receptionist/useHighlight';

type ActorType = 'staff' | 'patient' | 'ai' | 'automation' | 'system';
const ACTOR_LABEL: Record<ActorType, { label: string; tone: BadgeTone }> = {
  staff: { label: 'Staff', tone: 'brand' }, patient: { label: 'Patient', tone: 'sky' }, ai: { label: 'Simulated AI', tone: 'ai' },
  automation: { label: 'Automation', tone: 'amber' }, system: { label: 'System', tone: 'neutral' },
};
const actorType = (a: Activity): ActorType => (['patient', 'ai', 'automation', 'system'].includes(a.actor) ? (a.actor as ActorType) : 'staff');
const KINDS = ['request', 'document', 'note', 'task', 'referral', 'automation', 'call', 'ai'];

export default function ActivityLog() {
  const activities = useStore((s) => s.activities);
  const patients = useStore((s) => s.patients);
  const staff = useStore((s) => s.staff);
  const highlight = useHighlight();
  const [actor, setActor] = useState('');
  const [kind, setKind] = useState('');
  const [patient, setPatient] = useState('');
  const [q, setQ] = useState('');

  const pname = (id?: string) => patients.find((p) => p.id === id)?.name;
  const actorName = (a: Activity) => (actorType(a) === 'staff' ? staff.find((s) => s.id === a.actor)?.name ?? String(a.actor) : ACTOR_LABEL[actorType(a)].label);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...activities]
      .filter((a) => (!actor || actorType(a) === actor) && (!kind || a.kind.split('.')[0] === kind) && (!patient || a.patientId === patient) &&
        (!needle || a.message.toLowerCase().includes(needle) || a.kind.includes(needle)))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [activities, actor, kind, patient, q]);

  return (
    <div>
      <PageHeader title="Activity log" description="A full audit trail of what staff, patients, simulated AI and automations have done." />
      <p className="mb-4 flex items-center gap-2 rounded-xl bg-ink-100 p-3 text-sm text-ink-700 dark:bg-ink-800 dark:text-ink-300">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        This log is append-only. Entries cannot be edited or deleted. Mistakes are corrected by adding a new entry.
      </p>
      <Card>
        <div className="grid gap-3 border-b border-ink-200 p-4 dark:border-ink-800 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Who">
            <Select value={actor} onChange={(e) => setActor(e.target.value)}>
              <option value="">Everyone</option>
              {(Object.keys(ACTOR_LABEL) as ActorType[]).map((k) => <option key={k} value={k}>{ACTOR_LABEL[k].label}</option>)}
            </Select>
          </Field>
          <Field label="Type of event">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All events</option>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </Field>
          <Field label="Patient">
            <Select value={patient} onChange={(e) => setPatient(e.target.value)}>
              <option value="">All patients</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Search">
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" />
          </Field>
        </div>
        <p className="px-4 pt-3 text-xs text-ink-600 dark:text-ink-400" aria-live="polite">Showing {rows.length} of {activities.length} entries</p>
        {rows.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-5 w-5" />} title="No matching entries" description="Try clearing a filter." />
        ) : (
          <Table>
            <caption className="sr-only">Activity log, newest first</caption>
            <THead><tr><TH>Time</TH><TH>Who</TH><TH>Patient</TH><TH>What happened</TH></tr></THead>
            <TBody>
              {rows.map((a) => (
                <TR key={a.id} data-entity-id={a.id} highlighted={highlight === a.id}>
                  <TD className="whitespace-nowrap">{fmtDateTime(a.at)}</TD>
                  <TD><Badge tone={ACTOR_LABEL[actorType(a)].tone}>{actorName(a)}</Badge></TD>
                  <TD>{a.patientId ? <Link className="text-brand-800 underline dark:text-brand-300" to={`/patients/${a.patientId}`}>{pname(a.patientId) ?? a.patientId}</Link> : '—'}</TD>
                  <TD>{a.message} <span className="ml-1 text-xs text-ink-600 dark:text-ink-400">({a.kind})</span></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
