import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Activity, FileText, FlaskConical, Inbox, Mail } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCurrentStaff, useStore } from '@/store/useStore';
import { can, denyReason } from '@/lib/permissions';
import { documentKindLabel, fmtDateTime, relativeTime } from '@/lib/format';
import {
  AiPanel, ApprovalGate, Badge, Button, Card, CardBody, CardHeader, DecisionBadge, EmptyState, Modal, PageHeader,
  Table, TBody, TD, TH, THead, Tabs, useToast, type BadgeTone,
} from '@/components/ui';
import type { ClinicalDocument, DocumentKind, DocumentStatus, Suggestion, SuggestionKind } from '@/types';
import { staffNameOf, useHighlight } from './patients/helpers';
import { SuggestionItem, permissionFor } from './documents/SuggestionItem';
import { SecurityFlagsNotice } from '@/components/security/SecurityFlagsNotice';

type Filter = 'review' | 'filed' | 'rejected';
const filterOf = (s: DocumentStatus): Filter => (s === 'inbox' || s === 'review' ? 'review' : s);

const statusInfo: Record<DocumentStatus, { tone: BadgeTone; label: string }> = {
  inbox: { tone: 'brand', label: 'In inbox' },
  review: { tone: 'ai', label: 'Awaiting review' },
  filed: { tone: 'green', label: 'Filed' },
  rejected: { tone: 'red', label: 'Rejected' },
};
const kindIcon: Record<DocumentKind, typeof FileText> = { discharge_summary: FileText, referral_letter: Mail, lab_report: FlaskConical };
const groups: { kind: SuggestionKind; label: string }[] = [
  { kind: 'task', label: 'Tasks' },
  { kind: 'coding', label: 'Clinical coding' },
  { kind: 'medication', label: 'Medications' },
  { kind: 'problem', label: 'Problems' },
];
const flagInfo = { high: { tone: 'red', label: 'High' }, low: { tone: 'amber', label: 'Low' }, abnormal: { tone: 'orange', label: 'Abnormal' } } as const;

function InboxItem({ doc, selected, patientName, onSelect }: { doc: ClinicalDocument; selected: boolean; patientName: string; onSelect: () => void }) {
  const highlighted = useHighlight(doc.id);
  const Icon = kindIcon[doc.kind];
  const st = statusInfo[doc.status];
  return (
    <li>
      <button
        type="button"
        data-entity-id={doc.id}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className={`w-full rounded-xl border p-3 text-left transition-colors ${
          selected ? 'border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/60'
        } ${highlighted ? 'ring-2 ring-brand-400' : ''}`}
      >
        <span className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-600 dark:text-ink-400" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink-900 dark:text-ink-100">{doc.title}</span>
            <span className="block text-xs text-ink-600 dark:text-ink-400">{patientName} · {doc.source}</span>
            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-600 dark:text-ink-400">
              <Badge tone={st.tone}>{st.label}</Badge>
              <span>{relativeTime(doc.receivedAt)}</span>
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

export default function Documents() {
  const [params, setParams] = useSearchParams();
  const docId = params.get('doc');
  const [documents, patients, allStaff] = useStore(useShallow((s) => [s.documents, s.patients, s.staff]));
  const staff = useCurrentStaff();
  const processDocument = useStore((s) => s.processDocument);
  const approveAll = useStore((s) => s.approveAllSuggestions);
  const decide = useStore((s) => s.decideSuggestion);
  const fileDocument = useStore((s) => s.fileDocument);
  const rejectDocument = useStore((s) => s.rejectDocument);
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('review');
  const [confirmReject, setConfirmReject] = useState(false);

  const selectedDoc = documents.find((d) => d.id === docId);
  useEffect(() => {
    if (selectedDoc) setFilter(filterOf(selectedDoc.status));
  }, [selectedDoc?.id, selectedDoc?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    review: documents.filter((d) => filterOf(d.status) === 'review').length,
    filed: documents.filter((d) => d.status === 'filed').length,
    rejected: documents.filter((d) => d.status === 'rejected').length,
  }), [documents]);
  const list = useMemo(
    () => documents.filter((d) => filterOf(d.status) === filter).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    [documents, filter],
  );
  const patientOf = (id: string) => patients.find((p) => p.id === id);

  const select = (id: string) => setParams({ doc: id }, { replace: true });
  const doc = selectedDoc;
  const patient = doc ? patientOf(doc.patientId) : undefined;
  const suggestions: Suggestion[] = doc?.extraction?.suggestions ?? [];
  const pending = suggestions.filter((s) => s.decision === 'pending');
  const approvable = pending.filter((s) => can(staff, permissionFor(s)));

  const onProcess = () => {
    if (!doc) return;
    const r = processDocument(doc.id);
    if (!r.ok) toast({ title: 'Could not process document', description: r.error, tone: 'red' });
    else toast({ title: 'Simulated AI extraction ready', description: 'Review each suggestion before filing.', tone: 'ai' });
  };
  const onApproveAll = () => {
    if (!doc) return;
    let failed: string | null = null;
    let n = 0;
    if (approvable.length === pending.length) {
      const r = approveAll(doc.id);
      if (!r.ok) failed = r.error; else n = pending.length;
    } else {
      for (const s of approvable) {
        const r = decide(doc.id, s.id, 'approved');
        if (!r.ok) { failed = r.error; break; }
        n++;
      }
    }
    if (failed) toast({ title: 'Could not approve all', description: failed, tone: 'red' });
    else toast({ title: `Approved ${n} suggestion${n === 1 ? '' : 's'}`, description: pending.length > n ? `${pending.length - n} need a user with different permissions.` : undefined, tone: 'green' });
  };
  const onFile = () => {
    if (!doc) return;
    const r = fileDocument(doc.id);
    if (!r.ok) toast({ title: 'Could not file document', description: r.error, tone: 'red' });
    else toast({ title: 'Filed to patient record', description: doc.title, tone: 'green' });
  };
  const onReject = () => {
    if (!doc) return;
    const r = rejectDocument(doc.id);
    setConfirmReject(false);
    if (!r.ok) toast({ title: 'Could not reject document', description: r.error, tone: 'red' });
    else toast({ title: 'Document rejected', description: doc.title, tone: 'amber' });
  };

  const canAct = can(staff, 'approveDocumentActions');

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Incoming clinical documents. Simulated AI extracts facts and suggests actions; a clinician reviews each suggestion before anything is filed to the record."
      />
      <div className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)_27rem]">
        {/* Left: inbox */}
        <section aria-label="Document inbox">
          <Tabs
            label="Document status filter"
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            items={[
              { value: 'review', label: 'To review', count: counts.review },
              { value: 'filed', label: 'Filed', count: counts.filed },
              { value: 'rejected', label: 'Rejected', count: counts.rejected },
            ]}
          />
          {list.length === 0 ? (
            <Card className="mt-3"><EmptyState icon={<Inbox className="h-6 w-6" />} title="Nothing here" description="No documents in this list." /></Card>
          ) : (
            <ul className="mt-3 space-y-2">
              {list.map((d) => (
                <InboxItem key={d.id} doc={d} selected={d.id === docId} patientName={patientOf(d.patientId)?.name ?? 'Unknown patient'} onSelect={() => select(d.id)} />
              ))}
            </ul>
          )}
        </section>

        {!doc ? (
          <Card className="xl:col-span-2">
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Select a document" description="Choose a document from the list to read it and review the simulated AI extraction." />
          </Card>
        ) : (
          <>
            {/* Middle: original */}
            <section aria-label="Original document" className="min-w-0">
              <Card>
                <CardHeader
                  title={doc.title}
                  description={`${documentKindLabel(doc.kind)} · from ${doc.source} · received ${fmtDateTime(doc.receivedAt)}`}
                />
                <CardBody className="space-y-3">
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    Matched to:{' '}
                    {patient ? (
                      <Link to={`/patients/${patient.id}`} className="font-medium text-brand-800 underline dark:text-brand-300">
                        {patient.name} · NHS {patient.nhsNumber}
                      </Link>
                    ) : 'No patient match'}
                  </p>
                  <SecurityFlagsNotice flags={doc.securityFlags} />
                  <pre tabIndex={0} aria-label="Original document text" className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl bg-ink-50 p-3 font-mono text-xs leading-relaxed text-ink-800 dark:bg-ink-950 dark:text-ink-200">
                    {doc.body}
                  </pre>
                </CardBody>
              </Card>
            </section>

            {/* Right: workflow */}
            <section aria-label="Review and filing" className="min-w-0 space-y-4">
              {doc.status === 'inbox' && (
                <Card>
                  <CardBody>
                    <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Step 1: extract</h2>
                    <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
                      Simulated AI will read this document, pull out key facts, and suggest tasks, codes and medicine changes. Nothing is saved to the record yet.
                    </p>
                    <Button variant="ai" className="mt-3" onClick={onProcess}>Process with Simulated AI</Button>
                  </CardBody>
                </Card>
              )}

              {doc.status === 'review' && doc.extraction && (
                <>
                  <AiPanel confidence={doc.extraction.confidence} generatedAt={doc.extraction.generatedAt}>
                    <h4 className="text-sm font-semibold">Summary</h4>
                    <p className="mt-1">{doc.extraction.summary}</p>
                    {doc.extraction.fields.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold">Extracted fields</h4>
                        <Table className="mt-1 min-w-0">
                          <THead><tr><TH>Field</TH><TH>Value</TH><TH>Flag</TH></tr></THead>
                          <TBody>
                            {doc.extraction.fields.map((f) => (
                              <tr key={f.label}>
                                <TD className="py-2">{f.label}</TD>
                                <TD className="py-2">{f.value}</TD>
                                <TD className="py-2">{f.flag ? <Badge tone={flagInfo[f.flag].tone}>{flagInfo[f.flag].label}</Badge> : <span className="text-ink-600 dark:text-ink-400">Normal</span>}</TD>
                              </tr>
                            ))}
                          </TBody>
                        </Table>
                      </div>
                    )}
                  </AiPanel>

                  <Card>
                    <CardHeader
                      title="Suggested actions"
                      description="Approve, edit or reject each one. Nothing changes the record until you file."
                      actions={
                        <ApprovalGate allowed={approvable.length > 0 || pending.length === 0} reason={denyReason('approveDocumentActions')}>
                          <Button size="sm" variant="secondary" disabled={approvable.length === 0} onClick={onApproveAll}>
                            Approve all I&apos;m allowed to{approvable.length > 0 ? ` (${approvable.length})` : ''}
                          </Button>
                        </ApprovalGate>
                      }
                    />
                    <CardBody className="space-y-4">
                      {suggestions.length === 0 && <p className="text-sm text-ink-600 dark:text-ink-400">No suggestions were made.</p>}
                      {groups.map((g) => {
                        const items = suggestions.filter((s) => s.kind === g.kind);
                        if (!items.length) return null;
                        return (
                          <div key={g.kind}>
                            <h3 className="mb-2 text-sm font-semibold text-ink-900 dark:text-ink-50">{g.label}</h3>
                            <ul className="space-y-2">{items.map((s) => <SuggestionItem key={s.id} docId={doc.id} s={s} />)}</ul>
                          </div>
                        );
                      })}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody className="space-y-3">
                      <p role="status" className="text-sm text-ink-700 dark:text-ink-300">
                        {pending.length === 0
                          ? 'All suggestions have a decision. You can file this document.'
                          : `${pending.length} suggestion${pending.length === 1 ? '' : 's'} still need${pending.length === 1 ? 's' : ''} a decision.`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <ApprovalGate allowed={canAct} reason={denyReason('approveDocumentActions')}>
                          <Button disabled={pending.length > 0 || !canAct} onClick={onFile}>File to patient record</Button>
                        </ApprovalGate>
                        <ApprovalGate allowed={canAct} reason={denyReason('approveDocumentActions')}>
                          <Button variant="danger" disabled={!canAct} onClick={() => setConfirmReject(true)}>Reject document</Button>
                        </ApprovalGate>
                      </div>
                    </CardBody>
                  </Card>
                </>
              )}

              {doc.status === 'filed' && (
                <Card>
                  <CardHeader title="Filed to record" description={`Filed by ${staffNameOf(allStaff, doc.filedBy)} on ${fmtDateTime(doc.filedAt)}`} />
                  <CardBody className="space-y-3">
                    {doc.extraction ? (
                      <>
                        <p className="text-sm text-ink-700 dark:text-ink-300">{doc.extraction.summary}</p>
                        <ul className="space-y-2">
                          {doc.extraction.suggestions.map((s) => (
                            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 p-2 text-sm dark:border-ink-700">
                              <span>{s.editedText ?? s.text}</span>
                              <DecisionBadge decision={s.decision} />
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : <p className="text-sm text-ink-600 dark:text-ink-400">Filed without AI extraction.</p>}
                    {patient && (
                      <Link to={`/patients/${patient.id}?tab=documents`} className="inline-block text-sm font-medium text-brand-800 underline dark:text-brand-300">
                        Open {patient.name}&apos;s record
                      </Link>
                    )}
                  </CardBody>
                </Card>
              )}

              {doc.status === 'rejected' && (
                <Card>
                  <CardBody>
                    <div className="flex items-center gap-2"><Activity className="h-4 w-4" aria-hidden="true" /><Badge tone="red">Rejected</Badge></div>
                    <p className="mt-2 text-sm text-ink-700 dark:text-ink-300">This document was rejected and nothing was added to the patient record.</p>
                  </CardBody>
                </Card>
              )}
            </section>
          </>
        )}
      </div>

      <Modal
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        title="Reject this document?"
        description="It will be removed from the review list and nothing will be added to the patient record."
        footer={<><Button variant="secondary" onClick={() => setConfirmReject(false)}>Keep document</Button><Button variant="danger" onClick={onReject}>Reject document</Button></>}
      >
        {doc?.title}
      </Modal>
    </div>
  );
}
