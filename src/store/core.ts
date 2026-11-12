/**
 * Pure state transitions for the prototype.
 * Each function takes the current data and returns NEW data (it never mutates its input).
 * The Zustand store (useStore.ts) is a thin wrapper around these, which keeps them easy to unit test.
 */
import type {
  ActorId, Activity, Appointment, AutomationRule, CallSession, ClinicalDocument, ConsultationNote, PatientRequest,
  Referral, ReferralStatus, RequestStatus, Soap, Suggestion, Task, Urgency, Decision,
} from '@/types';
import { createSeed, type SeedData } from '@/data/fixtures';
import { assessUrgency, extractDocument, generateSoap, soapMeta, summarizeRequest } from '@/ai/simulated';
import { can, denyReason, type Permission } from '@/lib/permissions';
import { URGENCY_ORDER } from '@/lib/format';
import { runAutomations } from './automations';
import {
  LIMITS, cleanShort, detectRealPii, inspectUntrusted, mergeFlags, piiMessage, redactPii, type SecurityFlag,
} from '@/security/guards';
import { URGENCY_ORDER as U_ORDER } from '@/lib/format';

export interface CoreData extends SeedData {
  calls: CallSession[];
  seq: number;
}

export interface Ctx {
  now: Date;
  actor: ActorId; // staff id or 'patient' / 'automation' / 'system' / 'ai'
}

export class PermissionError extends Error {}
/** Blocked for safety reasons (e.g. real-looking personal data, limits exceeded). */
export class SafetyError extends Error {}
export class NotFoundError extends Error {}

export function createInitialData(now: Date = new Date()): CoreData {
  return { ...createSeed(now), calls: [], seq: 1000 };
}

// ---------- helpers ----------
export function nid(d: CoreData, prefix: string): string {
  d.seq += 1;
  return `${prefix}-${d.seq}`;
}

export function addActivity(d: CoreData, ctx: Ctx, a: Omit<Activity, 'id' | 'at' | 'actor'>, actor: ActorId = ctx.actor) {
  // Audit messages never store secrets, and the log is size-capped (oldest entries dropped).
  const message = cleanShort(a.message, LIMITS.activityMessage);
  d.activities.unshift({ id: nid(d, 'act'), at: ctx.now.toISOString(), actor, ...a, message });
  if (d.activities.length > LIMITS.activitiesKept) d.activities.length = LIMITS.activitiesKept;
}

/** Records a security event (blocked action, flagged input, error) in the audit log. */
export function recordSecurityEvent(
  state: CoreData, kind: 'security.blocked' | 'security.flagged' | 'security.error', message: string, ctx: Ctx,
  patientId?: string,
): CoreData {
  const d = draft(state);
  addActivity(d, ctx, { kind, message, patientId }, ctx.actor);
  return d;
}

function flagSummary(flags: SecurityFlag[]): string {
  return flags.map((f) => f.detail).join('; ');
}

/** Refuse real-looking personal data in anything a person types (they can remove it and try again). */
function assertNoRealPii(...texts: (string | undefined)[]) {
  const hits = detectRealPii(texts.filter(Boolean).join(' '));
  if (hits.length) throw new SafetyError(piiMessage(hits));
}

/** Only known values are accepted for enumerated fields. */
function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) throw new SafetyError(`Invalid ${field}`);
  return value as T;
}

function validDate(value: unknown, field: string): string {
  const t = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(t) || value === '' || String(value).length > 40) throw new SafetyError(`Invalid ${field}`);
  return new Date(t).toISOString();
}

const REQUEST_STATUSES = ['new', 'in_review', 'assigned', 'scheduled', 'completed', 'closed'] as const;
const URGENCIES = ['emergency', 'urgent', 'soon', 'routine'] as const;
const CHANNELS = ['online', 'phone', 'receptionist_ai', 'walk_in'] as const;
const REQUEST_TYPES = ['clinical', 'admin', 'medication'] as const;
const CONTACTS = ['phone', 'sms', 'email'] as const;
const MODES = ['in_person', 'phone', 'video'] as const;
const REFERRAL_STATUSES = ['drafted', 'sent', 'acknowledged', 'booked', 'completed'] as const;
const PRIORITIES = ['routine', 'urgent', 'two_week_wait'] as const;
const ROLES = ['gp', 'nurse', 'receptionist', 'manager'] as const;

function draft(state: CoreData): CoreData {
  return structuredClone(state);
}

function find<T extends { id: string }>(list: T[], id: string, what: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new NotFoundError(`${what} ${id} not found`);
  return item;
}

function require(d: CoreData, ctx: Ctx, permission: Permission) {
  if (ctx.actor === 'automation' || ctx.actor === 'system') return;
  const staff = d.staff.find((s) => s.id === ctx.actor);
  if (!can(staff, permission)) throw new PermissionError(denyReason(permission));
}

const staffName = (d: CoreData, id?: string) => d.staff.find((s) => s.id === id)?.name ?? 'Unassigned';
const patientName = (d: CoreData, id: string) => d.patients.find((p) => p.id === id)?.name ?? 'Unknown patient';

// ---------- Requests ----------
export type RequestInput = Pick<
  PatientRequest,
  'patientId' | 'channel' | 'type' | 'subject' | 'description' | 'symptoms' | 'duration' | 'severity' | 'preferredContact' | 'availability'
> & {
  /** Optional urgency from an earlier screening step (e.g. receptionist red-flag questions).
   *  The stored urgency is the MORE urgent of this and the rule-based assessment — never downgraded. */
  urgency?: Urgency;
};

/** Cleans every free-text field of a request. Throws SafetyError on real-looking personal data. */
export function sanitizeRequestInput(input: RequestInput): { input: RequestInput; flags: SecurityFlag[] } {
  const subject = inspectUntrusted(input.subject, LIMITS.subject);
  const description = inspectUntrusted(input.description, LIMITS.description);
  const availability = inspectUntrusted(input.availability, LIMITS.shortField);
  const duration = inspectUntrusted(input.duration, LIMITS.shortField);
  const symptoms = input.symptoms.slice(0, LIMITS.symptomsCount).map((s) => inspectUntrusted(s, LIMITS.symptom));
  // Check the FULL original text (before shortening) and across fields, so data can't hide past a cap or split over fields.
  assertNoRealPii(input.subject, input.description, input.availability, input.duration, ...input.symptoms);
  const severity = Math.min(10, Math.max(1, Math.round(Number(input.severity) || 1)));
  const flags = mergeFlags(subject.flags, description.flags, availability.flags, duration.flags, ...symptoms.map((s) => s.flags));
  if (input.symptoms.length > LIMITS.symptomsCount) flags.push({ kind: 'truncated', detail: `Only the first ${LIMITS.symptomsCount} symptoms kept` });
  return {
    input: {
      ...input, subject: subject.text, description: description.text, availability: availability.text,
      duration: duration.text, symptoms: symptoms.map((s) => s.text).filter(Boolean), severity,
      channel: oneOf(input.channel, CHANNELS, 'channel'),
      type: oneOf(input.type, REQUEST_TYPES, 'request type'),
      preferredContact: oneOf(input.preferredContact, CONTACTS, 'contact preference'),
      ...(input.urgency !== undefined ? { urgency: oneOf(input.urgency, URGENCIES, 'urgency') } : {}),
    },
    flags,
  };
}

export function createRequest(state: CoreData, rawInput: RequestInput, ctx: Ctx): [CoreData, string] {
  const { input, flags } = sanitizeRequestInput(rawInput);
  const d = draft(state);
  find(d.patients, input.patientId, 'Patient');
  const assessed = assessUrgency(input).urgency;
  const urgency = input.urgency && URGENCY_ORDER[input.urgency] < URGENCY_ORDER[assessed] ? input.urgency : assessed;
  const req: PatientRequest = {
    ...input, id: nid(d, 'r'), createdAt: ctx.now.toISOString(), urgency, status: 'new',
    ...(flags.length ? { securityFlags: flags } : {}),
  };
  d.requests.unshift(req);
  addActivity(d, ctx, {
    patientId: req.patientId, entity: { type: 'request', id: req.id }, kind: 'request.created',
    message: `${patientName(d, req.patientId)} submitted "${req.subject}" (${input.channel.replace('_', ' ')})`,
  });
  if (flags.length) {
    addActivity(d, ctx, {
      patientId: req.patientId, entity: { type: 'request', id: req.id }, kind: 'security.flagged',
      message: `Untrusted input on request "${req.subject}" treated as data only: ${flagSummary(flags)}`,
    }, 'system');
  }
  runAutomations(d, 'request.created', { patientId: req.patientId, request: req }, ctx);
  return [d, req.id];
}

export function openRequest(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const r = find(d.requests, id, 'Request');
  if (r.status !== 'new') return state;
  r.status = 'in_review';
  r.firstResponseAt ??= ctx.now.toISOString();
  addActivity(d, ctx, { patientId: r.patientId, entity: { type: 'request', id }, kind: 'request.opened', message: `Request "${r.subject}" opened for review by ${staffName(d, String(ctx.actor))}` });
  return d;
}

export function summarizeRequestAction(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const r = find(d.requests, id, 'Request');
  r.aiSummary = summarizeRequest(r, find(d.patients, r.patientId, 'Patient'), ctx.now);
  addActivity(d, ctx, { patientId: r.patientId, entity: { type: 'request', id }, kind: 'ai.summary', message: `Simulated AI drafted a triage summary (suggests ${r.aiSummary.suggestedUrgency})` }, 'ai');
  return d;
}

export function assignRequest(state: CoreData, id: string, staffId: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const r = find(d.requests, id, 'Request');
  find(d.staff, staffId, 'Staff');
  r.assigneeId = staffId;
  if (r.status === 'new' || r.status === 'in_review') r.status = 'assigned';
  r.firstResponseAt ??= ctx.now.toISOString();
  addActivity(d, ctx, { patientId: r.patientId, entity: { type: 'request', id }, kind: 'request.assigned', message: `Request "${r.subject}" assigned to ${staffName(d, staffId)}` });
  return d;
}

export function setRequestStatus(state: CoreData, id: string, status: RequestStatus, ctx: Ctx): CoreData {
  const d = draft(state);
  const r = find(d.requests, id, 'Request');
  status = oneOf(status, REQUEST_STATUSES, 'status');
  if (r.status === status) return state;
  if ((status === 'completed' || status === 'closed') && (r.urgency === 'emergency' || r.urgency === 'urgent')) {
    require(d, ctx, 'closeUrgentRequest');
  }
  r.status = status;
  if (status !== 'new') r.firstResponseAt ??= ctx.now.toISOString();
  if (status === 'completed' || status === 'closed') r.completedAt = ctx.now.toISOString();
  else r.completedAt = undefined;
  addActivity(d, ctx, { patientId: r.patientId, entity: { type: 'request', id }, kind: 'request.status', message: `Request "${r.subject}" marked ${status.replace('_', ' ')}` });
  return d;
}

export function setRequestUrgency(state: CoreData, id: string, urgency: Urgency, ctx: Ctx): CoreData {
  const d = draft(state);
  const r = find(d.requests, id, 'Request');
  urgency = oneOf(urgency, URGENCIES, 'urgency');
  if (r.urgency === urgency) return state;
  // Safety-first: anyone may RAISE urgency, only a clinician may lower it.
  if (U_ORDER[urgency] > U_ORDER[r.urgency]) require(d, ctx, 'lowerUrgency');
  const prev = r.urgency;
  r.urgency = urgency;
  addActivity(d, ctx, { patientId: r.patientId, entity: { type: 'request', id }, kind: 'request.urgency', message: `Urgency changed from ${prev} to ${urgency}` });
  return d;
}

// ---------- Appointments ----------
export type AppointmentInput = Omit<Appointment, 'id' | 'status'>;

export function bookAppointment(state: CoreData, raw: AppointmentInput, ctx: Ctx): [CoreData, string] {
  assertNoRealPii(raw.reason);
  const input: AppointmentInput = {
    ...raw,
    start: validDate(raw.start, 'appointment time'),
    mode: oneOf(raw.mode, MODES, 'appointment type'),
    durationMins: Math.min(240, Math.max(5, Math.round(Number(raw.durationMins) || 15))),
    reason: cleanShort(raw.reason, LIMITS.taskTitle) || 'Appointment',
  };
  const d = draft(state);
  find(d.patients, input.patientId, 'Patient');
  find(d.staff, input.staffId, 'Staff');
  if (input.requestId) {
    const r = find(d.requests, input.requestId, 'Request');
    if (r.status === 'completed' || r.status === 'closed') throw new Error('This request is already finished. Reopen it before booking.');
    const prev = r.appointmentId ? d.appointments.find((a) => a.id === r.appointmentId) : undefined;
    if (prev?.status === 'booked') throw new Error('This request already has a booked appointment. Cancel it first.');
  }
  const appt: Appointment = { ...input, id: nid(d, 'a'), status: 'booked' };
  d.appointments.push(appt);
  if (input.requestId) {
    const r = find(d.requests, input.requestId, 'Request');
    r.appointmentId = appt.id;
    r.status = 'scheduled';
    r.assigneeId ??= input.staffId;
    r.firstResponseAt ??= ctx.now.toISOString();
  }
  addActivity(d, ctx, {
    patientId: appt.patientId, entity: { type: 'appointment', id: appt.id }, kind: 'appointment.booked',
    message: `Appointment booked with ${staffName(d, appt.staffId)} for ${new Date(appt.start).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`,
  });
  runAutomations(d, 'appointment.booked', { patientId: appt.patientId, appointment: appt }, ctx);
  return [d, appt.id];
}

export function completeAppointment(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const a = find(d.appointments, id, 'Appointment');
  if (a.status === 'completed') return state;
  if (a.status === 'cancelled') throw new Error('A cancelled appointment cannot be completed');
  a.status = 'completed';
  addActivity(d, ctx, { patientId: a.patientId, entity: { type: 'appointment', id }, kind: 'appointment.completed', message: `Appointment completed: ${a.reason}` });
  if (a.requestId) {
    const r = d.requests.find((x) => x.id === a.requestId);
    if (r && r.status !== 'completed' && r.status !== 'closed') {
      r.status = 'completed';
      r.completedAt = ctx.now.toISOString();
      addActivity(d, ctx, { patientId: r.patientId, entity: { type: 'request', id: r.id }, kind: 'request.completed', message: `Request "${r.subject}" completed` });
    }
  }
  runAutomations(d, 'appointment.completed', { patientId: a.patientId, appointment: a }, ctx);
  return d;
}

export function cancelAppointment(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const a = find(d.appointments, id, 'Appointment');
  if (a.status !== 'booked') throw new Error(`A ${a.status} appointment cannot be cancelled`);
  a.status = 'cancelled';
  if (a.requestId) {
    const r = d.requests.find((x) => x.id === a.requestId);
    if (r && r.status === 'scheduled') { r.status = 'assigned'; r.appointmentId = undefined; }
  }
  addActivity(d, ctx, { patientId: a.patientId, entity: { type: 'appointment', id }, kind: 'appointment.cancelled', message: `Appointment cancelled: ${a.reason}` });
  return d;
}

// ---------- Documents ----------
export function receiveDocument(state: CoreData, raw: ClinicalDocument, ctx: Ctx): CoreData {
  if (state.documents.some((x) => x.id === raw.id)) return state;
  const d = draft(state);
  find(d.patients, raw.patientId, 'Patient');
  // Incoming documents are untrusted: clean, cap, redact, and flag instruction-like text.
  // Documents can't be sent back to be fixed, so real-looking personal data is REMOVED (and flagged).
  const piiBody = redactPii(raw.body);
  const piiTitle = redactPii(raw.title);
  const body = inspectUntrusted(piiBody.text, LIMITS.documentBody);
  const title = inspectUntrusted(piiTitle.text, LIMITS.documentTitle);
  const piiCount = piiBody.hits.length + piiTitle.hits.length;
  const flags = mergeFlags(body.flags, title.flags, piiCount ? [{ kind: 'pii', detail: `${piiCount} real-looking identifier(s) removed` }] : []);
  const doc: ClinicalDocument = {
    ...structuredClone(raw), body: body.text, title: title.text, source: cleanShort(raw.source, LIMITS.shortField),
    status: 'inbox', extraction: undefined, ...(flags.length ? { securityFlags: flags } : {}),
  };
  d.documents.unshift(doc);
  addActivity(d, ctx, { patientId: doc.patientId, entity: { type: 'document', id: doc.id }, kind: 'document.received', message: `Document received: ${doc.title} from ${doc.source}` }, 'system');
  if (flags.length) {
    addActivity(d, ctx, {
      patientId: doc.patientId, entity: { type: 'document', id: doc.id }, kind: 'security.flagged',
      message: `Untrusted content in "${doc.title}" treated as data only: ${flagSummary(flags)}`,
    }, 'system');
  }
  return d;
}

export function processDocument(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const doc = find(d.documents, id, 'Document');
  if (doc.status === 'filed' || doc.status === 'rejected') return state;
  doc.extraction = extractDocument(doc, find(d.patients, doc.patientId, 'Patient'), ctx.now);
  doc.status = 'review';
  addActivity(d, ctx, { patientId: doc.patientId, entity: { type: 'document', id }, kind: 'ai.extraction', message: `Simulated AI extracted ${doc.extraction.fields.length} fields and ${doc.extraction.suggestions.length} suggestions from "${doc.title}"` }, 'ai');
  return d;
}

export function decideSuggestion(
  state: CoreData, docId: string, suggestionId: string, decision: Decision, ctx: Ctx, editedText?: string,
): CoreData {
  const d = draft(state);
  const doc = find(d.documents, docId, 'Document');
  if (doc.status !== 'review' || !doc.extraction) throw new Error('Document is not awaiting review');
  const s = find(doc.extraction.suggestions, suggestionId, 'Suggestion');
  // Any change (approve, reject, undo, or edit) needs the same permission as approving.
  require(d, ctx, suggestionPermission(s.kind));
  s.decision = decision;
  if (editedText !== undefined) {
    assertNoRealPii(editedText);
    const clean = cleanShort(editedText, LIMITS.ruleText);
    if (clean && clean !== s.text) s.editedText = clean;
  }
  if (decision === 'pending') { s.decidedBy = undefined; s.decidedAt = undefined; }
  else { s.decidedBy = String(ctx.actor); s.decidedAt = ctx.now.toISOString(); }
  return d;
}

/** Coding, problems, and medicines change the clinical record directly, so they need a GP. */
export function suggestionPermission(kind: Suggestion['kind']): Permission {
  return kind === 'task' ? 'approveDocumentActions' : 'approveCoding';
}

/** Approves all pending suggestions the current user is allowed to approve (others stay pending). */
export function approveAllSuggestions(state: CoreData, docId: string, ctx: Ctx): CoreData {
  let d = state;
  const doc = find(state.documents, docId, 'Document');
  for (const s of doc.extraction?.suggestions ?? []) {
    if (s.decision !== 'pending') continue;
    try {
      d = decideSuggestion(d, docId, s.id, 'approved', ctx);
    } catch (e) {
      if (!(e instanceof PermissionError)) throw e;
    }
  }
  return d;
}

export function fileDocument(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const doc = find(d.documents, id, 'Document');
  if (doc.status !== 'review' || !doc.extraction) throw new Error('Document must be processed before filing');
  require(d, ctx, 'approveDocumentActions');
  const pending = doc.extraction.suggestions.filter((s) => s.decision === 'pending');
  if (pending.length) throw new Error(`${pending.length} suggestion(s) still need a decision`);
  const patient = find(d.patients, doc.patientId, 'Patient');
  const now = ctx.now.toISOString();
  const applied: string[] = [];
  for (const s of doc.extraction.suggestions.filter((x) => x.decision === 'approved')) {
    const text = s.editedText ?? s.text;
    if (s.kind === 'task') {
      if (/^no action needed/i.test(text)) continue;
      d.tasks.unshift({
        id: nid(d, 'k'), patientId: doc.patientId, title: text, status: 'open', source: 'document', sourceId: doc.id,
        clinical: true, createdAt: now, assigneeId: patient.registeredGpId,
        due: new Date(ctx.now.getTime() + 7 * 86400000).toISOString(),
      });
      applied.push(`task "${text}"`);
    } else if (s.kind === 'coding' || s.kind === 'problem') {
      if (!patient.conditions.some((c) => c.label === text)) {
        patient.conditions.unshift({ label: text, code: s.code ?? 'PH-UNCODED', since: now.slice(0, 10), status: 'active' });
      }
      applied.push(`problem "${text}"`);
    } else if (s.kind === 'medication') {
      const name = text.replace(/^consider\s+/i, '');
      patient.medications.unshift({ name, dose: 'Per prescriber (from document review)', since: now.slice(0, 10) });
      applied.push(`medication "${name}"`);
    }
  }
  doc.status = 'filed';
  doc.filedBy = String(ctx.actor);
  doc.filedAt = now;
  addActivity(d, ctx, {
    patientId: doc.patientId, entity: { type: 'document', id }, kind: 'document.filed',
    message: `Filed "${doc.title}" to record${applied.length ? `; applied ${applied.join(', ')}` : ''}`,
  });
  runAutomations(d, 'document.filed', { patientId: doc.patientId, document: doc }, ctx);
  return d;
}

export function rejectDocument(state: CoreData, id: string, ctx: Ctx, reason = 'Not relevant / wrong patient'): CoreData {
  const d = draft(state);
  const doc = find(d.documents, id, 'Document');
  require(d, ctx, 'approveDocumentActions');
  if (doc.status !== 'inbox' && doc.status !== 'review') throw new Error(`A ${doc.status} document cannot be rejected`);
  doc.status = 'rejected';
  addActivity(d, ctx, { patientId: doc.patientId, entity: { type: 'document', id }, kind: 'document.rejected', message: `Document "${doc.title}" rejected: ${reason}` });
  return d;
}

// ---------- Scribe ----------
export function generateNote(state: CoreData, transcriptId: string, ctx: Ctx): [CoreData, string] {
  // One note per transcript: reuse an existing draft OR approved note.
  const existing = state.notes.find((n) => n.transcriptId === transcriptId);
  if (existing) return [state, existing.id];
  const d = draft(state);
  const t = find(d.transcripts, transcriptId, 'Transcript');
  const patient = find(d.patients, t.patientId, 'Patient');
  const appt = d.appointments
    .filter((a) => a.patientId === t.patientId && a.staffId === t.clinicianId && a.status === 'booked')
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const note: ConsultationNote = {
    id: nid(d, 'n'), patientId: t.patientId, transcriptId, appointmentId: appt?.id, authorId: t.clinicianId,
    createdAt: ctx.now.toISOString(), soap: generateSoap(t, patient), status: 'draft', ai: soapMeta(ctx.now), edited: false,
  };
  d.notes.unshift(note);
  addActivity(d, ctx, { patientId: t.patientId, entity: { type: 'note', id: note.id }, kind: 'ai.note', message: `Simulated AI drafted a SOAP note from "${t.title}"` }, 'ai');
  return [d, note.id];
}

export function updateNote(state: CoreData, id: string, soap: Soap, ctx: Ctx): CoreData {
  const d = draft(state);
  const n = find(d.notes, id, 'Note');
  require(d, ctx, 'editNote');
  if (n.status === 'approved') throw new Error('Approved notes are locked');
  assertNoRealPii(soap.subjective, soap.objective, soap.assessment, soap.plan);
  const clean = (s: string) => inspectUntrusted(s, LIMITS.soapField).text;
  n.soap = { subjective: clean(soap.subjective), objective: clean(soap.objective), assessment: clean(soap.assessment), plan: clean(soap.plan) };
  n.edited = true;
  return d;
}

export function approveNote(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const n = find(d.notes, id, 'Note');
  require(d, ctx, 'approveNote');
  if (n.status === 'approved') return state;
  n.status = 'approved';
  n.approvedBy = String(ctx.actor);
  n.approvedAt = ctx.now.toISOString();
  addActivity(d, ctx, { patientId: n.patientId, entity: { type: 'note', id }, kind: 'note.approved', message: `Consultation note approved by ${staffName(d, String(ctx.actor))}${n.ai ? ' (drafted by simulated AI' + (n.edited ? ', edited by clinician)' : ')') : ''}` });
  runAutomations(d, 'note.approved', { patientId: n.patientId, note: n }, ctx);
  return d;
}

export function discardNote(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const n = find(d.notes, id, 'Note');
  if (n.status === 'approved') throw new Error('Approved notes cannot be discarded');
  d.notes = d.notes.filter((x) => x.id !== id);
  addActivity(d, ctx, { patientId: n.patientId, entity: { type: 'note', id }, kind: 'note.discarded', message: 'Draft consultation note discarded' });
  return d;
}

// ---------- Tasks ----------
export type TaskInput = Pick<Task, 'title' | 'patientId' | 'detail' | 'assigneeId' | 'due' | 'clinical'> & { source?: Task['source']; sourceId?: string };

export function addTask(state: CoreData, input: TaskInput, ctx: Ctx): [CoreData, string] {
  const d = draft(state);
  assertNoRealPii(input.title, input.detail);
  const title = cleanShort(input.title, LIMITS.taskTitle);
  if (!title) throw new Error('Task title is required');
  if (input.patientId) find(d.patients, input.patientId, 'Patient');
  if (input.assigneeId) find(d.staff, input.assigneeId, 'Staff');
  const t: Task = {
    source: 'manual', ...input, title, detail: input.detail ? cleanShort(input.detail, LIMITS.ruleText) : undefined,
    clinical: !!input.clinical, due: input.due ? validDate(input.due, 'due date') : undefined,
    id: nid(d, 'k'), status: 'open', createdAt: ctx.now.toISOString(),
  };
  d.tasks.unshift(t);
  addActivity(d, ctx, { patientId: t.patientId, entity: { type: 'task', id: t.id }, kind: 'task.created', message: `Task created: ${t.title}` });
  return [d, t.id];
}

export function completeTask(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const t = find(d.tasks, id, 'Task');
  if (t.status === 'done') return state;
  if (t.clinical) require(d, ctx, 'completeClinicalTask');
  t.status = 'done';
  t.completedAt = ctx.now.toISOString();
  t.completedBy = String(ctx.actor);
  addActivity(d, ctx, { patientId: t.patientId, entity: { type: 'task', id }, kind: 'task.completed', message: `Task completed: ${t.title}` });
  return d;
}

export function reopenTask(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  const t = find(d.tasks, id, 'Task');
  if (t.status === 'open') return state;
  t.status = 'open';
  t.completedAt = undefined;
  t.completedBy = undefined;
  addActivity(d, ctx, { patientId: t.patientId, entity: { type: 'task', id }, kind: 'task.reopened', message: `Task reopened: ${t.title}` });
  return d;
}

// ---------- Referrals ----------
export type ReferralInput = Pick<Referral, 'patientId' | 'specialty' | 'destination' | 'reason' | 'priority' | 'expectedBy'>;

export function createReferral(state: CoreData, input: ReferralInput, ctx: Ctx): [CoreData, string] {
  const d = draft(state);
  require(d, ctx, 'createReferral');
  find(d.patients, input.patientId, 'Patient');
  assertNoRealPii(input.specialty, input.destination, input.reason);
  const now = ctx.now.toISOString();
  const f: Referral = {
    ...input, priority: oneOf(input.priority, PRIORITIES, 'priority'), expectedBy: validDate(input.expectedBy, 'expected date'), specialty: cleanShort(input.specialty, LIMITS.shortField), destination: cleanShort(input.destination, LIMITS.shortField),
    reason: cleanShort(input.reason, LIMITS.ruleText), id: nid(d, 'f'), status: 'drafted', createdAt: now, updatedAt: now,
    createdBy: String(ctx.actor),
  };
  d.referrals.unshift(f);
  addActivity(d, ctx, { patientId: f.patientId, entity: { type: 'referral', id: f.id }, kind: 'referral.created', message: `Referral to ${f.specialty} drafted` });
  return [d, f.id];
}

export function setReferralStatus(state: CoreData, id: string, status: ReferralStatus, ctx: Ctx): CoreData {
  const d = draft(state);
  const f = find(d.referrals, id, 'Referral');
  status = oneOf(status, REFERRAL_STATUSES, 'referral status');
  if (f.status === status) return state;
  f.status = status;
  f.updatedAt = ctx.now.toISOString();
  addActivity(d, ctx, { patientId: f.patientId, entity: { type: 'referral', id }, kind: 'referral.status', message: `Referral to ${f.specialty}: ${status}` });
  return d;
}

// ---------- Automations ----------
const TRIGGERS = ['request.created', 'document.filed', 'note.approved', 'appointment.booked', 'appointment.completed'];
const ACTION_TYPES = ['set_status', 'assign_role', 'create_task', 'complete_task_matching', 'notify'];
const CONDITION_FIELDS = ['urgency', 'type', 'channel', 'documentKind', 'always'];

/** Automations may only use known triggers/actions, within size limits. They can never touch notes or coding. */
export function validateAutomation<T extends Omit<AutomationRule, 'id' | 'runCount'> & { id?: string }>(rule: T): T {
  if (!TRIGGERS.includes(rule.trigger)) throw new SafetyError(`Unknown trigger "${rule.trigger}"`);
  if (rule.conditions.length > LIMITS.ruleConditions) throw new SafetyError(`At most ${LIMITS.ruleConditions} conditions per automation`);
  if (rule.actions.length < 1 || rule.actions.length > LIMITS.ruleActions) throw new SafetyError(`Automations need 1–${LIMITS.ruleActions} actions`);
  for (const c of rule.conditions) {
    if (!CONDITION_FIELDS.includes(c.field)) throw new SafetyError(`Unknown condition field "${c.field}"`);
    oneOf(c.op, ['equals', 'not_equals'] as const, 'condition operator');
  }
  const actions = rule.actions.map((a) => {
    if (!ACTION_TYPES.includes(a.type)) throw new SafetyError(`Action "${(a as { type: string }).type}" is not allowed`);
    if (a.type === 'create_task') {
      const dueInDays = Math.min(365, Math.max(0, Math.round(a.dueInDays)));
      return { ...a, title: cleanShort(a.title, LIMITS.taskTitle) || 'Follow-up', dueInDays };
    }
    if (a.type === 'notify') return { ...a, message: cleanShort(a.message, LIMITS.ruleText) };
    if (a.type === 'complete_task_matching') {
      const titleIncludes = cleanShort(a.titleIncludes, LIMITS.ruleName);
      if (titleIncludes.length < 3) throw new SafetyError('Task matching text must be at least 3 characters');
      return { ...a, titleIncludes };
    }
    if (a.type === 'set_status') return { ...a, status: oneOf(a.status, REQUEST_STATUSES, 'status') };
    if (a.type === 'assign_role') return { ...a, role: oneOf(a.role, ROLES, 'role') };
    return a;
  });
  return {
    ...rule,
    name: cleanShort(rule.name, LIMITS.ruleName) || 'Untitled automation',
    description: cleanShort(rule.description, LIMITS.ruleText),
    conditions: rule.conditions.map((c) => ({ ...c, value: cleanShort(c.value, LIMITS.ruleName) })),
    actions,
  };
}

export function upsertAutomation(state: CoreData, rule: Omit<AutomationRule, 'id' | 'runCount'> & { id?: string }, ctx: Ctx): [CoreData, string] {
  const d = draft(state);
  require(d, ctx, 'manageAutomations');
  rule = validateAutomation(rule);
  const existing = rule.id ? d.automations.find((r) => r.id === rule.id) : undefined;
  if (existing) {
    Object.assign(existing, structuredClone(rule));
    addActivity(d, ctx, { entity: { type: 'automation', id: existing.id }, kind: 'automation.updated', message: `Automation "${existing.name}" updated` });
    return [d, existing.id];
  }
  const created: AutomationRule = { ...structuredClone(rule), id: nid(d, 'au'), runCount: 0 };
  d.automations.push(created);
  addActivity(d, ctx, { entity: { type: 'automation', id: created.id }, kind: 'automation.created', message: `Automation "${created.name}" created` });
  return [d, created.id];
}

export function toggleAutomation(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  require(d, ctx, 'manageAutomations');
  const r = find(d.automations, id, 'Automation');
  r.enabled = !r.enabled;
  addActivity(d, ctx, { entity: { type: 'automation', id }, kind: 'automation.toggled', message: `Automation "${r.name}" ${r.enabled ? 'enabled' : 'disabled'}` });
  return d;
}

export function deleteAutomation(state: CoreData, id: string, ctx: Ctx): CoreData {
  const d = draft(state);
  require(d, ctx, 'manageAutomations');
  const r = find(d.automations, id, 'Automation');
  d.automations = d.automations.filter((x) => x.id !== id);
  addActivity(d, ctx, { entity: { type: 'automation', id }, kind: 'automation.deleted', message: `Automation "${r.name}" deleted` });
  return d;
}

// ---------- Receptionist calls ----------
export function saveCall(state: CoreData, rawCall: CallSession, ctx: Ctx): CoreData {
  const call: CallSession = {
    ...rawCall,
    messages: rawCall.messages.slice(-60).map((m) => ({ ...m, text: inspectUntrusted(redactPii(m.text).text, LIMITS.callMessage).text })),
  };
  const d = draft(state);
  const i = d.calls.findIndex((c) => c.id === call.id);
  const wasEnded = i >= 0 && !!d.calls[i].endedAt;
  if (i >= 0) d.calls[i] = structuredClone(call);
  else d.calls.unshift(structuredClone(call));
  if (d.calls.length > LIMITS.callsKept) d.calls.length = LIMITS.callsKept;
  if (call.endedAt && !wasEnded) {
    addActivity(d, ctx, { patientId: call.patientId, entity: { type: 'call', id: call.id }, kind: 'call.completed', message: `AI receptionist call handled (simulated): ${call.outcome?.route ?? 'no outcome'}` }, 'ai');
  }
  return d;
}

export function newId(state: CoreData, prefix: string): [CoreData, string] {
  const d = { ...state };
  const id = nid(d, prefix);
  return [d, id];
}
