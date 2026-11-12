import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CalendarClock, ClipboardList, FileText, Mail, Phone, TriangleAlert, UserX } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCurrentStaff, useStore } from '@/store/useStore';
import { patientView } from '@/store/selectors';
import { can, denyReason } from '@/lib/permissions';
import {
  ageFromDob, documentKindLabel, fmtDate, fmtDateTime, referralStatusLabel, relativeTime, roleLabel,
} from '@/lib/format';
import {
  AiBadge, ApprovalGate, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input,
  PageHeader, RequestStatusBadge, Select, Tabs, Timeline, UrgencyBadge, useToast,
  type BadgeTone, type TimelineItem,
} from '@/components/ui';
import type { ClinicalDocument, DocumentStatus, Task } from '@/types';
import { actorLabel, staffNameOf, useHighlight } from './patients/helpers';
import { EntityCard, muted } from './patients/shared';

type TabKey = 'overview' | 'requests' | 'documents' | 'appointments' | 'notes' | 'tasks' | 'referrals' | 'timeline';
const TAB_KEYS: TabKey[] = ['overview', 'requests', 'documents', 'appointments', 'notes', 'tasks', 'referrals', 'timeline'];

const docStatusTone: Record<DocumentStatus, { tone: BadgeTone; label: string }> = {
  inbox: { tone: 'brand', label: 'In inbox' },
  review: { tone: 'ai', label: 'Awaiting review' },
  filed: { tone: 'green', label: 'Filed' },
  rejected: { tone: 'red', label: 'Rejected' },
};

export default function PatientRecord() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const [patients, requests, appointments, documents, notes, tasks, referrals, activities, allStaff] = useStore(
    useShallow((s) => [s.patients, s.requests, s.appointments, s.documents, s.notes, s.tasks, s.referrals, s.activities, s.staff]),
  );
  const highlight = useStore((s) => s.highlight);

  const view = useMemo(
    () => patientView({ patients, requests, appointments, documents, notes, tasks, referrals, activities } as never, id),
    [patients, requests, appointments, documents, notes, tasks, referrals, activities, id],
  );

  const initial = params.get('tab');
  const [tab, setTabState] = useState<TabKey>(TAB_KEYS.includes(initial as TabKey) ? (initial as TabKey) : 'overview');
  const setTab = (t: string) => {
    setTabState(t as TabKey);
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };
  // Follow ?tab= when it changes from outside (e.g. links).
  useEffect(() => {
    const t = params.get('tab');
    if (t && TAB_KEYS.includes(t as TabKey)) setTabState(t as TabKey);
  }, [params]);

  // Guided demo: switch to the tab that holds the highlighted entity.
  useEffect(() => {
    if (!highlight) return;
    const has = (list: { id: string }[]) => list.some((x) => x.id === highlight);
    const target: TabKey | null = has(view.requests) ? 'requests'
      : has(view.documents) ? 'documents'
      : has(view.appointments) ? 'appointments'
      : has(view.notes) ? 'notes'
      : has(view.tasks) ? 'tasks'
      : has(view.referrals) ? 'referrals'
      : null;
    if (target) setTabState(target);
  }, [highlight, view.requests, view.documents, view.appointments, view.notes, view.tasks, view.referrals]);

  const { patient } = view;
  if (!patient) {
    return (
      <>
      <h1 className="sr-only">Patient not found</h1>
      <Card>
        <EmptyState
          icon={<UserX className="h-6 w-6" />}
          title="Patient not found"
          description="This record does not exist. It may have been reset."
          action={<Link className="text-sm font-medium text-brand-800 underline dark:text-brand-300" to="/patients">Back to patients</Link>}
        />
      </Card>
      </>
    );
  }

  const openTasks = view.tasks.filter((t) => t.status === 'open');
  const openRequests = view.requests.filter((r) => !['completed', 'closed'].includes(r.status));
  const nowIso = new Date().toISOString();
  const nextAppt = view.appointments
    .filter((a) => a.status === 'booked' && a.start > nowIso)
    .sort((a, b) => a.start.localeCompare(b.start))[0];

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'requests', label: 'Requests', count: view.requests.length },
    { value: 'documents', label: 'Documents', count: view.documents.length },
    { value: 'appointments', label: 'Appointments', count: view.appointments.length },
    { value: 'notes', label: 'Notes', count: view.notes.length },
    { value: 'tasks', label: 'Tasks', count: openTasks.length },
    { value: 'referrals', label: 'Referrals', count: view.referrals.length },
    { value: 'timeline', label: 'Timeline' },
  ];

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link to="/patients" className="text-brand-800 hover:underline dark:text-brand-300">&larr; All patients</Link>
      </p>
      <PageHeader
        title={patient.name}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{ageFromDob(patient.dob)} years · DOB {fmtDate(patient.dob)}</span>
            <span>NHS no. {patient.nhsNumber}</span>
            <span>Sex: {patient.sex}</span>
            <span>Registered GP: {staffNameOf(allStaff, patient.registeredGpId)}</span>
          </span>
        }
      />
      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2">
        {patient.allergies.length > 0 && (
          <Badge tone="red">
            <TriangleAlert className="h-3 w-3" aria-hidden="true" />
            Allergy alert: {patient.allergies.join(', ')}
          </Badge>
        )}
        {patient.flags.map((f) => <Badge key={f} tone="amber">{f}</Badge>)}
        <span className={`inline-flex items-center gap-1 text-sm ${muted}`}><Phone className="h-3.5 w-3.5" aria-hidden="true" />{patient.phone}</span>
        <span className={`inline-flex items-center gap-1 text-sm ${muted}`}><Mail className="h-3.5 w-3.5" aria-hidden="true" />{patient.email}</span>
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} label="Patient record sections" />
      <div role="tabpanel" aria-label={tab} className="pt-5">
        {tab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Conditions" />
              <CardBody>
                {patient.conditions.length === 0 ? <p className={muted}>No conditions recorded.</p> : (
                  <ul className="space-y-2">
                    {patient.conditions.map((c) => (
                      <li key={c.label + c.code} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-ink-900 dark:text-ink-100">
                          {c.label} <span className={`font-normal ${muted}`}>since {c.since}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Badge tone={c.status === 'active' ? 'amber' : 'neutral'}>{c.status === 'active' ? 'Active' : 'Resolved'}</Badge>
                          <span className={`text-xs ${muted}`}>{c.code} (placeholder code)</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Medications" />
              <CardBody>
                {patient.medications.length === 0 ? <p className={muted}>No current medications.</p> : (
                  <ul className="space-y-2 text-sm">
                    {patient.medications.map((m) => (
                      <li key={m.name + m.since}>
                        <span className="font-medium text-ink-900 dark:text-ink-100">{m.name}</span>{' '}
                        <span className={muted}>· {m.dose} · since {m.since}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Allergies" />
              <CardBody>
                {patient.allergies.length === 0 ? <p className={muted}>No known allergies recorded.</p> : (
                  <ul className="flex flex-wrap gap-2">
                    {patient.allergies.map((a) => <li key={a}><Badge tone="red"><TriangleAlert className="h-3 w-3" aria-hidden="true" />{a}</Badge></li>)}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Next appointment" />
              <CardBody>
                {nextAppt ? (
                  <p className="flex items-start gap-2 text-sm">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-ink-600 dark:text-ink-400" aria-hidden="true" />
                    <span>
                      <span className="font-medium text-ink-900 dark:text-ink-100">{fmtDateTime(nextAppt.start)}</span> ({relativeTime(nextAppt.start)})
                      <br />{nextAppt.reason} with {staffNameOf(allStaff, nextAppt.staffId)}
                    </span>
                  </p>
                ) : <p className={muted}>No upcoming appointment booked.</p>}
              </CardBody>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Open tasks" description={`${openTasks.length} open · ${openRequests.length} open request${openRequests.length === 1 ? '' : 's'}`} />
              <CardBody>
                {openTasks.length === 0 ? <p className={muted}>No open tasks.</p> : (
                  <ul className="space-y-1.5 text-sm">
                    {openTasks.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-ink-600 dark:text-ink-400" aria-hidden="true" />
                        <span className="text-ink-900 dark:text-ink-100">{t.title}</span>
                        {t.clinical && <Badge tone="brand">Clinical</Badge>}
                        {t.due && <span className={`text-xs ${muted}`}>due {fmtDate(t.due)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            {view.requests.length === 0 && <Card><EmptyState title="No requests" description="This patient has not made any requests." /></Card>}
            {[...view.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => (
              <EntityCard key={r.id} id={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/triage/${r.id}`} className="font-medium text-brand-800 hover:underline dark:text-brand-300">{r.subject}</Link>
                  <span className="flex items-center gap-2"><UrgencyBadge urgency={r.urgency} /><RequestStatusBadge status={r.status} /></span>
                </div>
                <p className={`mt-1 text-sm ${muted}`}>{r.description}</p>
                <p className={`mt-1 text-xs ${muted}`}>Received {fmtDateTime(r.createdAt)} · Assigned to {staffNameOf(allStaff, r.assigneeId)}</p>
              </EntityCard>
            ))}
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-3">
            {view.documents.length === 0 && <Card><EmptyState icon={<FileText className="h-6 w-6" />} title="No documents" description="Nothing has been received for this patient." /></Card>}
            {[...view.documents].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).map((d: ClinicalDocument) => (
              <EntityCard key={d.id} id={d.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/documents?doc=${d.id}`} className="font-medium text-brand-800 hover:underline dark:text-brand-300">{d.title}</Link>
                  <Badge tone={docStatusTone[d.status].tone}>{docStatusTone[d.status].label}</Badge>
                </div>
                <p className={`mt-1 text-xs ${muted}`}>
                  {documentKindLabel(d.kind)} · from {d.source} · received {fmtDate(d.receivedAt)}
                  {d.filedAt && ` · filed ${fmtDate(d.filedAt)} by ${staffNameOf(allStaff, d.filedBy)}`}
                </p>
              </EntityCard>
            ))}
          </div>
        )}

        {tab === 'appointments' && (
          <div className="space-y-3">
            {view.appointments.length === 0 && <Card><EmptyState title="No appointments" /></Card>}
            {view.appointments.map((a) => (
              <EntityCard key={a.id} id={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink-900 dark:text-ink-100">{fmtDateTime(a.start)} · {a.durationMins} min</span>
                  <Badge tone={a.status === 'booked' ? 'sky' : a.status === 'completed' ? 'green' : 'neutral'}>
                    {a.status === 'booked' ? 'Booked' : a.status === 'completed' ? 'Completed' : 'Cancelled'}
                  </Badge>
                </div>
                <p className={`mt-1 text-sm ${muted}`}>
                  {a.reason} · {a.mode === 'in_person' ? 'In person' : a.mode === 'phone' ? 'Phone' : 'Video'} · {staffNameOf(allStaff, a.staffId)}
                </p>
              </EntityCard>
            ))}
          </div>
        )}

        {tab === 'notes' && <NotesTab patientId={patient.id} />}
        {tab === 'tasks' && <TasksTab patientId={patient.id} tasks={view.tasks} />}

        {tab === 'referrals' && (
          <div className="space-y-3">
            {view.referrals.length === 0 && <Card><EmptyState title="No referrals" /></Card>}
            {view.referrals.map((r) => (
              <EntityCard key={r.id} id={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink-900 dark:text-ink-100">{r.specialty}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={r.priority === 'routine' ? 'sky' : 'orange'}>
                      {r.priority === 'two_week_wait' ? 'Two-week wait' : r.priority === 'urgent' ? 'Urgent' : 'Routine'}
                    </Badge>
                    <Badge tone="brand">{referralStatusLabel(r.status)}</Badge>
                  </span>
                </div>
                <p className={`mt-1 text-sm ${muted}`}>{r.reason}</p>
                <p className={`mt-1 text-xs ${muted}`}>{r.destination} · expected by {fmtDate(r.expectedBy)} · created by {staffNameOf(allStaff, r.createdBy)}</p>
              </EntityCard>
            ))}
          </div>
        )}

        {tab === 'timeline' && <TimelineTab patientId={patient.id} />}
      </div>
    </div>
  );
}

function NotesTab({ patientId }: { patientId: string }) {
  const [notes, allStaff] = useStore(useShallow((s) => [s.notes, s.staff]));
  const mine = useMemo(
    () => notes.filter((n) => n.patientId === patientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes, patientId],
  );
  if (mine.length === 0) return <Card><EmptyState title="No consultation notes" description="Notes appear here once drafted in the Scribe." /></Card>;
  return (
    <div className="space-y-4">
      {mine.map((n) => (
        <EntityCard key={n.id} id={n.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Consultation note · {fmtDateTime(n.createdAt)}</h3>
            {n.status === 'draft' ? <Badge tone="amber">Draft, not yet approved</Badge> : <Badge tone="green">Approved</Badge>}
          </div>
          <p className={`mt-1 text-xs ${muted}`}>
            {n.status === 'approved'
              ? `${n.ai ? 'Drafted by Simulated AI' : `Written by ${staffNameOf(allStaff, n.authorId)}`}${n.edited ? ' (edited by clinician)' : ''} · approved by ${staffNameOf(allStaff, n.approvedBy)} on ${fmtDateTime(n.approvedAt)}`
              : `${n.ai ? 'Drafted by Simulated AI' : 'Draft'} · awaiting clinician approval`}
          </p>
          {n.status === 'approved' ? (
            <dl className="mt-3 space-y-3 text-sm">
              {([['Subjective', n.soap.subjective], ['Objective', n.soap.objective], ['Assessment', n.soap.assessment], ['Plan', n.soap.plan]] as const).map(([k, v]) => (
                <div key={k}>
                  <dt className="font-semibold text-ink-900 dark:text-ink-100">{k}</dt>
                  <dd className="whitespace-pre-wrap text-ink-700 dark:text-ink-300">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm">
              {n.ai && <AiBadge className="mr-2" />}
              <Link to={`/scribe?note=${n.id}`} className="font-medium text-brand-800 underline dark:text-brand-300">Open draft in Scribe to review</Link>
            </p>
          )}
        </EntityCard>
      ))}
    </div>
  );
}

function TaskRow({ task, patientId }: { task: Task; patientId: string }) {
  const staff = useCurrentStaff();
  const allStaff = useStore((s) => s.staff);
  const completeTask = useStore((s) => s.completeTask);
  const reopenTask = useStore((s) => s.reopenTask);
  const { toast } = useToast();
  const highlighted = useHighlight(task.id);
  void patientId;
  const allowed = !task.clinical || can(staff, 'completeClinicalTask');
  const done = task.status === 'done';

  const act = () => {
    const r = done ? reopenTask(task.id) : completeTask(task.id);
    if (!r.ok) toast({ title: 'Could not update task', description: r.error, tone: 'red' });
    else toast({ title: done ? 'Task reopened' : 'Task completed', description: task.title, tone: 'green' });
  };

  return (
    <div
      data-entity-id={task.id}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900 ${highlighted ? 'ring-2 ring-ai-500' : ''}`}
    >
      <div className="min-w-0">
        <p className={`text-sm font-medium ${done ? 'text-ink-600 line-through dark:text-ink-400' : 'text-ink-900 dark:text-ink-100'}`}>{task.title}</p>
        <p className={`mt-0.5 flex flex-wrap items-center gap-2 text-xs ${muted}`}>
          <Badge tone={done ? 'green' : 'amber'}>{done ? 'Done' : 'Open'}</Badge>
          {task.clinical && <Badge tone="brand">Clinical</Badge>}
          <span>Assigned to {staffNameOf(allStaff, task.assigneeId)}</span>
          {task.due && <span>due {fmtDate(task.due)}</span>}
          {done && <span>completed {fmtDate(task.completedAt)} by {staffNameOf(allStaff, task.completedBy)}</span>}
        </p>
      </div>
      <ApprovalGate allowed={allowed || done} reason={denyReason('completeClinicalTask')}>
        <Button size="sm" variant={done ? 'secondary' : 'primary'} disabled={!allowed && !done} onClick={act}>
          {done ? 'Reopen' : 'Mark complete'}
        </Button>
      </ApprovalGate>
    </div>
  );
}

function TasksTab({ patientId, tasks }: { patientId: string; tasks: Task[] }) {
  const addTask = useStore((s) => s.addTask);
  const allStaff = useStore((s) => s.staff);
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [clinical, setClinical] = useState(false);
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('');
  const [error, setError] = useState('');

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === 'open' ? -1 : 1)),
    [tasks],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Enter a task title.'); return; }
    const r = addTask({
      title: title.trim(), patientId, clinical,
      due: due ? new Date(`${due}T17:00:00`).toISOString() : undefined,
      assigneeId: assignee || undefined,
    });
    if (!r.ok) { toast({ title: 'Could not add task', description: r.error, tone: 'red' }); return; }
    toast({ title: 'Task added', description: title.trim(), tone: 'green' });
    setTitle(''); setClinical(false); setDue(''); setAssignee(''); setError('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Add task" />
        <CardBody>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
            <Field label="Task title" error={error} required className="sm:col-span-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call patient with test results" />
            </Field>
            <Field label="Due date">
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
            <Field label="Assign to">
              <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {allStaff.map((s) => <option key={s.id} value={s.id}>{s.name} ({roleLabel(s.role)})</option>)}
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink-800 dark:text-ink-200">
              <input type="checkbox" checked={clinical} onChange={(e) => setClinical(e.target.checked)} className="h-4 w-4" />
              Clinical task (only a GP or nurse can complete it)
            </label>
            <div className="sm:text-right"><Button type="submit">Add task</Button></div>
          </form>
        </CardBody>
      </Card>
      {sorted.length === 0 ? <Card><EmptyState title="No tasks" description="Add one above." /></Card> : (
        <div className="space-y-3">{sorted.map((t) => <TaskRow key={t.id} task={t} patientId={patientId} />)}</div>
      )}
    </div>
  );
}

function TimelineTab({ patientId }: { patientId: string }) {
  const [activities, allStaff] = useStore(useShallow((s) => [s.activities, s.staff]));
  const items = useMemo<TimelineItem[]>(
    () =>
      activities
        .filter((a) => a.patientId === patientId)
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((a) => ({
          id: a.id,
          at: fmtDateTime(a.at),
          title: a.message,
          actorLabel: actorLabel(a.actor, allStaff),
          tone: a.actor === 'ai' ? 'ai' : a.actor === 'system' || a.actor === 'automation' ? 'sky' : a.actor === 'patient' ? 'amber' : 'brand',
        })),
    [activities, allStaff, patientId],
  );
  if (items.length === 0) return <Card><EmptyState title="No activity yet" /></Card>;
  return <Card><CardBody><Timeline items={items} /></CardBody></Card>;
}
