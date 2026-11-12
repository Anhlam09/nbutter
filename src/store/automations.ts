/**
 * Tiny rule engine for workflow automations.
 * Rules run on events (triggers). Conditions are checked against the subject of the event.
 * Actions taken by automations do NOT trigger further automations (no loops).
 */
import type {
  Appointment, AutomationAction, AutomationCondition, AutomationRule, AutomationTrigger, ClinicalDocument,
  ConsultationNote, PatientRequest,
} from '@/types';
import type { CoreData, Ctx } from './core';
import { addActivity, nid } from './core';

export interface AutomationSubject {
  patientId: string;
  request?: PatientRequest;
  document?: ClinicalDocument;
  appointment?: Appointment;
  note?: ConsultationNote;
}

export function conditionMatches(c: AutomationCondition, s: AutomationSubject): boolean {
  if (c.field === 'always') return true;
  const actual =
    c.field === 'urgency' ? s.request?.urgency
    : c.field === 'type' ? s.request?.type
    : c.field === 'channel' ? s.request?.channel
    : c.field === 'documentKind' ? s.document?.kind
    : undefined;
  if (actual === undefined) return false;
  const values = c.value.split(',').map((v) => v.trim());
  const hit = values.includes(actual);
  return c.op === 'equals' ? hit : !hit;
}

export function ruleMatches(rule: AutomationRule, trigger: AutomationTrigger, s: AutomationSubject): boolean {
  return rule.enabled && rule.trigger === trigger && rule.conditions.every((c) => conditionMatches(c, s));
}

export function describeAction(a: AutomationAction): string {
  switch (a.type) {
    case 'set_status': return `Set request status to "${a.status}"`;
    case 'assign_role': return `Assign to a ${a.role === 'gp' ? 'GP' : a.role}`;
    case 'create_task': return `Create ${a.clinical ? 'clinical ' : ''}task "${a.title}" (due in ${a.dueInDays} d)`;
    case 'complete_task_matching': return `Complete open tasks containing "${a.titleIncludes}"`;
    case 'notify': return `Notify: ${a.message}`;
  }
}

/** Mutates the draft `d`. Returns names of rules that fired. */
export function runAutomations(d: CoreData, trigger: AutomationTrigger, subject: AutomationSubject, ctx: Ctx): string[] {
  const fired: string[] = [];
  const now = ctx.now.toISOString();
  for (const rule of d.automations) {
    if (!ruleMatches(rule, trigger, subject)) continue;
    fired.push(rule.name);
    rule.runCount += 1;
    rule.lastRunAt = now;
    const results: string[] = [];
    for (const a of rule.actions) {
      const req = subject.request ? d.requests.find((r) => r.id === subject.request!.id) : undefined;
      switch (a.type) {
        case 'set_status':
          if (req) { req.status = a.status; results.push(`status → ${a.status}`); }
          break;
        case 'assign_role': {
          if (!req) break;
          const patient = d.patients.find((p) => p.id === req.patientId);
          const regGp = d.staff.find((s) => s.id === patient?.registeredGpId && s.role === a.role);
          const target = regGp ?? d.staff.find((s) => s.role === a.role);
          if (target) {
            req.assigneeId = target.id;
            if (req.status === 'new' || req.status === 'in_review') req.status = 'assigned';
            req.firstResponseAt ??= now;
            results.push(`assigned to ${target.name}`);
          }
          break;
        }
        case 'create_task': {
          const due = new Date(ctx.now.getTime() + a.dueInDays * 86400000).toISOString();
          d.tasks.unshift({
            id: nid(d, 'k'), patientId: subject.patientId, title: a.title, status: 'open', source: 'automation',
            sourceId: rule.id, clinical: a.clinical, due, createdAt: now,
            assigneeId: a.clinical ? undefined : d.staff.find((s) => s.role === 'receptionist')?.id,
          });
          results.push(`created task "${a.title}"`);
          break;
        }
        case 'complete_task_matching': {
          for (const t of d.tasks) {
            // Automations never complete clinical tasks: those need a clinician.
            if (t.status === 'open' && !t.clinical && a.titleIncludes.trim().length >= 3 && t.patientId === subject.patientId && t.title.toLowerCase().includes(a.titleIncludes.toLowerCase())) {
              t.status = 'done'; t.completedAt = now; t.completedBy = 'automation';
              results.push(`completed task "${t.title}"`);
            }
          }
          break;
        }
        case 'notify':
          results.push(a.message);
          break;
      }
    }
    addActivity(d, ctx, {
      patientId: subject.patientId, entity: { type: 'automation', id: rule.id },
      kind: 'automation.ran', message: `Automation "${rule.name}": ${results.join('; ') || 'no changes'}`,
    }, 'automation');
  }
  return fired;
}
