import type { AutomationAction, AutomationCondition, AutomationRule, AutomationTrigger, RequestStatus, StaffRole } from '@/types';
import { channelLabel, documentKindLabel, requestTypeLabel, roleLabel, statusLabel, urgencyLabel } from '@/lib/format';
import { describeAction } from '@/store/automations';

export const TRIGGERS: { value: AutomationTrigger; label: string; phrase: string }[] = [
  { value: 'request.created', label: 'A patient request is received', phrase: 'a patient request is received' },
  { value: 'document.filed', label: 'A document is filed', phrase: 'a document is filed' },
  { value: 'note.approved', label: 'A consultation note is approved', phrase: 'a consultation note is approved' },
  { value: 'appointment.booked', label: 'An appointment is booked', phrase: 'an appointment is booked' },
  { value: 'appointment.completed', label: 'An appointment is completed', phrase: 'an appointment is completed' },
];
export const triggerLabel = (t: AutomationTrigger) => TRIGGERS.find((x) => x.value === t)?.label ?? t;

export const FIELDS: { value: AutomationCondition['field']; label: string }[] = [
  { value: 'always', label: 'Always (no condition)' },
  { value: 'urgency', label: 'Request urgency' },
  { value: 'type', label: 'Request type' },
  { value: 'channel', label: 'Request channel' },
  { value: 'documentKind', label: 'Document kind' },
];

export function valueOptions(field: AutomationCondition['field']): { value: string; label: string }[] {
  switch (field) {
    case 'urgency': return (['emergency', 'urgent', 'soon', 'routine'] as const).map((v) => ({ value: v, label: urgencyLabel(v) }));
    case 'type': return (['clinical', 'admin', 'medication'] as const).map((v) => ({ value: v, label: requestTypeLabel(v) }));
    case 'channel': return (['online', 'phone', 'receptionist_ai', 'walk_in'] as const).map((v) => ({ value: v, label: channelLabel(v) }));
    case 'documentKind': return (['discharge_summary', 'referral_letter', 'lab_report'] as const).map((v) => ({ value: v, label: documentKindLabel(v) }));
    default: return [];
  }
}

export const ACTION_TYPES: { value: AutomationAction['type']; label: string }[] = [
  { value: 'set_status', label: 'Set request status' },
  { value: 'assign_role', label: 'Assign to a role' },
  { value: 'create_task', label: 'Create a task' },
  { value: 'complete_task_matching', label: 'Complete matching tasks' },
  { value: 'notify', label: 'Send a notification' },
];
export const STATUSES: RequestStatus[] = ['new', 'in_review', 'assigned', 'scheduled', 'completed', 'closed'];
export const ROLES: StaffRole[] = ['gp', 'nurse', 'receptionist', 'manager'];
export { statusLabel, roleLabel };

export function defaultAction(type: AutomationAction['type']): AutomationAction {
  switch (type) {
    case 'set_status': return { type, status: 'in_review' };
    case 'assign_role': return { type, role: 'gp' };
    case 'create_task': return { type, title: '', clinical: false, dueInDays: 2 };
    case 'complete_task_matching': return { type, titleIncludes: '' };
    case 'notify': return { type, message: '' };
  }
}

export function describeCondition(c: AutomationCondition): string {
  if (c.field === 'always') return 'Always';
  const field = FIELDS.find((f) => f.value === c.field)?.label.toLowerCase() ?? c.field;
  const opts = valueOptions(c.field);
  const vals = c.value.split(',').map((v) => opts.find((o) => o.value === v.trim())?.label.toLowerCase() ?? v.trim()).join(' or ');
  return `${field} ${c.op === 'equals' ? 'is' : 'is not'} ${vals || '…'}`;
}

/** "When a lab report is filed, if urgency is urgent, create task …" */
export function plainEnglish(r: Pick<AutomationRule, 'trigger' | 'conditions' | 'actions'>): string {
  const when = TRIGGERS.find((t) => t.value === r.trigger)?.phrase ?? r.trigger;
  const conds = r.conditions.filter((c) => c.field !== 'always');
  const ifPart = conds.length ? `, and ${conds.map(describeCondition).join(' and ')}` : '';
  const thenPart = r.actions.length ? r.actions.map((a) => describeAction(a)).map((s) => s.charAt(0).toLowerCase() + s.slice(1)).join(', then ') : 'do nothing yet';
  return `When ${when}${ifPart}, ${thenPart}`.replace(/\.*$/, '.');
}
