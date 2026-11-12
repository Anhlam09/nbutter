/**
 * The app-wide store (Zustand) with localStorage persistence.
 * Data-changing logic lives in ./core.ts as pure functions; this file only wires them up,
 * fills in "who is acting" and "what time is it", and turns errors into friendly results.
 */
import { create } from 'zustand';
import { BRAND } from '@/brand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CallSession, ClinicalDocument, Decision, DemoState, ReferralStatus, RequestStatus, Soap, Urgency, AutomationRule, ActorId } from '@/types';
import * as core from './core';
import type { CoreData, Ctx } from './core';

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

export interface UiState {
  currentStaffId: string;
  theme: 'light' | 'dark';
  demo: DemoState;
  /** id of an entity to visually highlight (used by the guided demo) */
  highlight: string | null;
}

export interface Actions {
  // UI
  setCurrentStaff(id: string): void;
  toggleTheme(): void;
  setHighlight(id: string | null): void;
  resetDemo(): void;
  /** Opens the guided demo panel (intro screen). Does not change data. */
  startDemo(): void;
  /** Resets data to the seed and begins the guided journey at step 1. */
  beginDemo(): void;
  setDemo(patch: Partial<DemoState>): void;
  exitDemo(): void;
  // Requests
  /** `asPatient` = submitted by the patient (intake form). Internal actors like 'automation' can't be passed in. */
  createRequest(input: core.RequestInput, asPatient?: 'patient'): Result<string>;
  openRequest(id: string): Result;
  summarizeRequest(id: string): Result;
  assignRequest(id: string, staffId: string): Result;
  setRequestStatus(id: string, status: RequestStatus): Result;
  setRequestUrgency(id: string, urgency: Urgency): Result;
  // Appointments
  bookAppointment(input: core.AppointmentInput): Result<string>;
  completeAppointment(id: string): Result;
  cancelAppointment(id: string): Result;
  // Documents
  receiveDocument(doc: ClinicalDocument): Result;
  processDocument(id: string): Result;
  decideSuggestion(docId: string, suggestionId: string, decision: Decision, editedText?: string): Result;
  approveAllSuggestions(docId: string): Result;
  fileDocument(id: string): Result;
  rejectDocument(id: string, reason?: string): Result;
  // Scribe
  generateNote(transcriptId: string): Result<string>;
  updateNote(id: string, soap: Soap): Result;
  approveNote(id: string): Result;
  discardNote(id: string): Result;
  // Tasks & referrals
  addTask(input: core.TaskInput): Result<string>;
  completeTask(id: string): Result;
  reopenTask(id: string): Result;
  createReferral(input: core.ReferralInput): Result<string>;
  setReferralStatus(id: string, status: ReferralStatus): Result;
  // Automations
  upsertAutomation(rule: Omit<AutomationRule, 'id' | 'runCount'> & { id?: string }): Result<string>;
  toggleAutomation(id: string): Result;
  deleteAutomation(id: string): Result;
  // Receptionist
  saveCall(call: CallSession): Result;
  newId(prefix: string): string;
}

export type StoreState = CoreData & UiState & Actions;

/** Event name dispatched when the browser refuses to save (e.g. storage quota full). */
export const STORAGE_ERROR_EVENT = 'app:storage-error';

/** localStorage that never throws: a full quota shows a warning instead of crashing or silently failing. */
const safeLocalStorage: Storage = {
  get length() { return localStorage.length; },
  key: (i) => localStorage.key(i),
  clear: () => localStorage.clear(),
  removeItem: (k) => localStorage.removeItem(k),
  getItem: (k) => {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: e instanceof Error ? e.message : String(e) }));
    }
  },
};

export const DEFAULT_STAFF_ID = 's-shah';
const emptyDemo = (): DemoState => ({ active: false, step: 0, completed: false, refs: {} });

const initialUi = (): Omit<UiState, 'theme'> => ({
  currentStaffId: DEFAULT_STAFF_ID, demo: emptyDemo(), highlight: null,
});

function preferredTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      const ctx = (actor?: ActorId): Ctx => ({ now: new Date(), actor: actor ?? get().currentStaffId });

      /** Failed actions are never silent: blocked attempts and errors go to the audit log. */
      function fail(name: string, e: unknown, actor?: ActorId): { ok: false; error: string } {
        const error = e instanceof Error ? e.message : String(e);
        const blocked = e instanceof core.PermissionError || e instanceof core.SafetyError;
        const who = actor ?? get().currentStaffId;
        const whoName = get().staff.find((x) => x.id === who)?.name ?? String(who);
        try {
          set(pickData(core.recordSecurityEvent(
            pickData(get()), blocked ? 'security.blocked' : 'security.error',
            `${blocked ? 'Blocked' : 'Failed'}: ${name} by ${whoName}. ${error}`, ctx(actor),
          )));
        } catch { /* logging must never break the app */ }
        return { ok: false, error };
      }

      /** Run a pure transition that returns new data. */
      function run(name: string, fn: (s: CoreData, c: Ctx) => CoreData, actor?: ActorId): Result {
        try {
          const input = pickData(get());
          const next = fn(input, ctx(actor));
          if (next !== input) set(pickData(next));
          return { ok: true, value: undefined };
        } catch (e) {
          return fail(name, e, actor);
        }
      }
      /** Run a pure transition that returns [new data, created id]. */
      function runId(name: string, fn: (s: CoreData, c: Ctx) => [CoreData, string], actor?: ActorId): Result<string> {
        try {
          const input = pickData(get());
          const [next, id] = fn(input, ctx(actor));
          if (next !== input) set(pickData(next));
          return { ok: true, value: id };
        } catch (e) {
          return fail(name, e, actor);
        }
      }

      return {
        ...core.createInitialData(),
        ...initialUi(),
        theme: preferredTheme(),

        setCurrentStaff: (id) => set({ currentStaffId: id }),
        toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
        setHighlight: (id) => set({ highlight: id }),
        resetDemo: () => set({ ...core.createInitialData(), ...initialUi() }),
        startDemo: () => {
          const { demo } = get();
          // Re-open an in-progress demo; otherwise show the intro screen.
          set({ demo: demo.refs.started && !demo.completed ? { ...demo, active: true } : { ...emptyDemo(), active: true } });
        },
        beginDemo: () =>
          set({ ...core.createInitialData(), ...initialUi(), demo: { ...emptyDemo(), active: true, refs: { started: '1' } } }),
        setDemo: (patch) => set({ demo: { ...get().demo, ...patch } }),
        exitDemo: () => set({ demo: { ...get().demo, active: false }, highlight: null }),

        createRequest: (input, asPatient) =>
          runId('create request', (s, c) => core.createRequest(s, input, c), asPatient === 'patient' ? 'patient' : undefined),
        openRequest: (id) => run('open request', (s, c) => core.openRequest(s, id, c)),
        summarizeRequest: (id) => run('summarize request', (s, c) => core.summarizeRequestAction(s, id, c)),
        assignRequest: (id, staffId) => run('assign request', (s, c) => core.assignRequest(s, id, staffId, c)),
        setRequestStatus: (id, status) => run('set request status', (s, c) => core.setRequestStatus(s, id, status, c)),
        setRequestUrgency: (id, urgency) => run('set request urgency', (s, c) => core.setRequestUrgency(s, id, urgency, c)),

        bookAppointment: (input) => runId('book appointment', (s, c) => core.bookAppointment(s, input, c)),
        completeAppointment: (id) => run('complete appointment', (s, c) => core.completeAppointment(s, id, c)),
        cancelAppointment: (id) => run('cancel appointment', (s, c) => core.cancelAppointment(s, id, c)),

        receiveDocument: (doc) => run('receive document', (s, c) => core.receiveDocument(s, doc, c)),
        processDocument: (id) => run('process document', (s, c) => core.processDocument(s, id, c)),
        decideSuggestion: (docId, sid, decision, editedText) =>
          run('decide suggestion', (s, c) => core.decideSuggestion(s, docId, sid, decision, c, editedText)),
        approveAllSuggestions: (docId) => run('approve all suggestions', (s, c) => core.approveAllSuggestions(s, docId, c)),
        fileDocument: (id) => run('file document', (s, c) => core.fileDocument(s, id, c)),
        rejectDocument: (id, reason) => run('reject document', (s, c) => core.rejectDocument(s, id, c, reason)),

        generateNote: (transcriptId) => runId('generate note', (s, c) => core.generateNote(s, transcriptId, c)),
        updateNote: (id, soap) => run('update note', (s, c) => core.updateNote(s, id, soap, c)),
        approveNote: (id) => run('approve note', (s, c) => core.approveNote(s, id, c)),
        discardNote: (id) => run('discard note', (s, c) => core.discardNote(s, id, c)),

        addTask: (input) => runId('add task', (s, c) => core.addTask(s, input, c)),
        completeTask: (id) => run('complete task', (s, c) => core.completeTask(s, id, c)),
        reopenTask: (id) => run('reopen task', (s, c) => core.reopenTask(s, id, c)),
        createReferral: (input) => runId('create referral', (s, c) => core.createReferral(s, input, c)),
        setReferralStatus: (id, status) => run('set referral status', (s, c) => core.setReferralStatus(s, id, status, c)),

        upsertAutomation: (rule) => runId('upsert automation', (s, c) => core.upsertAutomation(s, rule, c)),
        toggleAutomation: (id) => run('toggle automation', (s, c) => core.toggleAutomation(s, id, c)),
        deleteAutomation: (id) => run('delete automation', (s, c) => core.deleteAutomation(s, id, c)),

        saveCall: (call) => run('save call', (s, c) => core.saveCall(s, call, c)),
        newId: (prefix) => {
          const [next, id] = core.newId(pickData(get()), prefix);
          set({ seq: next.seq });
          return id;
        },
      };
    },
    {
      name: BRAND.storageKey,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ ...pickData(s), currentStaffId: s.currentStaffId, theme: s.theme, demo: s.demo }),
      // Unknown/old versions: start fresh rather than risk a broken shape.
      migrate: () => ({ ...core.createInitialData(), ...initialUi() }) as unknown as StoreState,
    },
  ),
);

const DATA_KEYS = [
  'staff', 'patients', 'requests', 'appointments', 'documents', 'transcripts', 'notes', 'tasks', 'referrals',
  'activities', 'automations', 'calls', 'seq',
] as const satisfies readonly (keyof CoreData)[];

function pickData(s: CoreData): CoreData {
  const out = {} as Record<string, unknown>;
  for (const k of DATA_KEYS) out[k] = s[k];
  return out as unknown as CoreData;
}

/**
 * Concurrency control across browser tabs: when another tab saves, reload its data here
 * instead of later overwriting it with stale state ("last write wins" data loss).
 */
export function enableCrossTabSync(): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === BRAND.storageKey && e.newValue) void useStore.persist.rehydrate();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
enableCrossTabSync();

/** Convenience: the staff member currently "logged in" via the role switcher. */
export const useCurrentStaff = () =>
  useStore((s) => s.staff.find((x) => x.id === s.currentStaffId) ?? s.staff[0]);
