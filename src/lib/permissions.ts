import type { Staff } from '@/types';

/**
 * Approval gates — single source of truth.
 * Simulated AI may DRAFT anything, but only humans with the right role can approve
 * changes to the clinical record.
 */
export type Permission =
  | 'approveNote'
  | 'approveCoding'
  | 'approveDocumentActions'
  | 'completeClinicalTask'
  | 'manageAutomations'
  | 'editNote'
  | 'createReferral'
  | 'lowerUrgency'
  | 'closeUrgentRequest';

const RULES: Record<Permission, { roles: Staff['role'][]; reason: string }> = {
  approveNote: { roles: ['gp'], reason: 'Requires GP approval' },
  approveCoding: { roles: ['gp'], reason: 'Clinical coding requires GP approval' },
  approveDocumentActions: { roles: ['gp', 'nurse'], reason: 'Requires a clinician (GP or nurse)' },
  completeClinicalTask: { roles: ['gp', 'nurse'], reason: 'Clinical tasks must be completed by a clinician' },
  manageAutomations: { roles: ['manager', 'gp'], reason: 'Requires practice manager or GP' },
  editNote: { roles: ['gp', 'nurse'], reason: 'Only clinicians can edit consultation notes' },
  createReferral: { roles: ['gp', 'nurse'], reason: 'Referrals must be made by a clinician' },
  lowerUrgency: { roles: ['gp', 'nurse'], reason: 'Only a clinician can lower urgency (anyone can raise it)' },
  closeUrgentRequest: { roles: ['gp', 'nurse'], reason: 'Urgent and emergency requests must be closed by a clinician' },
};

export function can(staff: Staff | undefined, permission: Permission): boolean {
  return !!staff && RULES[permission].roles.includes(staff.role);
}

/** Human-readable reason shown next to a locked button. */
export function denyReason(permission: Permission): string {
  return `${RULES[permission].reason} — switch role in the top bar.`;
}
