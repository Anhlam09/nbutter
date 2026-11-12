import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { CalendarClock, ClipboardCheck, FileText, Inbox, Play, Search, Stethoscope } from 'lucide-react';
import { useStore, useCurrentStaff } from '@/store/useStore';
import { computeAnalytics, sortRequests } from '@/store/selectors';
import {
  Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Select, StatCard, Timeline,
} from '@/components/ui';
import { roleLabel, fmtDateTime } from '@/lib/format';
import type { RequestStatus, Urgency } from '@/types';
import { RequestTable } from './triage/RequestTable';
import { activityItems, useScrollToHighlight } from './triage/shared';

const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

export default function Dashboard() {
  const me = useCurrentStaff();
  const [requests, patients, staff, tasks, documents, notes, referrals, appointments, activities] = useStore(
    useShallow((s) => [s.requests, s.patients, s.staff, s.tasks, s.documents, s.notes, s.referrals, s.appointments, s.activities]),
  );
  const highlight = useStore((s) => s.highlight);
  const startDemo = useStore((s) => s.startDemo);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | RequestStatus>('all');
  const [urgency, setUrgency] = useState<'all' | Urgency>('all');
  const [assignee, setAssignee] = useState('all');

  const totals = useMemo(
    () => computeAnalytics({ requests, tasks, documents, notes, referrals, staff, appointments }).totals,
    [requests, tasks, documents, notes, referrals, staff, appointments],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sortRequests(requests).filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (urgency !== 'all' && r.urgency !== urgency) return false;
      if (assignee === 'none' ? !!r.assigneeId : assignee !== 'all' && r.assigneeId !== assignee) return false;
      if (term) {
        const name = patients.find((p) => p.id === r.patientId)?.name.toLowerCase() ?? '';
        if (!name.includes(term) && !r.subject.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [requests, patients, q, status, urgency, assignee]);

  useScrollToHighlight(highlight);

  const recent = useMemo(
    () => activityItems([...activities].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8), staff),
    [activities, staff],
  );

  const upcoming = useMemo(() => {
    const now = new Date().toISOString();
    return appointments
      .filter((a) => a.status === 'booked' && a.start >= now)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 5);
  }, [appointments]);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const filtersActive = q || status !== 'all' || urgency !== 'all' || assignee !== 'all';

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${me.name}`}
        description={`${today} · ${roleLabel(me.role)} view. Here is what needs attention in the practice today.`}
        actions={
          <Button iconLeft={<Play className="h-4 w-4" aria-hidden="true" />} onClick={() => startDemo()}>
            Start Guided Demo
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting triage" value={totals.awaitingTriage} hint="new or in review" icon={<Inbox className="h-5 w-5" />} />
        <StatCard label="Open requests" value={totals.openRequests} hint="not yet completed" icon={<Stethoscope className="h-5 w-5" />} />
        <StatCard label="Documents to review" value={totals.documentsToReview} hint="inbox and in review" icon={<FileText className="h-5 w-5" />} />
        <StatCard
          label="Open tasks"
          value={totals.openTasks}
          delta={totals.overdueTasks ? `${totals.overdueTasks} overdue` : undefined}
          deltaTone="bad"
          hint={totals.overdueTasks ? undefined : 'none overdue'}
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-3">
        <Card className="2xl:col-span-2" aria-labelledby="req-heading">
          <CardHeader
            title={<span id="req-heading">Patient requests</span>}
            description="Most urgent and longest-waiting first. Select a row to open it."
          />
          <div className="grid grid-cols-1 gap-3 border-b border-ink-200 px-5 py-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-ink-800">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-500" aria-hidden="true" />
              <Input
                type="search"
                aria-label="Search by patient name or subject"
                placeholder="Search patient or subject"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="in_review">In review</option>
              <option value="assigned">Assigned</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </Select>
            <Select aria-label="Filter by urgency" value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)}>
              <option value="all">All urgencies</option>
              <option value="emergency">Emergency</option>
              <option value="urgent">Urgent</option>
              <option value="soon">Soon</option>
              <option value="routine">Routine</option>
            </Select>
            <Select aria-label="Filter by assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="all">Everyone</option>
              <option value="none">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          {rows.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="No requests match"
              description="Try clearing the search or filters."
              action={
                filtersActive ? (
                  <Button variant="secondary" onClick={() => { setQ(''); setStatus('all'); setUrgency('all'); setAssignee('all'); }}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <RequestTable rows={rows} patients={patients} staff={staff} highlight={highlight} />
          )}
          <p className="border-t border-ink-200 px-5 py-2.5 text-xs text-ink-600 dark:border-ink-800 dark:text-ink-400" aria-live="polite">
            Showing {rows.length} of {requests.length} requests.
          </p>
        </Card>

        <div className="grid content-start gap-6 md:grid-cols-2 2xl:grid-cols-1">
          <Card>
            <CardHeader
              title="Upcoming appointments"
              actions={<CalendarClock className="h-5 w-5 text-ink-500" aria-hidden="true" />}
            />
            <CardBody>
              {upcoming.length === 0 ? (
                <p className="text-sm text-ink-600 dark:text-ink-400">No upcoming appointments booked.</p>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900 dark:text-ink-100">
                          {patients.find((p) => p.id === a.patientId)?.name ?? 'Patient'}
                        </p>
                        <p className="truncate text-xs text-ink-600 dark:text-ink-400">
                          {a.reason} · {staff.find((s) => s.id === a.staffId)?.name ?? 'Clinician'}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-ink-600 dark:text-ink-400">{fmtDateTime(a.start)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent activity"
              actions={<Link to="/activity" className="text-sm font-medium text-brand-800 hover:underline dark:text-brand-300">View all</Link>}
            />
            <CardBody>
              {recent.length ? <Timeline items={recent} /> : <p className="text-sm text-ink-600 dark:text-ink-400">No activity yet.</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
