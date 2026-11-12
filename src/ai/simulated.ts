/**
 * SIMULATED AI — deterministic rules that imitate what an AI assistant might draft.
 * Nothing here calls a model. The same input always gives the same output.
 * Every result is tagged `simulated: true` and must be reviewed by a human.
 * These rules are illustrative only and are NOT clinical guidance.
 */
import {
  AI_MODEL_LABEL,
  type AiMeta, type ClinicalDocument, type DocumentExtraction, type ExtractedField, type Patient,
  type PatientRequest, type RequestAiSummary, type Soap, type StaffRole, type Suggestion, type Transcript,
  type Urgency,
} from '@/types';
import { ageFromDob, documentKindLabel } from '@/lib/format';
import { normaliseForDetection } from '@/security/guards';

const meta = (now: Date, confidence: number): AiMeta => ({
  simulated: true, model: AI_MODEL_LABEL, generatedAt: now.toISOString(), confidence,
});

// ---------------------------------------------------------------------------
// 1. Triage summary
// ---------------------------------------------------------------------------
export const RED_FLAGS: { flag: string; keywords: string[] }[] = [
  { flag: 'Chest pain or tightness', keywords: ['chest pain', 'chest tightness', 'tight chest', 'crushing'] },
  { flag: 'Severe breathing difficulty', keywords: ['cannot breathe', "can't breathe", 'struggling to breathe', 'blue lips'] },
  { flag: 'Stroke signs (face, arm, speech)', keywords: ['face drooping', 'slurred speech', 'arm weakness', 'one side'] },
  { flag: 'Heavy bleeding', keywords: ['heavy bleeding', 'vomiting blood', 'black stools', 'coughing blood'] },
  { flag: 'Risk of self-harm', keywords: ['suicidal', 'end my life', 'harm myself', 'kill myself'] },
  { flag: 'Non-blanching rash / meningitis signs', keywords: ['does not fade', "doesn't fade", 'stiff neck', 'non-blanching'] },
];

/**
 * A red-flag keyword counts as NEGATED only when a negation word directly precedes it in the same clause,
 * e.g. "no chest pain" or "denies chest pain". "No worries, chest pain…" or "no idea why but chest pain" still count.
 * Safety bias: when unsure, treat the red flag as present.
 */
const NEGATED_PREFIX = /\b(no|not|denies|denied|without|never|nil|negative for|no history of|no new|no recent)\s+(any\s+|recent\s+|new\s+|significant\s+)?$/;

/** Lowercase, collapse spacing, and undo common letter/digit swaps ("ch3st") for red-flag matching only. */
function normaliseForRedFlags(text: string): string {
  return normaliseForDetection(text).toLowerCase();
}

/** True if `keyword` appears at least once WITHOUT a negation directly before it. */
function mentions(text: string, keyword: string): boolean {
  let idx = text.indexOf(keyword);
  while (idx >= 0) {
    const clause = text.slice(Math.max(0, idx - 40), idx).split(/[.,!?;\n]|\bbut\b|\bhowever\b/).pop() ?? '';
    if (!NEGATED_PREFIX.test(clause)) return true;
    idx = text.indexOf(keyword, idx + keyword.length);
  }
  return false;
}

function durationDays(duration: string): number {
  const m = duration.toLowerCase().match(/(\d+)\s*(day|week|month|year)/);
  if (!m) return 0;
  const n = Number(m[1]);
  return n * ({ day: 1, week: 7, month: 30, year: 365 } as const)[m[2] as 'day' | 'week' | 'month' | 'year'];
}

export function assessUrgency(req: Pick<PatientRequest, 'description' | 'symptoms' | 'severity' | 'duration' | 'type' | 'subject'>): {
  urgency: Urgency; redFlags: { flag: string; present: boolean }[];
} {
  const text = normaliseForRedFlags(`${req.subject}. ${req.description}. ${req.symptoms.join('. ')}`);
  const redFlags = RED_FLAGS.map(({ flag, keywords }) => ({ flag, present: keywords.some((k) => mentions(text, k)) }));
  // Red flags are checked for EVERY request type: choosing "admin" or "medication" can't hide an emergency.
  if (redFlags.some((f) => f.present)) return { urgency: 'emergency', redFlags };
  if (req.type !== 'clinical') return { urgency: 'routine', redFlags };
  const days = durationDays(req.duration);
  if (req.severity >= 8 || (req.severity >= 6 && days > 0 && days <= 2)) return { urgency: 'urgent', redFlags };
  if (req.severity >= 5 || days >= 14) return { urgency: 'soon', redFlags };
  return { urgency: 'routine', redFlags };
}

const ROUTES: Record<Urgency, { route: string; role: StaffRole }> = {
  emergency: { route: 'Clinician to call now. Advise 999 or A&E if symptoms are happening right now', role: 'gp' },
  urgent: { route: 'Same-day GP call-back', role: 'gp' },
  soon: { route: 'GP appointment within 1–2 weeks', role: 'gp' },
  routine: { route: 'Routine appointment with nurse or GP', role: 'nurse' },
};

export function summarizeRequest(req: PatientRequest, patient: Patient, now: Date = new Date()): RequestAiSummary {
  const { urgency, redFlags } = assessUrgency(req);
  const age = ageFromDob(patient.dob, now);
  const first = patient.name.split(' ')[0];
  let route = ROUTES[urgency];
  if (req.type === 'medication') route = { route: 'Prescription request: nurse or clinical pharmacist to review', role: 'nurse' };
  if (req.type === 'admin') route = { route: 'Admin request: care navigator to action', role: 'receptionist' };

  const symptoms = req.symptoms.length ? req.symptoms.map((s) => s.toLowerCase()).join(', ') : 'no specific symptoms';
  const conditions = patient.conditions.filter((c) => c.status === 'active').map((c) => c.label);
  const summary =
    req.type === 'clinical'
      ? `${first} (${age}) reports ${symptoms} for ${req.duration}, self-rated severity ${req.severity}/10. ` +
        (conditions.length ? `Relevant history: ${conditions.join('; ')}. ` : 'No significant past history recorded. ') +
        (redFlags.some((f) => f.present)
          ? 'One or more red-flag phrases were detected and need immediate clinician review.'
          : 'No red-flag phrases detected in the request text.')
      : `${first} (${age}) has a ${req.type} request: "${req.subject}".`;

  const keyPoints = [
    `Main concern: ${req.subject}`,
    req.type === 'clinical' ? `Duration ${req.duration}; severity ${req.severity}/10` : `Request type: ${req.type}`,
    patient.medications.length ? `Current medicines: ${patient.medications.map((m) => m.name).join(', ')}` : 'No current medicines',
    patient.allergies.length ? `Allergies: ${patient.allergies.join(', ')}` : 'No known allergies',
    `Contact preference: ${req.preferredContact.toUpperCase()}; availability: ${req.availability}`,
  ];
  const confidence = req.type === 'clinical' ? (redFlags.some((f) => f.present) ? 0.7 : 0.82) : 0.93;
  return {
    ...meta(now, confidence), summary, keyPoints, suggestedUrgency: urgency,
    suggestedRoute: route.route, suggestedRole: route.role, redFlagsChecked: redFlags,
  };
}

// ---------------------------------------------------------------------------
// 2. Document extraction
// ---------------------------------------------------------------------------
interface SuggestionRule {
  when: (body: string, fields: ExtractedField[]) => boolean;
  make: () => Omit<Suggestion, 'id' | 'decision'>[];
}

const has = (body: string, ...words: string[]) => words.every((w) => body.toLowerCase().includes(w.toLowerCase()));
const isFlagged = (fields: ExtractedField[], label: string) =>
  fields.some((f) => f.label.toLowerCase().startsWith(label.toLowerCase()) && f.flag);

const SUGGESTION_RULES: SuggestionRule[] = [
  {
    when: (_b, f) => isFlagged(f, 'ferritin') && isFlagged(f, 'haemoglobin'),
    make: () => [
      { kind: 'coding', text: 'Iron deficiency anaemia', code: 'PH-IDA-01', detail: 'Placeholder code, not a real SNOMED CT concept' },
      { kind: 'medication', text: 'Consider ferrous fumarate 210 mg once daily', detail: 'Prescriber to confirm dose and duration' },
      { kind: 'task', text: 'Repeat full blood count and ferritin in 8 weeks' },
      { kind: 'task', text: 'Book GP review to discuss results and cause' },
    ],
  },
  {
    when: (_b, f) => isFlagged(f, 'hba1c'),
    make: () => [
      { kind: 'coding', text: 'Type 2 diabetes, above target', code: 'PH-T2D-02', detail: 'Placeholder code' },
      { kind: 'task', text: 'Diabetes medication review with GP' },
      { kind: 'task', text: 'Repeat HbA1c in 3 months' },
    ],
  },
  {
    when: (_b, f) => isFlagged(f, 'cholesterol'),
    make: () => [{ kind: 'task', text: 'Discuss cardiovascular risk and statin options' }],
  },
  {
    when: (b) => has(b, 'COPD', 'exacerbation'),
    make: () => [
      { kind: 'problem', text: 'COPD exacerbation (hospital admission)', code: 'PH-COPD-02', detail: 'Placeholder code' },
      { kind: 'medication', text: 'Short course: prednisolone and doxycycline (hospital-initiated, ending soon)', detail: 'Record as acute, not repeat' },
      { kind: 'task', text: 'GP review within 2 weeks of discharge' },
      { kind: 'task', text: 'Consider pulmonary rehabilitation referral' },
    ],
  },
  {
    when: (b) => has(b, 'osteoarthritis'),
    make: () => [
      { kind: 'coding', text: 'Osteoarthritis of knee, moderate', code: 'PH-OA-02', detail: 'Placeholder code' },
      { kind: 'task', text: 'Review analgesia; consider topical NSAID' },
      { kind: 'task', text: 'Note orthopaedic clinic review in 3 months' },
    ],
  },
];

export function extractFields(body: string): ExtractedField[] {
  const skip = /^(patient|requested by|nhs no|admitted|comment|summary)\b/i;
  const fields: ExtractedField[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    const m = line.match(/^([A-Za-z][A-Za-z0-9 \-/()]{1,40}):\s*(.+)$/);
    if (!m || skip.test(m[1])) continue;
    let value = m[2].trim();
    let flag: ExtractedField['flag'];
    if (/\bLOW$/.test(value)) { flag = 'low'; value = value.replace(/\s*LOW$/, ''); }
    else if (/\bHIGH$/.test(value)) { flag = 'high'; value = value.replace(/\s*HIGH$/, ''); }
    fields.push({ label: m[1].trim(), value, flag });
  }
  return fields;
}

function firstSentenceAfter(body: string, label: string): string | undefined {
  const m = body.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'));
  return m?.[1].split(/(?<=\.)\s/)[0].trim();
}

export function extractDocument(
  doc: ClinicalDocument, patient: Patient, now: Date = new Date(), idPrefix = doc.id,
): DocumentExtraction {
  const fields = extractFields(doc.body);
  const abnormal = fields.filter((f) => f.flag);
  const headline = firstSentenceAfter(doc.body, 'Summary') ?? firstSentenceAfter(doc.body, 'Comment') ?? '';
  const summary =
    `${documentKindLabel(doc.kind)} from ${doc.source} for ${patient.name}. ${headline} ` +
    (doc.kind === 'lab_report'
      ? abnormal.length
        ? `${abnormal.length} result${abnormal.length > 1 ? 's' : ''} outside range: ${abnormal.map((f) => `${f.label} (${f.flag})`).join(', ')}.`
        : 'All extracted results are within the reference range.'
      : `${fields.length} structured fields extracted.`);

  const raw = SUGGESTION_RULES.filter((r) => r.when(doc.body, fields)).flatMap((r) => r.make());
  if (raw.length === 0) raw.push({ kind: 'task', text: 'No action needed: file to record' });
  const suggestions: Suggestion[] = raw.map((s, i) => ({ ...s, id: `${idPrefix}-s${i + 1}`, decision: 'pending' }));
  return { ...meta(now, abnormal.length ? 0.88 : 0.94), summary: summary.replace(/\s+/g, ' ').trim(), fields, suggestions };
}

// ---------------------------------------------------------------------------
// 3. Scribe: transcript → SOAP note
// ---------------------------------------------------------------------------
const OBJECTIVE = /(on examination|blood pressure|\bbp\b|pulse|saturation|temperature|weight|score|look|appear)/i;
const ASSESSMENT = /(likely|i think|consistent with|suggests|diagnos|is above target|not as well controlled|shows)/i;
const PLAN = /(i'll|we'll|i will|we will|start|prescri|refer|book|recheck|repeat|review in|increase|if you get|call 111|contact us)/i;

/** Turn first-person speech into a terse clinical style. Deliberately simple. */
function clinicalise(text: string, firstName: string): string {
  return text
    .replace(/^(hi|okay|so|right)[, ]+/i, '')
    .replace(/\bI've\b/g, 'Has').replace(/\bI'm\b/g, 'Is').replace(/\bI get\b/g, 'Gets')
    .replace(/\bI feel\b/g, 'Feels').replace(/\bI\b/g, firstName).replace(/\bmy\b/gi, 'their')
    .replace(/\byour\b/gi, '').replace(/\byou\b/gi, 'patient')
    .replace(/\s{2,}/g, ' ').trim();
}

export function generateSoap(t: Transcript, patient: Patient): Soap {
  const first = patient.name.split(' ')[0];
  // Clinician questions are history-taking, not findings or plans, so leave them out.
  const clin = t.lines.filter((l) => l.speaker === 'clinician' && !l.text.trim().endsWith('?')).map((l) => l.text);
  const pat = t.lines.filter((l) => l.speaker === 'patient').map((l) => l.text);
  const subjective = pat
    .filter((l) => !/^(okay|sounds good|thank)/i.test(l))
    .map((l) => clinicalise(l, first)).join(' ');
  const objective = clin.filter((l) => OBJECTIVE.test(l)).map((l) => clinicalise(l.replace(/^on examination,?\s*/i, 'O/E: '), first)).join(' ');
  const assessment = clin.filter((l) => ASSESSMENT.test(l) && !OBJECTIVE.test(l)).map((l) => clinicalise(l, first)).join(' ');
  const plan = clin
    .filter((l) => PLAN.test(l) && !ASSESSMENT.test(l))
    .map((l) => '• ' + clinicalise(l.replace(/^(I'll|We'll)\s+(also\s+)?/i, ''), first).replace(/^./, (c) => c.toUpperCase()))
    .join('\n');
  return {
    subjective: subjective || 'Not captured in transcript.',
    objective: objective || 'No examination findings captured in transcript.',
    assessment: assessment || 'Clinician to complete.',
    plan: plan || 'Clinician to complete.',
  };
}

export const soapMeta = (now: Date = new Date()): AiMeta => meta(now, 0.8);
