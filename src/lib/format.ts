import type {
  DocumentKind, RequestChannel, RequestStatus, RequestType, StaffRole, Urgency, ReferralStatus,
} from '@/types';

export const roleLabel = (role: StaffRole): string =>
  ({ gp: 'GP', nurse: 'Nurse', receptionist: 'Receptionist', manager: 'Practice manager' })[role];

export const urgencyLabel = (u: Urgency): string =>
  ({ emergency: 'Emergency', urgent: 'Urgent', soon: 'Soon', routine: 'Routine' })[u];

export const URGENCY_ORDER: Record<Urgency, number> = { emergency: 0, urgent: 1, soon: 2, routine: 3 };

export const statusLabel = (s: RequestStatus): string =>
  ({
    new: 'New', in_review: 'In review', assigned: 'Assigned', scheduled: 'Scheduled',
    completed: 'Completed', closed: 'Closed',
  })[s];

export const channelLabel = (c: RequestChannel): string =>
  ({ online: 'Online form', phone: 'Phone', receptionist_ai: 'AI receptionist', walk_in: 'Walk-in' })[c];

export const requestTypeLabel = (t: RequestType): string =>
  ({ clinical: 'Clinical', admin: 'Admin', medication: 'Medication' })[t];

export const documentKindLabel = (k: DocumentKind): string =>
  ({ discharge_summary: 'Discharge summary', referral_letter: 'Referral letter', lab_report: 'Lab report' })[k];

export const referralStatusLabel = (s: ReferralStatus): string =>
  ({ drafted: 'Drafted', sent: 'Sent', acknowledged: 'Acknowledged', booked: 'Appointment booked', completed: 'Completed' })[s];

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export const fmtDate = (iso?: string) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const fmtDateTime = (iso?: string) => (iso ? dateTimeFmt.format(new Date(iso)) : '—');
export const fmtTime = (iso?: string) => (iso ? timeFmt.format(new Date(iso)) : '—');

/** "5 min ago", "3 h ago", "2 d ago", or "in 2 d" for future dates. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const future = diff < 0;
  const mins = Math.round(Math.abs(diff) / 60000);
  let out: string;
  if (mins < 1) return 'just now';
  if (mins < 60) out = `${mins} min`;
  else if (mins < 60 * 24) out = `${Math.round(mins / 60)} h`;
  else out = `${Math.round(mins / 1440)} d`;
  return future ? `in ${out}` : `${out} ago`;
}

export function ageFromDob(dob: string, now: Date = new Date()): number {
  const d = new Date(dob);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function minutesBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

export function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  if (mins < 60 * 24) return `${(mins / 60).toFixed(1)} h`;
  return `${(mins / 1440).toFixed(1)} d`;
}
