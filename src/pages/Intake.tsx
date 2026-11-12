import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Plus, UserRound, Wand2 } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import { PII_LABEL, detectRealPii } from '@/security/guards';
import { assessUrgency } from '@/ai/simulated';
import {
  Button, Card, CardBody, Field, Input, Modal, PageHeader, Select, Textarea, useToast,
} from '@/components/ui';
import type { PatientRequest, RequestType } from '@/types';

const COMMON_SYMPTOMS = ['Headache', 'Cough', 'Fever', 'Fatigue', 'Nausea', 'Dizziness', 'Rash', 'Sore throat', 'Back pain', 'Low mood'];
type Contact = PatientRequest['preferredContact'];

interface Errors { subject?: string; description?: string; duration?: string; availability?: string }

export default function Intake() {
  const patients = useStore((s) => s.patients);
  const createRequest = useStore((s) => s.createRequest);
  const { toast } = useToast();

  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [type, setType] = useState<RequestType>('clinical');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState(3);
  const [contact, setContact] = useState<Contact>('phone');
  const [availability, setAvailability] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [confirm999, setConfirm999] = useState<string[] | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const patient = patients.find((p) => p.id === patientId);
  const chipList = useMemo(() => [...COMMON_SYMPTOMS, ...symptoms.filter((s) => !COMMON_SYMPTOMS.includes(s))], [symptoms]);

  const toggle = (s: string) => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    if (!symptoms.some((s) => s.toLowerCase() === v.toLowerCase())) setSymptoms((c) => [...c, v]);
    setCustom('');
  };

  const fillExample = () => {
    setType('clinical');
    setSubject('Ongoing headaches and tiredness');
    setDescription('I have had a dull headache most afternoons and I feel tired all the time. Paracetamol helps a little. I am still able to work.');
    setSymptoms(['Headache', 'Fatigue']);
    setDuration('3 weeks');
    setSeverity(4);
    setContact(patient?.flags.some((f) => /phone/i.test(f)) ? 'phone' : 'sms');
    setAvailability('Weekday mornings, not Tuesdays');
    setErrors({});
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (subject.trim().length < 5) e.subject = 'Please enter a short subject (at least 5 characters).';
    if (description.trim().length < 15) e.description = 'Please describe the problem in a little more detail (at least 15 characters).';
    if (type === 'clinical' && !duration.trim()) e.duration = 'Tell us how long this has been going on, for example "3 days".';
    if (!availability.trim()) e.availability = 'Let us know when you are usually available.';
    // Privacy guard: this demo must only ever hold fictional data.
    const pii = detectRealPii([subject, description, availability, ...symptoms].join('\n'));
    if (pii.length) {
      e.description =
        `This looks like real personal information (${[...new Set(pii.map((h) => PII_LABEL[h.kind]))].join(', ')}). ` +
        'This demo only accepts fictional details. Please remove it.';
    }
    return e;
  };

  const doSubmit = () => {
    const res = createRequest(
      {
        patientId, channel: 'online', type, subject: subject.trim(), description: description.trim(), symptoms,
        duration: duration.trim() || 'Not applicable', severity, preferredContact: contact, availability: availability.trim(),
      },
      'patient',
    );
    if (!res.ok) {
      toast({ title: 'Could not send request', description: res.error, tone: 'red' });
      return;
    }
    setConfirm999(null);
    setSubmittedId(res.value);
    toast({ title: 'Request sent', description: 'The practice has received your request.', tone: 'green' });
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const { urgency, redFlags } = assessUrgency({
      subject, description, symptoms, severity, duration, type,
    });
    if (urgency === 'emergency') setConfirm999(redFlags.filter((f) => f.present).map((f) => f.flag));
    else doSubmit();
  };

  const reset = () => {
    setSubject(''); setDescription(''); setSymptoms([]); setDuration(''); setSeverity(3); setAvailability('');
    setErrors({}); setSubmittedId(null);
  };

  const banner = (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
      <UserRound className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p>
        <strong>Patient view.</strong> This is what a patient sees when sending an online request. Staff see it in the triage queue. Use fictional details only: real names, NHS numbers, emails or phone numbers will be refused.
      </p>
    </div>
  );

  if (submittedId) {
    return (
      <div className="mx-auto max-w-2xl">
        {banner}
        <Card>
          <CardBody className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-700 dark:text-green-400" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-semibold text-ink-900 dark:text-ink-50">Request received</h1>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
              Thank you{patient ? `, ${patient.name.split(' ')[0]}` : ''}. A member of the practice team will review it and contact you by {contact === 'sms' ? 'text message' : contact}.
            </p>
            <p className="mt-4 text-sm text-ink-600 dark:text-ink-400">Your reference number</p>
            <p className="mt-1 font-mono text-xl font-semibold tracking-wider text-ink-900 dark:text-ink-50">REQ-{submittedId.toUpperCase()}</p>
            <p className="mx-auto mt-4 max-w-md text-sm text-ink-600 dark:text-ink-400">
              If your symptoms get worse, call the practice. In an emergency, call 999.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to={`/triage/${submittedId}`}
                className="inline-flex h-10 items-center rounded-xl bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800 dark:bg-brand-600"
              >
                View in triage dashboard
              </Link>
              <Button variant="secondary" onClick={reset}>Send another request</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {banner}
      <PageHeader
        title="Contact your GP practice"
        description="Tell us what you need and we will get back to you. Fields marked * are required."
        actions={
          <Button variant="secondary" iconLeft={<Wand2 className="h-4 w-4" aria-hidden="true" />} onClick={fillExample}>
            Fill with example
          </Button>
        }
      />

      <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        If you have chest pain, difficulty breathing, or signs of stroke, call 999.
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <CardBody className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Signed in as" hint="Demo only: pick a fictional patient.">
                <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (NHS {p.nhsNumber})</option>
                  ))}
                </Select>
              </Field>
              <Field label="What is this about?">
                <Select value={type} onChange={(e) => setType(e.target.value as RequestType)}>
                  <option value="clinical">A health problem</option>
                  <option value="medication">A medication question or repeat</option>
                  <option value="admin">Something administrative</option>
                </Select>
              </Field>
            </div>

            <Field label="Subject" required error={errors.subject}>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="For example: Cough that will not go away" />
            </Field>

            <Field label="Describe the problem" required error={errors.description}>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="What has been happening? What have you tried?" />
            </Field>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink-800 dark:text-ink-200">Symptoms (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {chipList.map((s) => {
                  const on = symptoms.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(s)}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        on
                          ? 'border-brand-700 bg-brand-700 text-white dark:border-brand-500 dark:bg-brand-600'
                          : 'border-ink-300 bg-white text-ink-800 hover:bg-ink-50 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-200',
                      )}
                    >
                      {on && <span aria-hidden="true">✓ </span>}{s}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  aria-label="Add another symptom"
                  placeholder="Add another symptom"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                />
                <Button variant="secondary" iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={addCustom}>Add</Button>
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="How long has this been going on?" required={type === 'clinical'} error={errors.duration}>
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="For example: 3 days" />
              </Field>
              <Field label={`How bad is it? ${severity} out of 10`} hint="1 is very mild, 10 is the worst you can imagine.">
                <input
                  type="range" min={1} max={10} step={1} value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  aria-valuetext={`${severity} out of 10`}
                  className="h-10 w-full accent-brand-700"
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Preferred contact method">
                <Select value={contact} onChange={(e) => setContact(e.target.value as Contact)}>
                  <option value="phone">Phone call</option>
                  <option value="sms">Text message</option>
                  <option value="email">Email</option>
                </Select>
              </Field>
              <Field label="When are you available?" required error={errors.availability}>
                <Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="For example: Weekday mornings" />
              </Field>
            </div>
          </CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 px-5 py-4 dark:border-ink-800">
            <p className="text-xs text-ink-600 dark:text-ink-400">Demo only. Nothing leaves your browser.</p>
            <Button type="submit">Send request</Button>
          </div>
        </Card>
      </form>

      <Modal
        open={confirm999 !== null}
        onClose={() => setConfirm999(null)}
        title="This may be an emergency"
        description="Your message mentions symptoms that can be serious."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm999(null)}>Go back and edit</Button>
            <Button variant="danger" onClick={doSubmit}>Submit anyway (demo)</Button>
          </>
        }
      >
        <p className="font-semibold text-red-800 dark:text-red-300">Please call 999 now if you or someone else is in danger.</p>
        <p className="mt-2">An online form is not monitored in real time and is not suitable for emergencies.</p>
        {confirm999 && confirm999.length > 0 && (
          <ul className="mt-3 list-disc pl-5">
            {confirm999.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}
      </Modal>
    </div>
  );
}
