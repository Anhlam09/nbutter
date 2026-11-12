// Domain types. All data in this app is FICTIONAL.
import { BRAND } from './brand';
import type { SecurityFlag } from './security/guards';
export type { SecurityFlag };

export type ID = string;
export type ISODate = string;

// ---------- Staff ----------
export type StaffRole = 'gp' | 'nurse' | 'receptionist' | 'manager';
export interface Staff {
  id: ID;
  name: string;
  role: StaffRole;
  title: string; // e.g. "GP Partner"
  initials: string;
}

// ---------- Patients ----------
export interface Condition {
  label: string;
  code: string; // placeholder code, NOT a real coding system lookup
  since: string; // year or ISO date
  status: 'active' | 'resolved';
}
export interface Medication {
  name: string;
  dose: string;
  since: string;
}
export interface Patient {
  id: ID;
  nhsNumber: string; // fictional, 999 test range
  name: string;
  dob: ISODate;
  sex: 'Female' | 'Male' | 'Not stated';
  phone: string;
  email: string;
  address: string;
  conditions: Condition[];
  medications: Medication[];
  allergies: string[];
  registeredGpId: ID;
  flags: string[]; // e.g. "Prefers phone contact"
}

// ---------- Simulated AI ----------
export const AI_MODEL_LABEL: string = BRAND.aiLabel;

export interface AiMeta {
  simulated: true;
  model: string;
  generatedAt: ISODate;
  confidence: number; // 0..1, illustrative only
}

// ---------- Triage requests ----------
export type Urgency = 'emergency' | 'urgent' | 'soon' | 'routine';
export type RequestStatus = 'new' | 'in_review' | 'assigned' | 'scheduled' | 'completed' | 'closed';
export type RequestChannel = 'online' | 'phone' | 'receptionist_ai' | 'walk_in';
export type RequestType = 'clinical' | 'admin' | 'medication';

export interface RequestAiSummary extends AiMeta {
  summary: string;
  keyPoints: string[];
  suggestedUrgency: Urgency;
  suggestedRoute: string; // e.g. "GP appointment within 2 weeks"
  suggestedRole: StaffRole;
  redFlagsChecked: { flag: string; present: boolean }[];
}

export interface PatientRequest {
  id: ID;
  patientId: ID;
  createdAt: ISODate;
  channel: RequestChannel;
  type: RequestType;
  subject: string;
  description: string;
  symptoms: string[];
  duration: string; // free text, e.g. "3 weeks"
  severity: number; // 1..10 as reported by patient
  preferredContact: 'phone' | 'sms' | 'email';
  availability: string;
  urgency: Urgency;
  status: RequestStatus;
  assigneeId?: ID;
  aiSummary?: RequestAiSummary;
  appointmentId?: ID;
  firstResponseAt?: ISODate;
  completedAt?: ISODate;
  /** Set when untrusted input was cleaned or looked like an instruction (treated as data only). */
  securityFlags?: SecurityFlag[];
}

// ---------- Appointments ----------
export interface Appointment {
  id: ID;
  patientId: ID;
  staffId: ID;
  requestId?: ID;
  start: ISODate;
  durationMins: number;
  mode: 'in_person' | 'phone' | 'video';
  reason: string;
  status: 'booked' | 'completed' | 'cancelled';
}

// ---------- Documents ----------
export type DocumentKind = 'discharge_summary' | 'referral_letter' | 'lab_report';
export type DocumentStatus = 'inbox' | 'review' | 'filed' | 'rejected';
export type SuggestionKind = 'task' | 'coding' | 'medication' | 'problem';
export type Decision = 'pending' | 'approved' | 'rejected';

export interface Suggestion {
  id: ID;
  kind: SuggestionKind;
  text: string;
  detail?: string;
  code?: string; // placeholder only
  decision: Decision;
  editedText?: string;
  decidedBy?: ID;
  decidedAt?: ISODate;
}

export interface ExtractedField {
  label: string;
  value: string;
  flag?: 'high' | 'low' | 'abnormal';
}

export interface DocumentExtraction extends AiMeta {
  summary: string;
  fields: ExtractedField[];
  suggestions: Suggestion[];
}

export interface ClinicalDocument {
  id: ID;
  patientId: ID;
  kind: DocumentKind;
  title: string;
  source: string; // fictional sender
  receivedAt: ISODate;
  body: string;
  status: DocumentStatus;
  extraction?: DocumentExtraction;
  filedBy?: ID;
  filedAt?: ISODate;
  securityFlags?: SecurityFlag[];
}

// ---------- Scribe ----------
export interface TranscriptLine {
  speaker: 'clinician' | 'patient';
  text: string;
}
export interface Transcript {
  id: ID;
  patientId: ID;
  clinicianId: ID;
  title: string;
  recordedAt: ISODate;
  lines: TranscriptLine[];
}
export interface Soap {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}
export interface ConsultationNote {
  id: ID;
  patientId: ID;
  transcriptId?: ID;
  appointmentId?: ID;
  authorId: ID;
  createdAt: ISODate;
  soap: Soap;
  status: 'draft' | 'approved';
  ai?: AiMeta; // present when drafted by simulated AI
  edited: boolean;
  approvedBy?: ID;
  approvedAt?: ISODate;
}

// ---------- Tasks & referrals ----------
export type TaskSource = 'request' | 'document' | 'scribe' | 'automation' | 'manual' | 'referral';
export interface Task {
  id: ID;
  patientId?: ID;
  title: string;
  detail?: string;
  assigneeId?: ID;
  due?: ISODate;
  status: 'open' | 'done';
  source: TaskSource;
  sourceId?: ID;
  clinical: boolean; // clinical tasks require a clinician to complete
  createdAt: ISODate;
  completedAt?: ISODate;
  completedBy?: ID;
}

export type ReferralStatus = 'drafted' | 'sent' | 'acknowledged' | 'booked' | 'completed';
export interface Referral {
  id: ID;
  patientId: ID;
  specialty: string;
  destination: string; // fictional provider
  reason: string;
  priority: 'routine' | 'urgent' | 'two_week_wait';
  status: ReferralStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
  expectedBy: ISODate;
  createdBy: ID;
}

// ---------- Activity ----------
export type ActorId = ID | 'system' | 'ai' | 'patient' | 'automation';
export type EntityType =
  | 'request' | 'appointment' | 'document' | 'note' | 'task' | 'referral' | 'patient' | 'automation' | 'call';
export interface Activity {
  id: ID;
  at: ISODate;
  actor: ActorId;
  patientId?: ID;
  entity?: { type: EntityType; id: ID };
  kind: string; // e.g. "request.created"
  message: string;
}

// ---------- Automations ----------
export type AutomationTrigger =
  | 'request.created'
  | 'document.filed'
  | 'note.approved'
  | 'appointment.booked'
  | 'appointment.completed';

export interface AutomationCondition {
  field: 'urgency' | 'type' | 'channel' | 'documentKind' | 'always';
  op: 'equals' | 'not_equals';
  value: string;
}
export type AutomationAction =
  | { type: 'set_status'; status: RequestStatus }
  | { type: 'assign_role'; role: StaffRole }
  | { type: 'create_task'; title: string; clinical: boolean; dueInDays: number }
  | { type: 'complete_task_matching'; titleIncludes: string }
  | { type: 'notify'; message: string };

export interface AutomationRule {
  id: ID;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  runCount: number;
  lastRunAt?: ISODate;
}

// ---------- Receptionist ----------
export interface CallMessage {
  from: 'caller' | 'ai' | 'system';
  text: string;
  at: ISODate;
}
export interface CallSession {
  id: ID;
  scenarioId: string;
  patientId?: ID;
  startedAt: ISODate;
  endedAt?: ISODate;
  messages: CallMessage[];
  outcome?: { requestId?: ID; route: string; urgency: Urgency };
}

// ---------- UI / demo ----------
export interface DemoState {
  active: boolean;
  step: number; // index of the NEXT step to run (0 = not started)
  completed: boolean;
  /** ids created during the demo (e.g. Jamie's request) so later steps can find them */
  refs: Record<string, string>;
}
