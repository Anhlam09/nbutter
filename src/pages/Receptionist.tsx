import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, Phone, PhoneCall, PhoneOff, Play, Send, ShieldAlert, User } from 'lucide-react';
import clsx from 'clsx';
import {
  AiPanel, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Table, TBody, TD, TH,
  THead, TR, UrgencyBadge, useToast,
} from '@/components/ui';
import { useStore } from '@/store/useStore';
import { fmtDateTime, fmtDuration } from '@/lib/format';
import type { CallMessage, CallSession } from '@/types';
import {
  SCENARIOS, nextTurn, startCall, type ReceptionistState, type Scenario,
} from '@/ai/receptionist';
import { useHighlight } from '@/pages/receptionist/useHighlight';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

interface Live {
  scenario: Scenario;
  callId: string;
  startedAt: string;
  state: ReceptionistState;
  messages: CallMessage[];
  scriptIndex: number;
  endedAt?: string;
  savedRequestId?: string;
  saved?: boolean;
}

export default function Receptionist() {
  const patients = useStore((s) => s.patients);
  const calls = useStore((s) => s.calls);
  const newId = useStore((s) => s.newId);
  const createRequest = useStore((s) => s.createRequest);
  const saveCall = useStore((s) => s.saveCall);
  const { toast } = useToast();
  const highlight = useHighlight();

  const [live, setLive] = useState<Live | null>(null);
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const logRef = useRef<HTMLDivElement>(null);

  const ended = !!live?.endedAt;
  useEffect(() => {
    if (!live || ended) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live, ended]);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [live?.messages.length]);

  const patientName = (id?: string) => patients.find((p) => p.id === id)?.name ?? 'Unknown caller';

  const begin = (scenario: Scenario) => {
    const { state, reply } = startCall(patients);
    const at = new Date().toISOString();
    setNow(Date.now());
    setDraft('');
    setLive({
      scenario, callId: newId('call'), startedAt: at, state, scriptIndex: 0,
      messages: [{ from: 'system', text: 'Simulated call connected', at }, { from: 'ai', text: reply, at }],
    });
  };

  const say = (text: string, scripted: boolean) => {
    if (!live || ended || !text.trim()) return;
    const turn = nextTurn(live.state, text);
    const at = new Date().toISOString();
    const messages: CallMessage[] = [...live.messages, { from: 'caller', text: text.trim(), at }, { from: 'ai', text: turn.reply, at }];
    if (turn.ended) messages.push({ from: 'system', text: 'Call ended', at });
    setLive({
      ...live, state: turn.state, messages,
      scriptIndex: live.scriptIndex + (scripted ? 1 : 0),
      endedAt: turn.ended ? at : undefined,
    });
    setDraft('');
  };

  const hangUp = () => {
    if (!live || ended) return;
    const at = new Date().toISOString();
    setLive({
      ...live, endedAt: at,
      messages: [...live.messages, { from: 'system', text: 'Caller hung up before finishing', at }],
    });
  };

  const outcome = live?.state.outcome;

  const persist = (requestId?: string) => {
    if (!live || !live.endedAt) return;
    const session: CallSession = {
      id: live.callId, scenarioId: live.scenario.id, patientId: live.state.slots.patientId ?? undefined,
      startedAt: live.startedAt, endedAt: live.endedAt, messages: live.messages,
      outcome: outcome ? { requestId, route: outcome.route, urgency: outcome.urgency } : undefined,
    };
    const r = saveCall(session);
    if (!r.ok) {
      toast({ title: 'Could not save call', description: r.error, tone: 'red' });
      return false;
    }
    setLive({ ...live, saved: true, savedRequestId: requestId });
    return true;
  };

  const create = () => {
    if (!outcome?.request) return;
    // Carry the screening urgency so a red-flag call can never be stored as less urgent.
    const r = createRequest({ ...outcome.request, urgency: outcome.urgency });
    if (!r.ok) {
      toast({ title: 'Could not create request', description: r.error, tone: 'red' });
      return;
    }
    if (persist(r.value)) toast({ title: 'Request created', description: 'It is now in the triage queue for staff review.', tone: 'green' });
  };

  const elapsed = live ? Math.max(0, Math.round(((live.endedAt ? new Date(live.endedAt).getTime() : now) - new Date(live.startedAt).getTime()) / 1000)) : 0;
  const sortedCalls = useMemo(() => [...calls].sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [calls]);

  return (
    <div>
      <PageHeader
        title="AI receptionist (simulated)"
        description="Practise how an automated phone receptionist could take a call. Callers are scripted or typed by you. There is no real voice or AI, and nothing reaches the clinical record without staff review."
      />

      {!live && (
        <section aria-labelledby="scn" className="mb-8">
          <h2 id="scn" className="mb-3 text-base font-semibold text-ink-900 dark:text-ink-50">Choose a caller</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SCENARIOS.map((s) => (
              <Card key={s.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" aria-hidden="true">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink-900 dark:text-ink-50">{s.title}</h3>
                    <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-400">{s.summary}</p>
                  </div>
                </div>
                <div className="mt-4 flex-1" />
                <Button onClick={() => begin(s)} iconLeft={<PhoneCall className="h-4 w-4" aria-hidden="true" />}>
                  Start simulated call
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {live && (
        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="flex min-h-[28rem] flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-3 dark:border-ink-800">
              <div className="flex items-center gap-3">
                <span className={clsx('flex h-9 w-9 items-center justify-center rounded-full', ended ? 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400' : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300')} aria-hidden="true">
                  {ended ? <PhoneOff className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
                </span>
                <div>
                  <p className="font-semibold text-ink-900 dark:text-ink-50">{live.scenario.title}</p>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    <Badge tone="ai">Simulated call</Badge>{' '}
                    <span role="timer" aria-label="Call duration" className="ml-1 tabular-nums">{mmss(elapsed)}</span>
                    {ended && <span className="ml-1">(ended)</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!ended && <Button variant="danger" size="sm" onClick={hangUp} iconLeft={<PhoneOff className="h-3.5 w-3.5" aria-hidden="true" />}>Hang up</Button>}
                <Button variant="secondary" size="sm" onClick={() => setLive(null)}>{ended ? 'Close call' : 'Cancel call'}</Button>
              </div>
            </div>

            <div ref={logRef} role="log" aria-label="Call transcript" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-5" style={{ maxHeight: '28rem' }}>
              {live.messages.map((m, i) =>
                m.from === 'system' ? (
                  <p key={i} className="text-center text-xs text-ink-600 dark:text-ink-400">{m.text}</p>
                ) : (
                  <div key={i} className={clsx('flex', m.from === 'caller' ? 'justify-start' : 'justify-end')}>
                    <div className={clsx('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm', m.from === 'caller'
                      ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-100'
                      : 'bg-ai-50 text-ai-950 ring-1 ring-inset ring-ai-200 dark:bg-ai-950/40 dark:text-ai-100 dark:ring-ai-800')}>
                      <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-ink-600 dark:text-ink-400">
                        {m.from === 'caller' ? <User className="h-3 w-3" aria-hidden="true" /> : <Bot className="h-3 w-3" aria-hidden="true" />}
                        {m.from === 'caller' ? 'Caller' : 'AI receptionist (simulated)'}
                      </p>
                      {m.text}
                    </div>
                  </div>
                ),
              )}
            </div>

            {!ended && (
              <form
                className="flex flex-col gap-3 border-t border-ink-200 p-4 dark:border-ink-800 sm:flex-row sm:items-end"
                onSubmit={(e) => { e.preventDefault(); say(draft, false); }}
              >
                <Button
                  variant="secondary" onClick={() => say(live.scenario.callerLines[live.scriptIndex], true)}
                  disabled={live.scriptIndex >= live.scenario.callerLines.length}
                  iconLeft={<Play className="h-4 w-4" aria-hidden="true" />}
                >
                  Play next caller line
                </Button>
                <Field label="Or type the caller's reply" className="flex-1">
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type what the caller says" />
                </Field>
                <Button type="submit" disabled={!draft.trim()} iconLeft={<Send className="h-4 w-4" aria-hidden="true" />}>Send</Button>
              </form>
            )}
          </Card>

          <div className="space-y-4">
            <AiPanel title="Captured so far">
              <Slots state={live.state} patientName={patientName(live.state.slots.patientId)} />
            </AiPanel>
          </div>
        </div>
      )}

      {live && ended && (
        <Card className="mb-8">
          <CardHeader title="Proposed outcome: staff review needed" description="The simulated AI can only propose. A staff member decides what happens next." />
          <CardBody className="space-y-4">
            {outcome?.kind === 'red_flag' && (
              <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-900 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Red flag detected ({outcome.redFlags.join(', ')}). The caller was told to call 999. Routing stopped. A clinician should review this straight away.</span>
              </div>
            )}
            {outcome ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-ink-600 dark:text-ink-400">Proposed route</dt><dd className="font-medium">{outcome.route}</dd></div>
                <div><dt className="text-ink-600 dark:text-ink-400">Urgency</dt><dd><UrgencyBadge urgency={outcome.urgency} /></dd></div>
                {outcome.request && (
                  <>
                    <div><dt className="text-ink-600 dark:text-ink-400">Patient</dt><dd className="font-medium">{patientName(outcome.request.patientId)}</dd></div>
                    <div><dt className="text-ink-600 dark:text-ink-400">Subject</dt><dd className="font-medium">{outcome.request.subject}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-ink-600 dark:text-ink-400">Description</dt><dd>{outcome.request.description}</dd></div>
                  </>
                )}
              </dl>
            ) : (
              <p className="text-sm text-ink-700 dark:text-ink-300">The caller hung up before the call finished, so there is no proposed request. You can still log the call.</p>
            )}
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800">
              Nothing is placed in the clinical record by the AI. Creating a request only adds it to the triage queue, where a clinician reviews it.
            </p>
            {live.saved ? (
              <p className="flex flex-wrap items-center gap-3 text-sm font-medium text-green-800 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Call saved.
                {live.savedRequestId && <Link className="text-brand-800 underline dark:text-brand-300" to={`/triage/${live.savedRequestId}`}>Open request in triage</Link>}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {outcome?.request && <Button onClick={create}>Create request</Button>}
                <Button variant="secondary" onClick={() => { if (persist()) toast({ title: 'Call saved without a request', tone: 'neutral' }); }}>
                  Save call only
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Recent calls" description="Saved simulated calls." />
        {sortedCalls.length === 0 ? (
          <EmptyState icon={<Phone className="h-5 w-5" />} title="No calls yet" description="Run a simulated call above and save it to see it here." />
        ) : (
          <Table>
            <THead><tr><TH>When</TH><TH>Caller</TH><TH>Scenario</TH><TH>Length</TH><TH>Outcome</TH></tr></THead>
            <TBody>
              {sortedCalls.map((c) => (
                <TR key={c.id} data-entity-id={c.id} highlighted={highlight === c.id}>
                  <TD>{fmtDateTime(c.startedAt)}</TD>
                  <TD>{c.patientId ? <Link className="text-brand-800 underline dark:text-brand-300" to={`/patients/${c.patientId}`}>{patientName(c.patientId)}</Link> : 'Unverified'}</TD>
                  <TD>{SCENARIOS.find((s) => s.id === c.scenarioId)?.title ?? c.scenarioId}</TD>
                  <TD>{c.endedAt ? fmtDuration(Math.max(1, Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 60000))) : '—'}</TD>
                  <TD>
                    {c.outcome ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <UrgencyBadge urgency={c.outcome.urgency} />
                        <span>{c.outcome.route}</span>
                        {c.outcome.requestId && <Link className="text-brand-800 underline dark:text-brand-300" to={`/triage/${c.outcome.requestId}`}>Request</Link>}
                      </span>
                    ) : 'No outcome'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function Slots({ state, patientName }: { state: ReceptionistState; patientName: string }) {
  const s = state.slots;
  const rows: [string, string | undefined][] = [
    ['Patient', s.patientId ? patientName : undefined],
    ['Date of birth check', s.dobVerified ? 'Matched' : undefined],
    ['Reason', s.reason],
    ['Request type', s.type],
    ['Symptoms', s.symptoms.length ? s.symptoms.join('; ') : undefined],
    ['Duration', s.duration],
    ['Severity', s.severity !== undefined ? `${s.severity}/10` : undefined],
    ['Red-flag screen', s.redFlagAnswer === 'no' ? 'Denied' : state.outcome?.kind === 'red_flag' ? 'RED FLAG' : undefined],
    ['Contact preference', s.contact],
  ];
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <dt className="text-ink-600 dark:text-ink-400">{k}</dt>
          <dd className={clsx('text-right font-medium', !v && 'text-ink-500 dark:text-ink-400')}>{v ?? 'Not yet captured'}</dd>
        </div>
      ))}
    </dl>
  );
}
