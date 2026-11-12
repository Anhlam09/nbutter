/**
 * The 12-step guided journey for the fictional patient Jamie Morgan.
 * Each step performs a REAL store action (so data visibly changes) and then tells the UI
 * where to navigate and what to highlight. Steps are run strictly in order.
 */
import type { StoreState, Result } from '@/store/useStore';
import { DEMO_DOC_ID, DEMO_TRANSCRIPT_ID, JAMIE_ID, jamieLabReport, jamieRequestInput } from '@/data/fixtures';

export interface StepOutcome {
  refs?: Record<string, string>;
  highlight?: string | null;
  route: string;
}

export interface DemoStep {
  title: string;
  /** Why this step matters, in plain language */
  explanation: string;
  /** What you should look for on screen after the step runs */
  whatChanged: string;
  /** Staff member the demo acts as (role switcher updates visibly). 'patient' = patient-facing step. */
  actingAs: string | 'patient';
  run(s: StoreState, refs: Record<string, string>): StepOutcome;
}

class StepError extends Error {}
function ok<T>(r: Result<T>): T {
  if (!r.ok) throw new StepError(r.error);
  return r.value;
}
function need(refs: Record<string, string>, key: string): string {
  const v = refs[key];
  if (!v) throw new StepError(`Missing "${key}" from an earlier step. Restart the demo.`);
  return v;
}

function tomorrowAt(h: number, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const DEMO_STEPS: DemoStep[] = [
  {
    title: 'Jamie submits an online request',
    explanation: 'Jamie fills in the clinic’s online form: six weeks of tiredness and breathlessness on the stairs. It is not an emergency.',
    whatChanged: 'A new request from Jamie Morgan appears at the top of the dashboard table with status “New”.',
    actingAs: 'patient',
    run: (s) => {
      const id = ok(s.createRequest(jamieRequestInput, 'patient'));
      return { refs: { request: id }, highlight: id, route: '/' };
    },
  },
  {
    title: 'The request enters the triage queue',
    explanation: 'Sam, the care navigator, opens the request. The clinic’s response clock stops: the first response time is recorded.',
    whatChanged: 'Status changes from “New” to “In review” in the triage queue, and an activity entry is logged.',
    actingAs: 's-reid',
    run: (s, refs) => {
      const id = need(refs, 'request');
      ok(s.openRequest(id));
      return { highlight: id, route: '/triage' };
    },
  },
  {
    title: 'Simulated AI drafts a structured summary',
    explanation: 'The (simulated) AI reads the request and Jamie’s history, checks for red flags, and suggests an urgency and route. It only suggests; it decides nothing.',
    whatChanged: 'A violet “Simulated AI” panel appears with a summary, key points, a red-flag checklist, and a suggested route.',
    actingAs: 's-reid',
    run: (s, refs) => {
      const id = need(refs, 'request');
      ok(s.summarizeRequest(id));
      return { highlight: id, route: `/triage/${id}` };
    },
  },
  {
    title: 'A team member reviews and assigns it',
    explanation: 'Sam agrees with the suggested urgency and assigns the request to Jamie’s registered GP, Dr Priya Shah.',
    whatChanged: 'Status becomes “Assigned” and Dr Priya Shah appears as the assignee.',
    actingAs: 's-reid',
    run: (s, refs) => {
      const id = need(refs, 'request');
      const req = s.requests.find((r) => r.id === id);
      if (req?.aiSummary && req.aiSummary.suggestedUrgency !== req.urgency) ok(s.setRequestUrgency(id, req.aiSummary.suggestedUrgency));
      ok(s.assignRequest(id, 's-shah'));
      return { highlight: id, route: `/triage/${id}` };
    },
  },
  {
    title: 'An appointment is scheduled',
    explanation: 'Sam books Jamie a face-to-face appointment with Dr Shah tomorrow at 09:00. An automation queues a (simulated) confirmation text.',
    whatChanged: 'The request becomes “Scheduled”, the appointment shows on the request, and the automation run is logged.',
    actingAs: 's-reid',
    run: (s, refs) => {
      const id = need(refs, 'request');
      const appt = ok(s.bookAppointment({
        patientId: JAMIE_ID, staffId: 's-shah', requestId: id, start: tomorrowAt(9), durationMins: 15,
        mode: 'in_person', reason: 'Tiredness and breathlessness: review with blood results',
      }));
      return { refs: { appointment: appt }, highlight: id, route: `/triage/${id}` };
    },
  },
  {
    title: 'A lab report arrives',
    explanation: 'Before the appointment, Jamie’s blood test results arrive from the (fictional) pathology lab into the document inbox.',
    whatChanged: '“Full blood count and iron studies” for Jamie appears in the Documents inbox.',
    actingAs: 's-shah',
    run: (s) => {
      ok(s.receiveDocument(jamieLabReport(new Date())));
      return { highlight: DEMO_DOC_ID, route: `/documents?doc=${DEMO_DOC_ID}` };
    },
  },
  {
    title: 'Simulated AI extracts the key information',
    explanation: 'The simulated AI pulls out the results, flags the abnormal ones, and suggests follow-up tasks, a medication, and placeholder coding.',
    whatChanged: 'Low haemoglobin, MCV and ferritin are flagged, and a list of suggestions awaits a decision.',
    actingAs: 's-shah',
    run: (s) => {
      ok(s.processDocument(DEMO_DOC_ID));
      return { highlight: DEMO_DOC_ID, route: `/documents?doc=${DEMO_DOC_ID}` };
    },
  },
  {
    title: 'Dr Shah approves follow-up actions',
    explanation: 'Coding and medication changes need a GP, so the demo now acts as Dr Shah, who approves the suggestions and files the report.',
    whatChanged: 'The document is “Filed”. Jamie’s record gains a problem, a medication, and tasks. An automation adds “Send results letter to patient”.',
    actingAs: 's-shah',
    run: (s) => {
      ok(s.approveAllSuggestions(DEMO_DOC_ID));
      ok(s.fileDocument(DEMO_DOC_ID));
      return { highlight: DEMO_DOC_ID, route: `/documents?doc=${DEMO_DOC_ID}` };
    },
  },
  {
    title: 'The consultation transcript becomes a draft note',
    explanation: 'At the appointment, the conversation is captured as a (fictional) transcript. The simulated AI scribe drafts a SOAP note from it.',
    whatChanged: 'An editable draft with Subjective, Objective, Assessment and Plan sections appears, labelled as simulated AI.',
    actingAs: 's-shah',
    run: (s) => {
      const noteId = ok(s.generateNote(DEMO_TRANSCRIPT_ID));
      return { refs: { note: noteId }, highlight: noteId, route: `/scribe?note=${noteId}` };
    },
  },
  {
    title: 'The clinician approves the note',
    explanation: 'Only a GP can approve a consultation note. Dr Shah reviews the draft and approves it. You can also edit it yourself before this step.',
    whatChanged: 'The note becomes read-only and “Approved”, with who approved it and when.',
    actingAs: 's-shah',
    run: (s, refs) => {
      const noteId = need(refs, 'note');
      ok(s.approveNote(noteId));
      return { highlight: noteId, route: `/scribe?note=${noteId}` };
    },
  },
  {
    title: 'Jamie’s record is updated',
    explanation: 'The appointment is marked complete, which also completes Jamie’s original request. Everything now lives in one patient record.',
    whatChanged: 'Jamie’s timeline shows every step, from request to note, with who (or what) did each one.',
    actingAs: 's-shah',
    run: (s, refs) => {
      ok(s.completeAppointment(need(refs, 'appointment')));
      return { highlight: null, route: `/patients/${JAMIE_ID}?tab=timeline` };
    },
  },
  {
    title: 'Follow-up tasks close and analytics update',
    explanation: 'Sam, the care navigator, sends the results letter that the automation created in step 8 (simulated, nothing is really sent) and closes the task. The analytics recalculate automatically from the same data.',
    whatChanged: 'The results-letter task is done, and analytics include Jamie’s completed request, filed document and approved AI-drafted note.',
    actingAs: 's-reid',
    run: (s) => {
      const task = s.tasks.find((t) => t.patientId === JAMIE_ID && t.status === 'open' && /results letter/i.test(t.title));
      if (!task) throw new StepError('The results-letter task was not found. Restart the demo.');
      ok(s.completeTask(task.id));
      return { highlight: null, route: '/analytics' };
    },
  },
];

/**
 * Runs the next step against the store. Returns the outcome, or an error message.
 * `get` must return the LATEST store state (actions inside a step read fresh state through it).
 */
export function runNextStep(get: () => StoreState): { ok: true; outcome: StepOutcome } | { ok: false; error: string } {
  const s = get();
  const index = s.demo.step;
  const step = DEMO_STEPS[index];
  if (!step) return { ok: false, error: 'The demo is already complete.' };
  try {
    if (step.actingAs !== 'patient') s.setCurrentStaff(step.actingAs);
    const outcome = step.run(get(), s.demo.refs);
    const refs = { ...get().demo.refs, ...outcome.refs };
    get().setDemo({ step: index + 1, refs, completed: index + 1 === DEMO_STEPS.length });
    get().setHighlight(outcome.highlight ?? null);
    return { ok: true, outcome };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
