/**
 * Derived data. All functions are pure: (data) => result.
 * In components, select the raw slices you need, then compute with useMemo, e.g.
 *   const [requests, tasks] = useStore(useShallow(s => [s.requests, s.tasks]));
 *   const m = useMemo(() => computeAnalytics({ requests, tasks, ... }), [requests, tasks]);
 * For selectors that return new objects directly inside useStore, wrap them in useShallow.
 */
import type { CoreData } from './core';
import type { PatientRequest, Urgency, RequestStatus, RequestChannel } from '@/types';
import { URGENCY_ORDER, minutesBetween } from '@/lib/format';

const OPEN_STATUSES: RequestStatus[] = ['new', 'in_review', 'assigned', 'scheduled'];
export const isOpenRequest = (r: PatientRequest) => OPEN_STATUSES.includes(r.status);

export function selectNavCounts(s: Pick<CoreData, 'requests' | 'documents' | 'referrals'>) {
  return {
    triage: s.requests.filter((r) => r.status === 'new' || r.status === 'in_review').length,
    documents: s.documents.filter((d) => d.status === 'inbox' || d.status === 'review').length,
    referrals: s.referrals.filter((f) => f.status !== 'completed').length,
  };
}

/** Sort: open work first; then most urgent; then longest waiting (finished items: most recent first). */
export function sortRequests(list: PatientRequest[]): PatientRequest[] {
  return [...list].sort((a, b) => {
    const openA = isOpenRequest(a), openB = isOpenRequest(b);
    if (openA !== openB) return openA ? -1 : 1;
    if (!openA) return (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt);
    return URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || a.createdAt.localeCompare(b.createdAt);
  });
}

export function patientView(
  s: Pick<CoreData, 'patients' | 'requests' | 'appointments' | 'documents' | 'notes' | 'tasks' | 'referrals' | 'activities'>,
  patientId: string,
) {
  const by = <T extends { patientId?: string }>(list: T[]) => list.filter((x) => x.patientId === patientId);
  return {
    patient: s.patients.find((p) => p.id === patientId),
    requests: by(s.requests),
    appointments: by(s.appointments).sort((a, b) => b.start.localeCompare(a.start)),
    documents: by(s.documents),
    notes: by(s.notes),
    tasks: by(s.tasks),
    referrals: by(s.referrals),
    activities: by(s.activities),
  };
}

export function isOverdue(due: string | undefined, now: Date = new Date()): boolean {
  return !!due && new Date(due).getTime() < now.getTime();
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export type AnalyticsInput = Pick<CoreData, 'requests' | 'tasks' | 'documents' | 'notes' | 'referrals' | 'staff' | 'appointments'>;

export function computeAnalytics(s: AnalyticsInput, now: Date = new Date(), days = 14) {
  // Requests per day (oldest → newest)
  const perDay: { date: string; label: string; requests: number; completed: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const sameDay = (iso?: string) => {
      if (!iso) return false;
      const x = new Date(iso);
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
    };
    perDay.push({
      date: key,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      requests: s.requests.filter((r) => sameDay(r.createdAt)).length,
      completed: s.requests.filter((r) => sameDay(r.completedAt)).length,
    });
  }

  const responseTimes = s.requests.filter((r) => r.firstResponseAt).map((r) => minutesBetween(r.createdAt, r.firstResponseAt!));
  const resolutionTimes = s.requests.filter((r) => r.completedAt).map((r) => minutesBetween(r.createdAt, r.completedAt!));

  const byUrgency = (['emergency', 'urgent', 'soon', 'routine'] as Urgency[]).map((u) => ({
    urgency: u, count: s.requests.filter((r) => r.urgency === u).length,
  }));
  const byStatus = (['new', 'in_review', 'assigned', 'scheduled', 'completed', 'closed'] as RequestStatus[]).map((st) => ({
    status: st, count: s.requests.filter((r) => r.status === st).length,
  }));
  const byChannel = (['online', 'phone', 'receptionist_ai', 'walk_in'] as RequestChannel[]).map((c) => ({
    channel: c, count: s.requests.filter((r) => r.channel === c).length,
  }));

  const workload = s.staff.map((st) => ({
    staffId: st.id,
    name: st.name,
    openRequests: s.requests.filter((r) => r.assigneeId === st.id && isOpenRequest(r)).length,
    openTasks: s.tasks.filter((t) => t.assigneeId === st.id && t.status === 'open').length,
  }));

  const aiNotes = s.notes.filter((n) => n.ai && n.status === 'approved');
  const openTasks = s.tasks.filter((t) => t.status === 'open');

  return {
    perDay,
    totals: {
      requests: s.requests.length,
      openRequests: s.requests.filter(isOpenRequest).length,
      awaitingTriage: s.requests.filter((r) => r.status === 'new' || r.status === 'in_review').length,
      completedRequests: s.requests.filter((r) => r.status === 'completed' || r.status === 'closed').length,
      openTasks: openTasks.length,
      overdueTasks: openTasks.filter((t) => isOverdue(t.due, now)).length,
      doneTasks: s.tasks.filter((t) => t.status === 'done').length,
      documentsToReview: s.documents.filter((d) => d.status === 'inbox' || d.status === 'review').length,
      documentsFiled: s.documents.filter((d) => d.status === 'filed').length,
      notesApproved: s.notes.filter((n) => n.status === 'approved').length,
      aiNotesApproved: aiNotes.length,
      aiNotesEdited: aiNotes.filter((n) => n.edited).length,
      upcomingAppointments: s.appointments.filter((a) => a.status === 'booked' && a.start > now.toISOString()).length,
      referralsOpen: s.referrals.filter((f) => f.status !== 'completed').length,
      referralsOverdue: s.referrals.filter((f) => f.status !== 'completed' && isOverdue(f.expectedBy, now)).length,
    },
    medianFirstResponseMins: median(responseTimes),
    medianResolutionMins: median(resolutionTimes),
    byUrgency, byStatus, byChannel, workload,
  };
}

export type Analytics = ReturnType<typeof computeAnalytics>;
