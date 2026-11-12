import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert } from 'lucide-react';
import { useCurrentStaff, useStore } from '@/store/useStore';
import { can, denyReason } from '@/lib/permissions';
import { fmtDateTime } from '@/lib/format';
import { AiPanel, ApprovalGate, Badge, Button, Card, CardBody, CardHeader, Field, Modal, Textarea, useToast } from '@/components/ui';
import type { ConsultationNote, Soap } from '@/types';
import { staffNameOf, useHighlight } from '../patients/helpers';

const SECTIONS: { key: keyof Soap; label: string }[] = [
  { key: 'subjective', label: 'Subjective' },
  { key: 'objective', label: 'Objective' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'plan', label: 'Plan' },
];

export function NoteEditor({ note, onGone }: { note: ConsultationNote; onGone: () => void }) {
  const staff = useCurrentStaff();
  const allStaff = useStore((s) => s.staff);
  const updateNote = useStore((s) => s.updateNote);
  const approveNote = useStore((s) => s.approveNote);
  const discardNote = useStore((s) => s.discardNote);
  const { toast } = useToast();
  const highlighted = useHighlight(note.id);
  const [soap, setSoap] = useState<Soap>(note.soap);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = SECTIONS.some((s) => soap[s.key] !== note.soap[s.key]);
  const canApprove = can(staff, 'approveNote');
  const ring = highlighted ? 'ring-2 ring-ai-500' : '';

  const save = (): boolean => {
    const r = updateNote(note.id, soap);
    if (!r.ok) toast({ title: 'Could not save edits', description: r.error, tone: 'red' });
    return r.ok;
  };
  const onSave = () => {
    if (save()) toast({ title: 'Edits saved', description: 'The note is still a draft.', tone: 'green' });
  };
  const onApprove = () => {
    if (dirty && !save()) return;
    const r = approveNote(note.id);
    if (!r.ok) toast({ title: 'Could not approve note', description: r.error, tone: 'red' });
    else toast({ title: 'Note approved and saved to record', tone: 'green' });
  };
  const onDiscard = () => {
    const r = discardNote(note.id);
    setConfirmDiscard(false);
    if (!r.ok) { toast({ title: 'Could not discard draft', description: r.error, tone: 'red' }); return; }
    toast({ title: 'Draft discarded', tone: 'amber' });
    onGone();
  };

  if (note.status === 'approved') {
    return (
      <Card data-entity-id={note.id} className={ring}>
        <CardHeader title="Approved consultation note" actions={<Badge tone="green">Approved, read-only</Badge>} />
        <CardBody className="space-y-4">
          <p className="text-sm text-ink-600 dark:text-ink-400">
            {note.ai ? 'Drafted by Simulated AI' : `Written by ${staffNameOf(allStaff, note.authorId)}`}
            {note.edited ? ', edited by clinician' : ''} · approved by {staffNameOf(allStaff, note.approvedBy)} on {fmtDateTime(note.approvedAt)}
          </p>
          <dl className="space-y-3 text-sm">
            {SECTIONS.map((s) => (
              <div key={s.key}>
                <dt className="font-semibold text-ink-900 dark:text-ink-100">{s.label}</dt>
                <dd className="whitespace-pre-wrap text-ink-700 dark:text-ink-300">{note.soap[s.key]}</dd>
              </div>
            ))}
          </dl>
          <Link to={`/patients/${note.patientId}?tab=notes`} className="inline-block text-sm font-medium text-brand-800 underline dark:text-brand-300">
            View in patient record (Notes tab)
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <div data-entity-id={note.id} className={`rounded-2xl ${ring}`}>
      <AiPanel title="Draft SOAP note (Simulated AI)" confidence={note.ai?.confidence} generatedAt={note.ai?.generatedAt}>
        <p className="mb-3 text-sm">This is a draft. Check and edit each section, then approve to save it to the patient record.</p>
        <div className="space-y-3">
          {SECTIONS.map((s) => (
            <Field key={s.key} label={s.label}>
              <Textarea rows={4} value={soap[s.key]} onChange={(e) => setSoap({ ...soap, [s.key]: e.target.value })} />
            </Field>
          ))}
        </div>
        {dirty && (
          <p role="status" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Unsaved edits
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={!dirty} onClick={onSave}>Save edits</Button>
          <ApprovalGate allowed={canApprove} reason={denyReason('approveNote')}>
            <Button disabled={!canApprove} onClick={onApprove}>Approve &amp; save to record</Button>
          </ApprovalGate>
          <Button variant="ghost" onClick={() => setConfirmDiscard(true)}>Discard draft</Button>
        </div>
      </AiPanel>
      <Modal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this draft?"
        description="The simulated AI draft and any edits will be deleted. You can generate a new one from the transcript."
        footer={<><Button variant="secondary" onClick={() => setConfirmDiscard(false)}>Keep draft</Button><Button variant="danger" onClick={onDiscard}>Discard draft</Button></>}
      />
    </div>
  );
}
