import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { CalendarPlus, CheckCircle2, CircleAlert, ChevronLeft, FileQuestion, Sparkles, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import {
  AiPanel, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, Modal, PageHeader,
  RequestStatusBadge, Select, Timeline, UrgencyBadge, useToast,
} from '@/components/ui';
import {
  ageFromDob, channelLabel, fmtDateTime, relativeTime, requestTypeLabel, roleLabel, statusLabel, urgencyLabel,
} from '@/lib/format';
import type { RequestStatus, Urgency } from '@/types';
import { activityItems, useScrollToHighlight } from './triage/shared';
import { SecurityFlagsNotice } from '@/components/security/SecurityFlagsNotice';

const URGENCIES: Urgency[] = ['emergency', 'urgent', 'soon', 'routine'];
const STATUSES: RequestStatus[] = ['new', 'in_review', 'assigned', 'scheduled', 'completed', 'closed'];

function nextWeekday9(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00`;
}

const Dl = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-ink-600 dark:text-ink-400">{label}</dt>
    <dd className="mt-0.5 text-sm text-ink-900 dark:text-ink-100">{children}</dd>
  </div>
);

export default function TriageDetail() {
  const { id = '' } = useParams();
  const { toast } = useToast();
  const [requests, patients, staff, appointments, activities] = useStore(
    useShallow((s) => [s.requests, s.patients, s.staff, s.appointments, s.activities]),
  );
  const highlight = useStore((s) => s.highlight);
  const actions = useStore(
    useShallow((s) => ({
      openRequest: s.openRequest, summarizeRequest: s.summarizeRequest, assignRequest: s.assignRequest,
      setRequestStatus: s.setRequestStatus, setRequestUrgency: s.setRequestUrgency, bookAppointment: s.bookAppointment,
      completeAppointment: s.completeAppointment, cancelAppointment: s.cancelAppointment,
    })),
  );

  const req = requests.find((r) => r.id === id);
  const patient = patients.find((p) => p.id === req?.patientId);
  const appt = req?.appointmentId ? appointments.find((a) => a.id === req.appointmentId) : undefined;

  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (req && req.status === 'new' && opened.current !== req.id) {
      opened.current = req.id;
      actions.openRequest(req.id);
    }
  }, [req, actions]);

  useScrollToHighlight(highlight, !!req);

  const [bookOpen, setBookOpen] = useState(false);
  const [clinician, setClinician] = useState('');
  const [when, setWhen] = useState('');
  const [mins, setMins] = useState('15');
  const [mode, setMode] = useState<'in_person' | 'phone' | 'video'>('phone');
  const [reason, setReason] = useState('');
  const [bookErr, setBookErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  const entries = useMemo(
    () => activityItems(activities.filter((a) => a.entity?.id === id || (a.entity?.type === 'appointment' && a.entity.id === req?.appointmentId)).sort((a, b) => b.at.localeCompare(a.at)), staff),
    [activities, staff, id, req?.appointmentId],
  );

  if (!req) {
    return (
      <>
      <h1 className="sr-only">Request not found</h1>
      <Card>
        <EmptyState
          icon={<FileQuestion className="h-6 w-6" />}
          title="Request not found"
          description="This request does not exist. It may have been removed when the demo data was reset."
          action={<Link to="/triage" className="text-sm font-medium text-brand-800 underline dark:text-brand-300">Back to triage queue</Link>}
        />
      </Card>
      </>
    );
  }

  const report = (res: { ok: boolean; error?: string }, ok: string) =>
    res.ok
      ? toast({ title: ok, tone: 'green' })
      : toast({ title: 'Something went wrong', description: (res as { error: string }).error, tone: 'red' });

  const openBooking = () => {
    const gp = staff.find((s) => s.id === patient?.registeredGpId) ?? staff.find((s) => s.role === 'gp') ?? staff[0];
    setClinician(req.assigneeId ?? gp?.id ?? '');
    setWhen(nextWeekday9());
    setMins('15');
    setMode(req.preferredContact === 'phone' ? 'phone' : 'in_person');
    setReason(req.subject);
    setBookErr(undefined);
    setBookOpen(true);
  };

  const submitBooking = () => {
    if (!clinician) return setBookErr('Choose a clinician.');
    if (!when || Number.isNaN(new Date(when).getTime())) return setBookErr('Choose a date and time.');
    if (!reason.trim()) return setBookErr('Enter a reason.');
    const res = actions.bookAppointment({
      patientId: req.patientId, staffId: clinician, requestId: req.id, start: new Date(when).toISOString(),
      durationMins: Number(mins), mode, reason: reason.trim(),
    });
    if (res.ok) {
      setBookOpen(false);
      toast({ title: 'Appointment booked', tone: 'green' });
    } else toast({ title: 'Could not book appointment', description: res.error, tone: 'red' });
  };

  const ai = req.aiSummary;
  const generate = () => {
    setBusy(true);
    window.setTimeout(() => {
      report(actions.summarizeRequest(req.id), 'Summary generated');
      setBusy(false);
    }, 500);
  };
  const assignee = staff.find((s) => s.id === req.assigneeId);
  const isHighlighted = highlight === req.id;

  return (
    <div data-entity-id={req.id}>
      <Link to="/triage" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-brand-800 hover:underline dark:text-brand-300">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Triage queue
      </Link>
      <PageHeader
        title={req.subject}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <UrgencyBadge urgency={req.urgency} />
            <RequestStatusBadge status={req.status} />
            <span>{patient?.name ?? 'Unknown patient'} · received {relativeTime(req.createdAt)}</span>
          </span>
        }
      />

      <div className={clsx('grid grid-cols-1 gap-6 lg:grid-cols-2', isHighlighted && 'rounded-2xl ring-2 ring-brand-400 ring-offset-8 ring-offset-transparent')}>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Request details" />
            <CardBody className="space-y-4">
              <SecurityFlagsNotice flags={req.securityFlags} />
              <p className="whitespace-pre-wrap text-sm text-ink-900 dark:text-ink-100">{req.description}</p>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-600 dark:text-ink-400">Symptoms</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {req.symptoms.length ? req.symptoms.map((s) => <Badge key={s} tone="neutral">{s}</Badge>) : <span className="text-sm text-ink-600 dark:text-ink-400">None listed</span>}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <Dl label="Type">{requestTypeLabel(req.type)}</Dl>
                <Dl label="Channel">{channelLabel(req.channel)}</Dl>
                <Dl label="Duration">{req.duration}</Dl>
                <Dl label="Severity (patient)">{req.severity} out of 10</Dl>
                <Dl label="Preferred contact">{req.preferredContact === 'sms' ? 'Text message' : req.preferredContact === 'phone' ? 'Phone call' : 'Email'}</Dl>
                <Dl label="Availability">{req.availability}</Dl>
                <Dl label="Received">{fmtDateTime(req.createdAt)}</Dl>
                <Dl label="Assigned to">{assignee ? assignee.name : 'Unassigned'}</Dl>
              </dl>
            </CardBody>
          </Card>

          {patient && (
            <Card>
              <CardHeader
                title="Patient snapshot"
                actions={<Link to={`/patients/${patient.id}`} className="text-sm font-medium text-brand-800 hover:underline dark:text-brand-300">Open record</Link>}
              />
              <CardBody className="space-y-4">
                <p className="text-sm text-ink-900 dark:text-ink-100">
                  <span className="font-semibold">{patient.name}</span> · {ageFromDob(patient.dob)} years · {patient.sex} · NHS {patient.nhsNumber}
                </p>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Dl label="Conditions">
                    {patient.conditions.filter((c) => c.status === 'active').map((c) => c.label).join(', ') || 'None recorded'}
                  </Dl>
                  <Dl label="Medications">
                    {patient.medications.map((m) => `${m.name} ${m.dose}`).join(', ') || 'None recorded'}
                  </Dl>
                  <Dl label="Allergies">{patient.allergies.join(', ') || 'None recorded'}</Dl>
                  <Dl label="Flags">
                    {patient.flags.length ? (
                      <span className="flex flex-wrap gap-1.5">{patient.flags.map((f) => <Badge key={f} tone="amber">{f}</Badge>)}</span>
                    ) : 'None'}
                  </Dl>
                </dl>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Activity on this request" />
            <CardBody>
              {entries.length ? <Timeline items={entries} /> : <p className="text-sm text-ink-600 dark:text-ink-400">No activity recorded yet.</p>}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {!ai ? (
            <Card>
              <CardHeader title="AI summary" description="A simulated assistant can summarise this request and suggest an urgency. A human reviews it before anything changes." />
              <CardBody>
                <Button variant="ai" loading={busy} iconLeft={<Sparkles className="h-4 w-4" aria-hidden="true" />} onClick={generate}>
                  Generate summary
                </Button>
              </CardBody>
            </Card>
          ) : (
            <AiPanel confidence={ai.confidence} generatedAt={ai.generatedAt} title="Simulated AI summary">
              <p>{ai.summary}</p>
              {ai.keyPoints.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5">
                  {ai.keyPoints.map((k) => <li key={k}>{k}</li>)}
                </ul>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ai-900 dark:text-ai-300">Suggested urgency</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <UrgencyBadge urgency={ai.suggestedUrgency} />
                    {ai.suggestedUrgency !== req.urgency ? (
                      <Button size="sm" variant="secondary" onClick={() => report(actions.setRequestUrgency(req.id, ai.suggestedUrgency), `Urgency set to ${urgencyLabel(ai.suggestedUrgency)}`)}>
                        Apply suggested urgency
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-700 dark:text-ink-300">Matches current urgency</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ai-900 dark:text-ai-300">Suggested route</p>
                  <p className="mt-1">{ai.suggestedRoute} <span className="text-ink-600 dark:text-ink-400">({roleLabel(ai.suggestedRole)})</span></p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ai-900 dark:text-ai-300">Red-flag checklist</p>
                <ul className="mt-1 space-y-1">
                  {ai.redFlagsChecked.map((f) => (
                    <li key={f.flag} className="flex items-center gap-2">
                      {f.present ? (
                        <CircleAlert className="h-4 w-4 shrink-0 text-red-700 dark:text-red-400" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700 dark:text-green-400" aria-hidden="true" />
                      )}
                      <span className={f.present ? 'font-medium text-red-800 dark:text-red-300' : undefined}>
                        {f.flag}: {f.present ? 'present' : 'not found'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-ai-200 pt-3 dark:border-ai-900">
                <p className="text-xs text-ink-700 dark:text-ink-300">Suggestion only. A staff member decides what happens next.</p>
                <Button size="sm" variant="ai" loading={busy} iconLeft={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />} onClick={generate}>
                  Regenerate
                </Button>
              </div>
            </AiPanel>
          )}

          <Card>
            <CardHeader title="Actions" />
            <CardBody className="space-y-4">
              <Field label="Assign to">
                <Select
                  value={req.assigneeId ?? ''}
                  onChange={(e) => e.target.value && report(actions.assignRequest(req.id, e.target.value), 'Request assigned')}
                >
                  <option value="" disabled>Choose a staff member</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({roleLabel(s.role)})</option>)}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Urgency">
                  <Select value={req.urgency} onChange={(e) => report(actions.setRequestUrgency(req.id, e.target.value as Urgency), 'Urgency updated')}>
                    {URGENCIES.map((u) => <option key={u} value={u}>{urgencyLabel(u)}</option>)}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={req.status} onChange={(e) => report(actions.setRequestStatus(req.id, e.target.value as RequestStatus), 'Status updated')}>
                    {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </Select>
                </Field>
              </div>

              <div className="border-t border-ink-200 pt-4 dark:border-ink-800">
                <h3 className="mb-2 text-sm font-semibold text-ink-900 dark:text-ink-50">Appointment</h3>
                {appt ? (
                  <div className="space-y-3 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/50">
                    <p>
                      <span className="font-medium">{fmtDateTime(appt.start)}</span> with {staff.find((s) => s.id === appt.staffId)?.name ?? 'clinician'}
                      {' · '}{appt.durationMins} min · {appt.mode.replace('_', ' ')}
                    </p>
                    <p className="text-ink-600 dark:text-ink-400">{appt.reason}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={appt.status === 'booked' ? 'amber' : appt.status === 'completed' ? 'green' : 'neutral'}>
                        {appt.status === 'booked' ? 'Booked' : appt.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </Badge>
                      {appt.status === 'booked' && (
                        <>
                          <Button size="sm" onClick={() => report(actions.completeAppointment(appt.id), 'Appointment completed')}>Mark completed</Button>
                          <Button size="sm" variant="secondary" onClick={() => report(actions.cancelAppointment(appt.id), 'Appointment cancelled')}>Cancel</Button>
                        </>
                      )}
                      {appt.status === 'cancelled' && (
                        <Button size="sm" variant="secondary" onClick={openBooking}>Book again</Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button variant="secondary" iconLeft={<CalendarPlus className="h-4 w-4" aria-hidden="true" />} onClick={openBooking}>
                    Book appointment
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Book appointment"
        description={`For ${patient?.name ?? 'patient'}. Booking marks the request as scheduled.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBookOpen(false)}>Cancel</Button>
            <Button onClick={submitBooking}>Book appointment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Clinician" required>
            <Select value={clinician} onChange={(e) => setClinician(e.target.value)}>
              <option value="" disabled>Choose a clinician</option>
              {staff.filter((s) => s.role === 'gp' || s.role === 'nurse').map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({roleLabel(s.role)})</option>
              ))}
            </Select>
          </Field>
          <Field label="Date and time" required>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration">
              <Select value={mins} onChange={(e) => setMins(e.target.value)}>
                {['10', '15', '20', '30', '45'].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </Select>
            </Field>
            <Field label="Mode">
              <Select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                <option value="in_person">In person</option>
                <option value="phone">Phone</option>
                <option value="video">Video</option>
              </Select>
            </Field>
          </div>
          <Field label="Reason" required>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {bookErr && (
            <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" aria-hidden="true" /> {bookErr}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
