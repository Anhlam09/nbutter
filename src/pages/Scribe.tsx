import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileAudio, NotebookPen } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store/useStore';
import { fmtDateTime } from '@/lib/format';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, useToast } from '@/components/ui';
import { staffNameOf, useHighlight } from './patients/helpers';
import { NoteEditor } from './scribe/NoteEditor';

function ListButton({ id, selected, onClick, children }: { id: string; selected: boolean; onClick: () => void; children: React.ReactNode }) {
  const highlighted = useHighlight(id);
  return (
    <li>
      <button
        type="button"
        data-entity-id={id}
        aria-current={selected ? 'true' : undefined}
        onClick={onClick}
        className={`w-full rounded-xl border p-3 text-left text-sm transition-colors ${
          selected ? 'border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/60'
        } ${highlighted ? 'ring-2 ring-brand-400' : ''}`}
      >
        {children}
      </button>
    </li>
  );
}

export default function Scribe() {
  const [params, setParams] = useSearchParams();
  const [transcripts, notes, patients, staff] = useStore(useShallow((s) => [s.transcripts, s.notes, s.patients, s.staff]));
  const generateNote = useStore((s) => s.generateNote);
  const { toast } = useToast();

  const noteId = params.get('note');
  const note = notes.find((n) => n.id === noteId);
  const transcriptParam = params.get('transcript');
  const transcript = transcripts.find((t) => t.id === (note?.transcriptId ?? transcriptParam));
  const existingDraft = transcript ? notes.find((n) => n.transcriptId === transcript.id && n.status === 'draft') : undefined;

  const pName = (id: string) => patients.find((p) => p.id === id)?.name ?? 'Unknown patient';
  const sortedNotes = useMemo(() => [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [notes]);
  const sortedTranscripts = useMemo(() => [...transcripts].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)), [transcripts]);

  const generate = () => {
    if (!transcript) return;
    const r = generateNote(transcript.id);
    if (!r.ok) { toast({ title: 'Could not generate note', description: r.error, tone: 'red' }); return; }
    setParams({ note: r.value }, { replace: true });
    toast({ title: existingDraft ? 'Opened existing draft' : 'Draft SOAP note generated', description: 'Review and edit before approving.', tone: 'ai' });
  };

  return (
    <div>
      <PageHeader title="Scribe" description="Turn a consultation transcript into a draft SOAP note, then review, edit and approve it." />
      <details className="mb-4 rounded-2xl bg-white shadow-card p-4 text-sm ring-1 ring-ink-900/[0.03] dark:bg-ink-900 dark:ring-white/[0.06]" open>
        <summary className="cursor-pointer font-semibold text-ink-900 dark:text-ink-50">How this works</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-700 dark:text-ink-300">
          <li>Simulated AI drafts a note by matching keywords in the transcript. It is not a real AI.</li>
          <li>The clinician reads the draft and edits anything that is wrong or missing.</li>
          <li>Only a GP can approve it. Approved notes are saved to the patient record and locked.</li>
        </ol>
      </details>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside aria-label="Transcripts and notes" className="space-y-5">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink-900 dark:text-ink-50">Transcripts</h2>
            <ul className="space-y-2">
              {sortedTranscripts.map((t) => (
                <ListButton key={t.id} id={t.id} selected={transcript?.id === t.id && !note} onClick={() => setParams({ transcript: t.id }, { replace: true })}>
                  <span className="flex items-center gap-1.5 font-medium text-ink-900 dark:text-ink-100"><FileAudio className="h-4 w-4" aria-hidden="true" />{pName(t.patientId)}</span>
                  <span className="mt-0.5 block text-xs text-ink-600 dark:text-ink-400">{t.title}</span>
                  <span className="block text-xs text-ink-600 dark:text-ink-400">{staffNameOf(staff, t.clinicianId)} · {fmtDateTime(t.recordedAt)}</span>
                </ListButton>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink-900 dark:text-ink-50">Notes</h2>
            {sortedNotes.length === 0 ? <p className="text-sm text-ink-600 dark:text-ink-400">No notes yet.</p> : (
              <ul className="space-y-2">
                {sortedNotes.map((n) => (
                  <ListButton key={n.id} id={n.id} selected={note?.id === n.id} onClick={() => setParams({ note: n.id }, { replace: true })}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-medium text-ink-900 dark:text-ink-100"><NotebookPen className="h-4 w-4" aria-hidden="true" />{pName(n.patientId)}</span>
                      <Badge tone={n.status === 'draft' ? 'amber' : 'green'}>{n.status === 'draft' ? 'Draft' : 'Approved'}</Badge>
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-600 dark:text-ink-400">{fmtDateTime(n.createdAt)}</span>
                  </ListButton>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <div className="min-w-0 space-y-4">
          {!transcript && !note && (
            <Card><EmptyState icon={<FileAudio className="h-6 w-6" />} title="Choose a transcript or note" description="Pick a transcript on the left to generate a draft, or open an existing note." /></Card>
          )}
          {transcript && (
            <Card>
              <CardHeader
                title={transcript.title}
                description={`${pName(transcript.patientId)} · ${staffNameOf(staff, transcript.clinicianId)} · ${fmtDateTime(transcript.recordedAt)}`}
                actions={
                  !note || note.status === 'draft' ? (
                    <Button variant="ai" onClick={generate}>{existingDraft ? 'Open SOAP draft' : 'Generate SOAP note'}</Button>
                  ) : undefined
                }
              />
              <CardBody>
                <ol aria-label="Transcript" className="max-h-96 space-y-3 overflow-y-auto">
                  {transcript.lines.map((l, i) => {
                    const clin = l.speaker === 'clinician';
                    return (
                      <li key={i} className={`flex ${clin ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${clin ? 'bg-brand-50 text-ink-900 dark:bg-brand-950/50 dark:text-ink-100' : 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-100'}`}>
                          <span className="block text-xs font-semibold text-ink-700 dark:text-ink-300">{clin ? 'Clinician' : 'Patient'}</span>
                          {l.text}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </CardBody>
            </Card>
          )}
          {note && <NoteEditor key={note.id} note={note} onGone={() => setParams({}, { replace: true })} />}
        </div>
      </div>
    </div>
  );
}
