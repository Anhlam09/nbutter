import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { CheckCircle2, FlaskConical, Lock, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, StatCard, Table, TBody, TD, TH, THead, TR,
} from '@/components/ui';
import { CATEGORY_LABEL, runSecuritySuite, type SecurityCategory, type SuiteResult } from '@/security/evaluation';
import { actorLabel } from '@/pages/patients/helpers';
import { fmtDateTime } from '@/lib/format';

/** Protections and the test category that proves each one. Status comes ONLY from the latest test run. */
const PROTECTIONS: { title: string; how: string; category: SecurityCategory }[] = [
  { title: 'Untrusted content is data, never instructions', how: 'Requests, documents and calls are cleaned. Instruction-like text (including disguised spellings) is flagged for people. Wording can’t lower triage urgency or change any permission.', category: 'prompt_injection' },
  { title: 'Clinical decisions need a clinician', how: 'Approving notes or coding, editing notes, referrals, lowering urgency and closing urgent requests need a GP or nurse (coding and notes: GP only). Automations need a manager or GP. Enforced in the data layer, not just the buttons.', category: 'permissions' },
  { title: 'Secrets never stored or logged', how: 'Keys, tokens, passwords and other secret-looking strings are redacted in every saved text field and in the audit log.', category: 'secrets' },
  { title: 'Fictional data only', how: 'Real-looking NHS numbers (checksum-verified), emails, UK mobiles and card numbers are refused wherever people type, and removed from incoming documents and calls.', category: 'pii' },
  { title: 'Resource limits and safe automations', how: 'Text, symptoms, audit log and automation size are capped; statuses and options must be known values; automations use allow-listed actions and can never complete clinical tasks.', category: 'limits' },
  { title: 'Human approval for record changes', how: 'Simulated AI drafts only. Nothing reaches a record until an authorised person approves it.', category: 'human_approval' },
  { title: 'No code execution', how: 'No feature generates or runs code. The build check confirms there is no eval or raw-HTML rendering.', category: 'code_execution' },
];

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function SecurityLab() {
  const [result, setResult] = useState<SuiteResult | null>(null);
  const [filter, setFilter] = useState<'all' | 'failed'>('all');
  const [activities, staff, documents, notes, requests] = useStore(
    useShallow((s) => [s.activities, s.staff, s.documents, s.notes, s.requests]),
  );

  // The suite is fast (~25 ms) and runs on a throwaway copy of the demo data, so run it on open.
  useEffect(() => setResult(runSecuritySuite()), []);

  const security = useMemo(() => activities.filter((a) => a.kind.startsWith('security.')), [activities]);
  const live = useMemo(() => {
    const decisions = documents.flatMap((d) => d.extraction?.suggestions ?? []).filter((s) => s.decision !== 'pending').length;
    return {
      blocked: security.filter((a) => a.kind === 'security.blocked').length,
      flagged: security.filter((a) => a.kind === 'security.flagged').length,
      errors: security.filter((a) => a.kind === 'security.error').length,
      humanDecisions: decisions + notes.filter((n) => n.status === 'approved').length,
      escalations: requests.filter((r) => r.urgency === 'emergency').length,
    };
  }, [security, documents, notes, requests]);

  const m = useMemo(() => {
    if (!result) return null;
    const of = (c: SecurityCategory) => result.cases.filter((x) => x.category === c);
    const attacks = of('permissions').filter((x) => x.attack);
    const legit = of('permissions').filter((x) => !x.attack);
    const leaks = of('secrets').filter((x) => !x.passed).length;
    return {
      injection: result.byCategory.prompt_injection,
      attacksBlocked: attacks.filter((x) => x.passed).length,
      attacks: attacks.length,
      legitAllowed: legit.filter((x) => x.passed).length,
      legit: legit.length,
      leaks,
      secretTests: of('secrets').length,
      totalPassed: result.cases.filter((x) => x.passed).length,
      total: result.cases.length,
    };
  }, [result]);

  const rows = (result?.cases ?? []).filter((c) => filter === 'all' || !c.passed);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Lab"
        description="Synthetic security and AI-safety tests run against a throwaway copy of the fictional demo data. No real credentials or patient data are used."
        actions={
          <Button iconLeft={<FlaskConical className="h-4 w-4" aria-hidden="true" />} onClick={() => setResult(runSecuritySuite())}>
            Run tests again
          </Button>
        }
      />

      {m && (
        <div role="status" aria-live="polite" className={`flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm ${m.totalPassed === m.total ? 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100' : 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100'}`}>
          {m.totalPassed === m.total ? <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" /> : <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />}
          <p>
            <strong>{m.totalPassed} of {m.total} security tests passed</strong>
            {result && <> · last run {fmtDateTime(result.ranAt)}</>}
            {m.totalPassed !== m.total && ' · protections with failing tests are marked “Not verified” below.'}
          </p>
        </div>
      )}

      {m && (
        <section aria-labelledby="metrics-h">
          <h2 id="metrics-h" className="sr-only">Security metrics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Prompt-injection resistance" value={`${pct(m.injection.passed, m.injection.total)}%`} hint={`${m.injection.passed}/${m.injection.total} cases passed, incl. 1 false-positive check`} />
            <StatCard label="Permission violations blocked" value={`${m.attacksBlocked}/${m.attacks}`} hint={`Legitimate actions still allowed: ${m.legitAllowed}/${m.legit}`} />
            <StatCard label="Secret exposures" value={String(m.leaks)} hint={`Synthetic canary key planted in ${m.secretTests} places`} deltaTone={m.leaks ? 'bad' : 'good'} />
            <StatCard label="Unsafe code execution paths" value="0" hint="No feature generates or runs code (verified by build check)" />
            <StatCard label="Human decisions recorded" value={String(live.humanDecisions)} hint="Approvals or rejections of AI drafts in your current demo data" />
            <StatCard label="Blocked actions (live)" value={String(live.blocked)} hint={`${live.flagged} flagged inputs · ${live.errors} errors · ${live.escalations} emergency escalations`} />
          </div>
        </section>
      )}

      <Card>
        <CardHeader title="Protections" description="A protection shows as verified only when every one of its tests passed in the latest run." />
        <CardBody>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {PROTECTIONS.map((p) => {
              const c = result?.byCategory[p.category];
              const ok = !!c && c.total > 0 && c.passed === c.total;
              return (
                <li key={p.category} className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink-900 dark:text-ink-100">{p.title}</p>
                    {c && (ok
                      ? <Badge tone="green"><CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden="true" />Verified {c.passed}/{c.total}</Badge>
                      : <Badge tone="red"><XCircle className="mr-1 inline h-3 w-3" aria-hidden="true" />Not verified {c.passed}/{c.total}</Badge>)}
                  </div>
                  <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{p.how}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-sm text-ink-600 dark:text-ink-400">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Also in place, and verified by automated build and browser tests rather than this page: a Content Security Policy that
            blocks connections to any other server, and cross-tab syncing so two open tabs can’t overwrite each other’s changes.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Test results"
          description="Each case: what a safe system must do, and what actually happened."
          actions={
            <div className="flex gap-1" role="group" aria-label="Filter results">
              <Button size="sm" variant={filter === 'all' ? 'secondary' : 'ghost'} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</Button>
              <Button size="sm" variant={filter === 'failed' ? 'secondary' : 'ghost'} aria-pressed={filter === 'failed'} onClick={() => setFilter('failed')}>Failed only</Button>
            </div>
          }
        />
        {rows.length === 0 ? (
          <CardBody><EmptyState icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />} title="No failing tests" description="Every security test passed in the latest run." /></CardBody>
        ) : (
          <Table>
            <THead>
              <TR><TH>Test</TH><TH>Area</TH><TH>Expected</TH><TH>Observed</TH><TH>Result</TH></TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD><span className="font-mono text-xs text-ink-500">{c.id}</span><div className="font-medium">{c.name}</div></TD>
                  <TD className="whitespace-nowrap text-sm">{CATEGORY_LABEL[c.category]}</TD>
                  <TD className="text-sm">{c.expected}</TD>
                  <TD className="max-w-xs text-sm text-ink-600 dark:text-ink-400">{c.observed}</TD>
                  <TD>{c.passed ? <Badge tone="green">Pass</Badge> : <Badge tone="red">Fail</Badge>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Security audit log (live)"
          description="Blocked actions, flagged inputs and errors from your current demo session. Secrets are redacted before anything is logged."
          actions={<Link to="/activity" className="text-sm font-medium text-brand-800 underline dark:text-brand-300">Full activity log</Link>}
        />
        {security.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
              title="No security events yet"
              description="Try one: switch the top-bar user to Sam Reid (Receptionist) and approve a note in Scribe, or type “ignore previous instructions” into Patient intake."
            />
          </CardBody>
        ) : (
          <Table>
            <THead><TR><TH>When</TH><TH>Type</TH><TH>Actor</TH><TH>What happened</TH></TR></THead>
            <TBody>
              {security.slice(0, 50).map((a) => (
                <TR key={a.id}>
                  <TD className="whitespace-nowrap text-sm">{fmtDateTime(a.at)}</TD>
                  <TD>
                    <Badge tone={a.kind === 'security.blocked' ? 'red' : a.kind === 'security.flagged' ? 'amber' : 'neutral'}>
                      {a.kind === 'security.blocked' ? 'Blocked' : a.kind === 'security.flagged' ? 'Flagged input' : 'Error'}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-sm">{actorLabel(a.actor, staff)}</TD>
                  <TD className="text-sm">{a.message}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
