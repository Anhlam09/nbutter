/**
 * SIMULATED PHONE RECEPTIONIST — a scripted, deterministic slot-filling engine.
 * There is no speech recognition and no AI model: callers are typed text, the "AI" follows fixed rules.
 * Everything it produces is a PROPOSAL that staff must review before anything enters a record.
 * Illustrative only; not clinical guidance.
 */
import { BRAND } from '@/brand';
import type { RequestInput } from '@/store/core';
import type { Patient, RequestType, Urgency } from '@/types';
import { assessUrgency } from '@/ai/simulated';

// ---------------------------------------------------------------------------
// Scenarios (fictional callers linked to fixture patients)
// ---------------------------------------------------------------------------
export interface Scenario {
  id: string;
  title: string;
  summary: string;
  patientId: string;
  /** Scripted caller lines, in the order the AI will ask for them. */
  callerLines: string[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'sc-repeat',
    title: 'Repeat prescription',
    summary: 'Chloe Bennett is running low on her regular medicine.',
    patientId: 'p-chloe',
    callerLines: [
      'Hello, my name is Chloe Bennett.',
      '25 August 1989.',
      "I'd like to order a repeat prescription for my levothyroxine. I'm running low.",
      'A phone call is fine.',
    ],
  },
  {
    id: 'sc-bp',
    title: 'Home blood pressure readings',
    summary: 'Daniel Kowalski is worried about higher readings at home.',
    patientId: 'p-daniel',
    callerLines: [
      'Hi, this is Daniel Kowalski.',
      '14 November 1973.',
      "I've been checking my blood pressure at home and the readings have been higher than usual. I'd like someone to look at them.",
      'Some evening headaches and feeling a bit dizzy.',
      'About 2 weeks.',
      '4',
      'No, none of those.',
      'Text message please.',
    ],
  },
  {
    id: 'sc-earache',
    title: "Parent calling about a child's earache",
    summary: "A parent rings about Grace Thompson, aged 8, who has a sore ear.",
    patientId: 'p-grace',
    callerLines: [
      "Hello, I'm calling about my daughter, Grace Thompson.",
      '8 March 2018.',
      'She has an earache and keeps pulling at her ear.',
      'Pulling at her ear, a bit grumpy, a mild temperature.',
      '2 days',
      '6',
      'No, nothing like that.',
      'Phone please.',
    ],
  },
  {
    id: 'sc-rebook',
    title: 'Rebook an appointment',
    summary: 'Sofia Alvarez had to cancel and wants a new time.',
    patientId: 'p-sofia',
    callerLines: [
      'Hi, Sofia Alvarez speaking.',
      '30 June 1996',
      'I had to cancel my migraine review appointment and I need to rebook it.',
      'Email is best for me.',
    ],
  },
  {
    id: 'sc-redflag',
    title: 'Red flag: chest tightness',
    summary: 'Oliver Grant describes symptoms that trigger the 999 advice.',
    patientId: 'p-oliver',
    callerLines: [
      'This is Oliver Grant.',
      '1 December 1954',
      "I've got a really tight chest and it started about twenty minutes ago.",
    ],
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export type Stage =
  | 'name' | 'dob' | 'reason' | 'symptoms' | 'duration' | 'severity' | 'redflags' | 'contact' | 'done';

export interface DirectoryEntry { id: string; name: string; dob: string }

export interface Slots {
  patientId?: string;
  patientName?: string;
  dobVerified: boolean;
  reason?: string;
  type?: RequestType;
  symptoms: string[];
  duration?: string;
  severity?: number;
  redFlagAnswer?: 'yes' | 'no';
  contact?: 'phone' | 'sms' | 'email';
}

export interface CallOutcome {
  kind: 'completed' | 'red_flag' | 'unverified';
  /** Absent when the caller could not be identified. */
  request?: RequestInput;
  route: string;
  urgency: Urgency;
  redFlags: string[];
}

export interface ReceptionistState {
  stage: Stage;
  slots: Slots;
  directory: DirectoryEntry[];
  failedAttempts: number;
  outcome?: CallOutcome;
}

export interface Turn {
  state: ReceptionistState;
  /** What the simulated receptionist says next. */
  reply: string;
  ended: boolean;
}

export const GREETING =
  `Good morning, ${BRAND.clinicName}, this is the automated receptionist. This call is a simulation. Could I have your full name, please?`;

export function startCall(patients: Pick<Patient, 'id' | 'name' | 'dob'>[]): { state: ReceptionistState; reply: string } {
  return {
    state: {
      stage: 'name', slots: { dobVerified: false, symptoms: [] }, failedAttempts: 0,
      directory: patients.map((p) => ({ id: p.id, name: p.name, dob: p.dob })),
    },
    reply: GREETING,
  };
}

// ---------------------------------------------------------------------------
// Parsing helpers (small, readable, exported for tests)
// ---------------------------------------------------------------------------
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Understands "25 August 1989", "25th Aug 1989", "25/08/1989" and "1989-08-25". Returns ISO date or undefined. */
export function parseDob(text: string): string | undefined {
  const t = text.toLowerCase();
  let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = t.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})\.?,?\s+(\d{4})/);
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3));
    if (mi >= 0) return `${m[3]}-${pad(mi + 1)}-${pad(+m[1])}`;
  }
  return undefined;
}

export function findPatient(text: string, directory: DirectoryEntry[]): DirectoryEntry | undefined {
  const t = text.toLowerCase();
  return directory.find((p) => p.name.toLowerCase().split(' ').every((part) => t.includes(part)));
}

export function parseSeverity(text: string): number | undefined {
  const m = text.match(/\b(10|[1-9])\b/);
  if (m) return Number(m[1]);
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const hit = Object.keys(words).find((w) => new RegExp(`\\b${w}\\b`, 'i').test(text));
  return hit ? words[hit] : undefined;
}

export function classifyReason(text: string): RequestType {
  const t = text.toLowerCase();
  if (/prescription|repeat|medicine|medication|refill/.test(t)) return 'medication';
  const symptomy = /pain|ache|hurt|dizz|cough|fever|rash|feel|symptom|breath|sick|readings|blood pressure|worried/.test(t);
  if (/rebook|re-book|book|appointment|letter|form|fit note|sick note|cancel/.test(t) && !symptomy) return 'admin';
  return 'clinical';
}

function parseYesNo(text: string): 'yes' | 'no' | undefined {
  const t = text.toLowerCase().trim();
  if (/^(no|nope|none|nothing|neither)\b|\bnone of\b|\bnothing like\b|\bno,? /.test(t)) return 'no';
  if (/^(yes|yeah|yep)\b|\bi do\b|\bhe does\b|\bshe does\b/.test(t)) return 'yes';
  return undefined;
}

function parseContact(text: string): Slots['contact'] | undefined {
  const t = text.toLowerCase();
  if (/email|e-mail/.test(t)) return 'email';
  if (/text|sms|message/.test(t)) return 'sms';
  if (/phone|call|ring/.test(t)) return 'phone';
  return undefined;
}

function detectRedFlags(text: string): string[] {
  const { redFlags } = assessUrgency({
    subject: '', description: text, symptoms: [], severity: 1, duration: '', type: 'clinical',
  });
  return redFlags.filter((f) => f.present).map((f) => f.flag);
}

const sentence = (s: string) => s.trim().replace(/^./, (c) => c.toUpperCase());

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------
export const EMERGENCY_ADVICE =
  'What you have described could be serious. Please hang up and call 999 now, or go to the nearest emergency department. I am not able to book you in or route this call any further. A clinician will be told about this call.';

function routeFor(type: RequestType, urgency: Urgency): string {
  if (type === 'medication') return 'Prescription request: nurse or clinical pharmacist to review';
  if (type === 'admin') return 'Admin request: care navigator to action';
  return {
    emergency: 'Clinician to call now. Advise 999 if symptoms are happening right now',
    urgent: 'Same-day GP call-back',
    soon: 'GP appointment within 1-2 weeks',
    routine: 'Routine appointment with nurse or GP',
  }[urgency];
}

function buildRequest(slots: Slots, extraText = ''): RequestInput {
  const reason = slots.reason ?? extraText ?? 'Phone enquiry';
  const symptoms = slots.symptoms;
  return {
    patientId: slots.patientId!,
    channel: 'receptionist_ai',
    type: slots.type ?? 'clinical',
    subject: sentence(reason.length > 70 ? `${reason.slice(0, 67)}...` : reason).replace(/\.$/, ''),
    description:
      `${sentence(reason)}` + (symptoms.length ? ` Symptoms: ${symptoms.join('; ')}.` : '') +
      (slots.redFlagAnswer === 'no' ? ' Caller denied red-flag symptoms.' : '') + ' (Captured by simulated AI receptionist.)',
    symptoms,
    duration: slots.duration ?? 'Not asked',
    severity: slots.severity ?? 1,
    preferredContact: slots.contact ?? 'phone',
    availability: 'Not asked on call',
  };
}

function finish(state: ReceptionistState, redFlags: string[] = []): Turn {
  const request = buildRequest(state.slots);
  const { urgency } = assessUrgency(request);
  const route = routeFor(request.type, urgency);
  const outcome: CallOutcome = { kind: 'completed', request, route, urgency, redFlags };
  const first = state.slots.patientName?.split(' ')[0] ?? 'there';
  return {
    state: { ...state, stage: 'done', outcome },
    ended: true,
    reply:
      `Thank you, ${first}. I have passed this to the practice team as a ${urgency} request and a member of staff will review it and contact you by ${request.preferredContact === 'sms' ? 'text message' : request.preferredContact}. ` +
      'If things get worse, please call 111, or 999 in an emergency. Goodbye.',
  };
}

function redFlagEnd(state: ReceptionistState, flags: string[], text: string): Turn {
  const slots: Slots = { ...state.slots, reason: state.slots.reason ?? text, type: 'clinical' };
  const request = slots.patientId
    ? { ...buildRequest(slots), description: `RED FLAG on call: ${flags.join(', ')}. Caller said: "${text}" (Captured by simulated AI receptionist.)`, symptoms: [...slots.symptoms, ...flags] }
    : undefined;
  return {
    state: {
      ...state, slots, stage: 'done',
      outcome: { kind: 'red_flag', request, route: routeFor('clinical', 'emergency'), urgency: 'emergency', redFlags: flags },
    },
    ended: true,
    reply: EMERGENCY_ADVICE,
  };
}

// ---------------------------------------------------------------------------
// The turn function
// ---------------------------------------------------------------------------
const NEXT_AFTER_REASON: Record<RequestType, Stage> = { clinical: 'symptoms', medication: 'contact', admin: 'contact' };

const QUESTIONS: Record<Exclude<Stage, 'name' | 'done'>, (s: Slots) => string> = {
  dob: () => 'Thank you. To check it is you, what is your date of birth, please? (For a child, the child\'s date of birth.)',
  reason: (s) => `Thank you${s.patientName ? `, ${s.patientName.split(' ')[0]}` : ''}, that matches. How can we help today?`,
  symptoms: () => 'I am sorry to hear that. What symptoms are you having?',
  duration: () => 'How long has this been going on?',
  severity: () => 'On a scale of 1 to 10, how bad is it, where 10 is the worst?',
  redflags: () => 'Is there any chest pain, trouble breathing, face drooping, slurred speech, heavy bleeding, or thoughts of harming yourself?',
  contact: () => 'How would you like us to get back to you: phone, text message or email?',
};

/** Pure: given the current state and what the caller said, returns the new state and the AI's next line. */
export function nextTurn(state: ReceptionistState, callerText: string): Turn {
  const text = callerText.trim();
  if (state.stage === 'done') return { state, reply: 'This call has ended.', ended: true };
  if (!text) return { state, reply: "Sorry, I didn't catch that. Could you say that again?", ended: false };

  // Red-flag safety net: runs on every caller turn, before anything else.
  const flags = detectRedFlags(text);
  if (flags.length) return redFlagEnd(state, flags, text);

  const retry = (reply: string): Turn => {
    const failedAttempts = state.failedAttempts + 1;
    if (failedAttempts >= 3 && (state.stage === 'name' || state.stage === 'dob')) {
      return {
        ended: true,
        state: {
          ...state, failedAttempts, stage: 'done',
          outcome: {
            kind: 'unverified', route: 'Could not verify caller. Ask them to call back or visit reception', urgency: 'routine', redFlags: [],
          },
        },
        reply: 'I am sorry, I could not verify your details. Please call back or ask at reception. Goodbye.',
      };
    }
    return { state: { ...state, failedAttempts }, reply, ended: false };
  };
  const advance = (stage: Stage, slots: Slots): Turn => ({
    state: { ...state, stage, slots, failedAttempts: 0 },
    reply: QUESTIONS[stage as Exclude<Stage, 'name' | 'done'>](slots),
    ended: false,
  });

  const s = state.slots;
  switch (state.stage) {
    case 'name': {
      const p = findPatient(text, state.directory);
      if (!p) return retry("I'm sorry, I couldn't find that name. Could you give me the patient's first and last name?");
      return advance('dob', { ...s, patientId: p.id, patientName: p.name });
    }
    case 'dob': {
      const p = state.directory.find((d) => d.id === s.patientId)!;
      const dob = parseDob(text);
      if (dob !== p.dob) return retry("That doesn't match our records. Could you say the date of birth again, for example 5 March 1980?");
      return advance('reason', { ...s, dobVerified: true });
    }
    case 'reason': {
      const type = classifyReason(text);
      return advance(NEXT_AFTER_REASON[type], { ...s, reason: text, type });
    }
    case 'symptoms':
      return advance('duration', { ...s, symptoms: text.split(/,|;|\band\b/i).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean) });
    case 'duration':
      return advance('severity', { ...s, duration: text.replace(/\.$/, '') });
    case 'severity': {
      const severity = parseSeverity(text);
      if (!severity) return retry('Sorry, could you give me a number between 1 and 10?');
      return advance('redflags', { ...s, severity });
    }
    case 'redflags': {
      const answer = parseYesNo(text);
      if (!answer) return retry('Sorry, I need a yes or no. Is there any chest pain, trouble breathing, face drooping, slurred speech, heavy bleeding or thoughts of self-harm?');
      if (answer === 'yes') return redFlagEnd(state, ['Caller answered yes to red-flag screening'], text);
      return advance('contact', { ...s, redFlagAnswer: 'no' });
    }
    case 'contact': {
      const contact = parseContact(text);
      if (!contact) return retry('Sorry, would you prefer a phone call, a text message or an email?');
      return finish({ ...state, slots: { ...s, contact } });
    }
  }
}
