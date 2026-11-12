/**
 * FICTIONAL seed data for the demo.
 * - Every person, address, and number here is invented.
 * - NHS numbers use the 999 test range; phone numbers use the Ofcom drama range (07700 900xxx).
 * - Clinical codes are placeholders ("PH-…"), not real SNOMED CT or ICD codes.
 * Dates are generated relative to `now`, so the demo always looks current.
 */
import { BRAND } from '@/brand';
import type {
  Activity, Appointment, AutomationRule, ClinicalDocument, ConsultationNote, Patient,
  PatientRequest, Referral, Staff, Task, Transcript,
} from '@/types';

export const JAMIE_ID = 'p-jamie';
export const DEMO_DOC_ID = 'd-jamie-fbc';
export const DEMO_TRANSCRIPT_ID = 't-jamie';

export const staff: Staff[] = [
  { id: 's-shah', name: 'Dr Priya Shah', role: 'gp', title: 'GP Partner', initials: 'PS' },
  { id: 's-okafor', name: 'Dr Tom Okafor', role: 'gp', title: 'Salaried GP', initials: 'TO' },
  { id: 's-bello', name: 'Aisha Bello', role: 'nurse', title: 'Practice Nurse', initials: 'AB' },
  { id: 's-reid', name: 'Sam Reid', role: 'receptionist', title: 'Care Navigator', initials: 'SR' },
  { id: 's-lee', name: 'Morgan Lee', role: 'manager', title: 'Practice Manager', initials: 'ML' },
];

export const patients: Patient[] = [
  {
    id: JAMIE_ID, nhsNumber: '999 012 3401', name: 'Jamie Morgan', dob: '1991-04-12', sex: 'Not stated',
    phone: '07700 900101', email: 'jamie.morgan@example.com', address: '14 Willow Lane, Riverside, RV1 4AB',
    conditions: [{ label: 'Asthma (mild, intermittent)', code: 'PH-AST-01', since: '2012', status: 'active' }],
    medications: [{ name: 'Salbutamol inhaler', dose: '100 micrograms, 1–2 puffs as needed', since: '2012' }],
    allergies: ['Penicillin (rash)'], registeredGpId: 's-shah', flags: ['Prefers SMS contact'],
  },
  {
    id: 'p-eleanor', nhsNumber: '999 012 3402', name: 'Eleanor Hughes', dob: '1947-09-03', sex: 'Female',
    phone: '07700 900102', email: 'eleanor.hughes@example.com', address: '2 Mill Court, Riverside, RV2 1CD',
    conditions: [
      { label: 'COPD', code: 'PH-COPD-01', since: '2015', status: 'active' },
      { label: 'Hypertension', code: 'PH-HTN-01', since: '2009', status: 'active' },
    ],
    medications: [
      { name: 'Tiotropium inhaler', dose: '2.5 micrograms, 2 puffs once daily', since: '2015' },
      { name: 'Amlodipine', dose: '5 mg once daily', since: '2009' },
    ],
    allergies: [], registeredGpId: 's-okafor', flags: ['Lives alone', 'Hard of hearing — prefers face to face'],
  },
  {
    id: 'p-rahul', nhsNumber: '999 012 3403', name: 'Rahul Mehta', dob: '1980-01-22', sex: 'Male',
    phone: '07700 900103', email: 'rahul.mehta@example.com', address: '88 Station Road, Riverside, RV3 2EF',
    conditions: [{ label: 'Type 2 diabetes', code: 'PH-T2D-01', since: '2019', status: 'active' }],
    medications: [{ name: 'Metformin', dose: '500 mg twice daily', since: '2019' }],
    allergies: [], registeredGpId: 's-shah', flags: [],
  },
  {
    id: 'p-sofia', nhsNumber: '999 012 3404', name: 'Sofia Alvarez', dob: '1996-06-30', sex: 'Female',
    phone: '07700 900104', email: 'sofia.alvarez@example.com', address: '5 Orchard Rise, Riverside, RV1 6GH',
    conditions: [{ label: 'Migraine without aura', code: 'PH-MIG-01', since: '2017', status: 'active' }],
    medications: [{ name: 'Sumatriptan', dose: '50 mg at onset, max 2 in 24 h', since: '2018' }],
    allergies: [], registeredGpId: 's-okafor', flags: [],
  },
  {
    id: 'p-daniel', nhsNumber: '999 012 3405', name: 'Daniel Kowalski', dob: '1973-11-14', sex: 'Male',
    phone: '07700 900105', email: 'daniel.kowalski@example.com', address: '41 Harbour Street, Riverside, RV4 3IJ',
    conditions: [{ label: 'Hypertension', code: 'PH-HTN-01', since: '2016', status: 'active' }],
    medications: [{ name: 'Ramipril', dose: '5 mg once daily', since: '2016' }],
    allergies: ['Ibuprofen (wheeze)'], registeredGpId: 's-shah', flags: [],
  },
  {
    id: 'p-grace', nhsNumber: '999 012 3406', name: 'Grace Thompson', dob: '2018-03-08', sex: 'Female',
    phone: '07700 900106', email: 'thompson.family@example.com', address: '9 Meadow View, Riverside, RV2 5KL',
    conditions: [{ label: 'Eczema', code: 'PH-ECZ-01', since: '2019', status: 'active' }],
    medications: [{ name: 'Emollient cream', dose: 'Apply twice daily', since: '2019' }],
    allergies: [], registeredGpId: 's-okafor', flags: ['Child — contact parent or guardian'],
  },
  {
    id: 'p-mohammed', nhsNumber: '999 012 3407', name: 'Mohammed Siddiqui', dob: '1962-02-17', sex: 'Male',
    phone: '07700 900107', email: 'm.siddiqui@example.com', address: '23 Canal Walk, Riverside, RV3 7MN',
    conditions: [{ label: 'Osteoarthritis, right knee', code: 'PH-OA-01', since: '2020', status: 'active' }],
    medications: [{ name: 'Paracetamol', dose: '1 g up to four times daily', since: '2020' }],
    allergies: [], registeredGpId: 's-shah', flags: [],
  },
  {
    id: 'p-chloe', nhsNumber: '999 012 3408', name: 'Chloe Bennett', dob: '1989-08-25', sex: 'Female',
    phone: '07700 900108', email: 'chloe.bennett@example.com', address: '7 Beech Grove, Riverside, RV1 8OP',
    conditions: [{ label: 'Hypothyroidism', code: 'PH-HYPO-01', since: '2014', status: 'active' }],
    medications: [{ name: 'Levothyroxine', dose: '75 micrograms once daily', since: '2014' }],
    allergies: [], registeredGpId: 's-okafor', flags: [],
  },
  {
    id: 'p-oliver', nhsNumber: '999 012 3409', name: 'Oliver Grant', dob: '1954-12-01', sex: 'Male',
    phone: '07700 900109', email: 'oliver.grant@example.com', address: '60 Church Lane, Riverside, RV4 9QR',
    conditions: [{ label: 'Atrial fibrillation', code: 'PH-AF-01', since: '2018', status: 'active' }],
    medications: [{ name: 'Apixaban', dose: '5 mg twice daily', since: '2018' }],
    allergies: [], registeredGpId: 's-shah', flags: ['Anticoagulated'],
  },
  {
    id: 'p-hannah', nhsNumber: '999 012 3410', name: 'Hannah Clarke', dob: '1984-05-19', sex: 'Female',
    phone: '07700 900110', email: 'hannah.clarke@example.com', address: '17 Linden Close, Riverside, RV2 2ST',
    conditions: [{ label: 'Generalised anxiety', code: 'PH-ANX-01', since: '2021', status: 'active' }],
    medications: [{ name: 'Sertraline', dose: '50 mg once daily', since: '2021' }],
    allergies: [], registeredGpId: 's-okafor', flags: [],
  },
];

// ---------------------------------------------------------------------------
// Demo templates (things that "arrive" during the guided demo)
// ---------------------------------------------------------------------------
export const jamieRequestInput = {
  patientId: JAMIE_ID,
  channel: 'online' as const,
  type: 'clinical' as const,
  subject: 'Tired all the time for the last 6 weeks',
  description:
    'I have felt exhausted for about six weeks even after a full night of sleep. I get out of breath on the stairs, ' +
    'which is new for me, and I sometimes feel light-headed when I stand up quickly. My inhaler use has not changed. ' +
    'No chest pain. I would like to see a GP when possible.',
  symptoms: ['Fatigue', 'Breathless on exertion', 'Light-headed on standing'],
  duration: '6 weeks',
  severity: 5,
  preferredContact: 'sms' as const,
  availability: 'Weekday mornings',
};

export function jamieLabReport(now: Date): ClinicalDocument {
  return {
    id: DEMO_DOC_ID, patientId: JAMIE_ID, kind: 'lab_report', status: 'inbox',
    title: 'Full blood count and iron studies', source: 'Riverside Pathology Laboratory (fictional)',
    receivedAt: now.toISOString(),
    body: [
      'RIVERSIDE PATHOLOGY LABORATORY — FICTIONAL TEST REPORT',
      'Patient: Jamie Morgan   NHS No: 999 012 3401',
      `Requested by: Dr Priya Shah, ${BRAND.clinicName}`,
      '',
      'Haemoglobin: 98 g/L (ref 120-160) LOW',
      'MCV: 74 fL (ref 80-100) LOW',
      'Ferritin: 6 ug/L (ref 15-200) LOW',
      'White cell count: 6.2 x10^9/L (ref 4.0-11.0)',
      'Platelets: 310 x10^9/L (ref 150-400)',
      'TSH: 1.9 mU/L (ref 0.4-4.0)',
      '',
      'Comment: Microcytic anaemia with low ferritin, consistent with iron deficiency. Suggest clinical review.',
    ].join('\n'),
  };
}

// ---------------------------------------------------------------------------
// Seed builder
// ---------------------------------------------------------------------------
export interface SeedData {
  staff: Staff[];
  patients: Patient[];
  requests: PatientRequest[];
  appointments: Appointment[];
  documents: ClinicalDocument[];
  transcripts: Transcript[];
  notes: ConsultationNote[];
  tasks: Task[];
  referrals: Referral[];
  activities: Activity[];
  automations: AutomationRule[];
}

export function createSeed(now: Date = new Date()): SeedData {
  const at = (days: number, hours = 0, mins = 0) =>
    new Date(now.getTime() + ((days * 24 + hours) * 60 + mins) * 60000).toISOString();
  /** A time on a whole day offset, e.g. day(2, 9, 30) = in 2 days at 09:30 local */
  const day = (offset: number, h: number, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const requests: PatientRequest[] = [
    {
      id: 'r-101', patientId: 'p-sofia', createdAt: at(0, -3), channel: 'online', type: 'clinical',
      subject: 'Migraines more frequent', description:
        'My migraines have gone from about two a month to two a week over the last two months. Sumatriptan still helps. No new weakness or vision loss.',
      symptoms: ['Headache', 'Nausea', 'Light sensitivity'], duration: '2 months', severity: 6,
      preferredContact: 'phone', availability: 'Any afternoon', urgency: 'soon', status: 'new',
    },
    {
      id: 'r-102', patientId: 'p-chloe', createdAt: at(0, -2, -20), channel: 'online', type: 'medication',
      subject: 'Repeat prescription — levothyroxine', description:
        'Please could I have my repeat levothyroxine prescription. I have 5 days left.',
      symptoms: [], duration: 'n/a', severity: 1, preferredContact: 'sms', availability: 'Any',
      urgency: 'routine', status: 'new',
    },
    {
      id: 'r-103', patientId: 'p-grace', createdAt: at(0, -1, -10), channel: 'phone', type: 'clinical',
      subject: 'Child with fever and itchy rash', description:
        'Parent reports Grace has had a temperature of 38.2C since yesterday and a spotty itchy rash on the tummy. Eating and drinking, rash fades when pressed with a glass.',
      symptoms: ['Fever', 'Rash', 'Itching'], duration: '1 day', severity: 6, preferredContact: 'phone',
      availability: 'Today', urgency: 'urgent', status: 'in_review', firstResponseAt: at(0, -1),
    },
    {
      id: 'r-104', patientId: 'p-rahul', createdAt: at(-1, -5), channel: 'online', type: 'clinical',
      subject: 'Diabetes review due', description:
        'I got a text saying my annual diabetes review is due. I have been feeling fine but more thirsty lately.',
      symptoms: ['Increased thirst'], duration: '3 weeks', severity: 3, preferredContact: 'email',
      availability: 'Tuesday or Thursday', urgency: 'routine', status: 'assigned', assigneeId: 's-bello',
      firstResponseAt: at(-1, -4, -20),
    },
    {
      id: 'r-105', patientId: 'p-hannah', createdAt: at(-1, -2), channel: 'online', type: 'admin',
      subject: 'Fit note extension', description: 'My fit note runs out on Friday and I need it extended.',
      symptoms: [], duration: 'n/a', severity: 2, preferredContact: 'email', availability: 'Any',
      urgency: 'routine', status: 'assigned', assigneeId: 's-okafor', firstResponseAt: at(-1, -1),
    },
    {
      id: 'r-106', patientId: 'p-mohammed', createdAt: at(-2, -6), channel: 'online', type: 'clinical',
      subject: 'Knee pain worse, waiting for orthopaedics', description:
        'Right knee pain is worse at night. I have an orthopaedic appointment coming up but wanted advice on pain relief.',
      symptoms: ['Knee pain', 'Night pain'], duration: '4 months', severity: 6, preferredContact: 'phone',
      availability: 'Mornings', urgency: 'soon', status: 'scheduled', assigneeId: 's-shah',
      firstResponseAt: at(-2, -5), appointmentId: 'a-201',
    },
    {
      id: 'r-107', patientId: 'p-eleanor', createdAt: at(-3, -4), channel: 'phone', type: 'clinical',
      subject: 'Follow-up after hospital discharge', description:
        'Daughter called: Eleanor was discharged from hospital after a chest infection and needs a GP follow-up.',
      symptoms: ['Cough', 'Breathlessness'], duration: '2 weeks', severity: 5, preferredContact: 'phone',
      availability: 'Any', urgency: 'soon', status: 'scheduled', assigneeId: 's-okafor',
      firstResponseAt: at(-3, -3, -30), appointmentId: 'a-202',
    },
    {
      id: 'r-108', patientId: 'p-daniel', createdAt: at(-4, -2), channel: 'phone', type: 'clinical',
      subject: 'Chest tightness on exertion', description:
        'Chest tightness when walking uphill for 2 weeks, settles with rest. No pain at rest. Sent for same-day assessment.',
      symptoms: ['Chest pain', 'Breathless on exertion'], duration: '2 weeks', severity: 7, preferredContact: 'phone',
      availability: 'Today', urgency: 'emergency', status: 'completed', assigneeId: 's-shah',
      firstResponseAt: at(-4, -1, -50), completedAt: at(-4, 0),
    },
    {
      id: 'r-109', patientId: 'p-oliver', createdAt: at(-5, -3), channel: 'online', type: 'medication',
      subject: 'Apixaban repeat', description: 'Repeat request for apixaban, running low.',
      symptoms: [], duration: 'n/a', severity: 1, preferredContact: 'sms', availability: 'Any',
      urgency: 'routine', status: 'completed', assigneeId: 's-bello', firstResponseAt: at(-5, -1),
      completedAt: at(-5, 2),
    },
    {
      id: 'r-110', patientId: 'p-chloe', createdAt: at(-6, -1), channel: 'walk_in', type: 'admin',
      subject: 'Update address', description: 'Moved house, wants records updated.', symptoms: [],
      duration: 'n/a', severity: 1, preferredContact: 'email', availability: 'Any', urgency: 'routine',
      status: 'closed', assigneeId: 's-reid', firstResponseAt: at(-6, 0, -40), completedAt: at(-6, 0),
    },
    {
      id: 'r-111', patientId: 'p-sofia', createdAt: at(-7, -4), channel: 'online', type: 'clinical',
      subject: 'Sore throat', description: 'Sore throat for 4 days, no fever, eating and drinking normally.',
      symptoms: ['Sore throat'], duration: '4 days', severity: 3, preferredContact: 'sms', availability: 'Any',
      urgency: 'routine', status: 'completed', assigneeId: 's-bello', firstResponseAt: at(-7, -2),
      completedAt: at(-7, 3),
    },
    {
      id: 'r-112', patientId: 'p-hannah', createdAt: at(-9, -2), channel: 'phone', type: 'clinical',
      subject: 'Anxiety medication review', description: 'Would like to discuss whether sertraline dose is right.',
      symptoms: ['Low mood', 'Poor sleep'], duration: '1 month', severity: 4, preferredContact: 'phone',
      availability: 'Afternoons', urgency: 'soon', status: 'completed', assigneeId: 's-okafor',
      firstResponseAt: at(-9, 1), completedAt: at(-8, 0),
    },
  ];

  const appointments: Appointment[] = [
    { id: 'a-201', patientId: 'p-mohammed', staffId: 's-shah', requestId: 'r-106', start: day(1, 10, 0), durationMins: 15, mode: 'phone', reason: 'Knee pain — analgesia review', status: 'booked' },
    { id: 'a-202', patientId: 'p-eleanor', staffId: 's-okafor', requestId: 'r-107', start: day(2, 9, 30), durationMins: 20, mode: 'in_person', reason: 'Post-discharge review', status: 'booked' },
    { id: 'a-203', patientId: 'p-rahul', staffId: 's-bello', start: day(3, 14, 0), durationMins: 30, mode: 'in_person', reason: 'Annual diabetes review', status: 'booked' },
    { id: 'a-204', patientId: 'p-hannah', staffId: 's-okafor', requestId: 'r-112', start: day(-8, 15, 0), durationMins: 15, mode: 'video', reason: 'Medication review', status: 'completed' },
    { id: 'a-205', patientId: 'p-daniel', staffId: 's-shah', requestId: 'r-108', start: day(-4, 11, 0), durationMins: 20, mode: 'in_person', reason: 'Same-day chest pain assessment', status: 'completed' },
  ];

  const documents: ClinicalDocument[] = [
    {
      id: 'd-301', patientId: 'p-eleanor', kind: 'discharge_summary', status: 'inbox',
      title: 'Discharge summary — Respiratory ward', source: 'Riverside General Hospital (fictional)',
      receivedAt: at(0, -5),
      body: [
        'RIVERSIDE GENERAL HOSPITAL — FICTIONAL DISCHARGE SUMMARY',
        'Patient: Eleanor Hughes   NHS No: 999 012 3402',
        'Admitted: 6 days ago   Discharged: 2 days ago',
        '',
        'Diagnosis: Infective exacerbation of COPD',
        'Treatment: Oral prednisolone and doxycycline, nebulised salbutamol',
        'Medications on discharge: Prednisolone 30 mg once daily for 3 more days; Doxycycline 100 mg once daily for 2 more days',
        'Medication changes: None to regular medicines',
        'Follow-up: GP review within 2 weeks. Consider pulmonary rehabilitation referral.',
        '',
        'Summary: Admitted with worsening breathlessness and productive cough. Improved with treatment. Oxygen saturation 95% on air at discharge.',
      ].join('\n'),
    },
    {
      id: 'd-302', patientId: 'p-rahul', kind: 'lab_report', status: 'inbox',
      title: 'HbA1c and kidney function', source: 'Riverside Pathology Laboratory (fictional)',
      receivedAt: at(0, -2, -30),
      body: [
        'RIVERSIDE PATHOLOGY LABORATORY — FICTIONAL TEST REPORT',
        'Patient: Rahul Mehta   NHS No: 999 012 3403',
        '',
        'HbA1c: 64 mmol/mol (target below 53) HIGH',
        'eGFR: 82 mL/min/1.73m2 (ref above 60)',
        'Cholesterol: 5.6 mmol/L (target below 5.0) HIGH',
        'Urine ACR: 1.8 mg/mmol (ref below 3.0)',
        '',
        'Comment: HbA1c above target. Kidney function normal.',
      ].join('\n'),
    },
    {
      id: 'd-303', patientId: 'p-mohammed', kind: 'referral_letter', status: 'inbox',
      title: 'Orthopaedic clinic letter', source: 'Riverside Orthopaedic Centre (fictional)',
      receivedAt: at(-1, -3),
      body: [
        'RIVERSIDE ORTHOPAEDIC CENTRE — FICTIONAL CLINIC LETTER',
        'Patient: Mohammed Siddiqui   NHS No: 999 012 3407',
        '',
        'Diagnosis: Moderate osteoarthritis right knee',
        'Investigations: X-ray shows medial joint space narrowing',
        'Plan: Physiotherapy referral made by our team. Review in clinic in 3 months. Consider steroid injection if no improvement.',
        'GP actions: Please review analgesia. Consider topical NSAID.',
        '',
        'Summary: Seen in clinic. Not currently a candidate for knee replacement. Conservative management advised.',
      ].join('\n'),
    },
    {
      id: 'd-304', patientId: 'p-oliver', kind: 'lab_report', status: 'filed',
      title: 'Kidney function (annual anticoagulation check)', source: 'Riverside Pathology Laboratory (fictional)',
      receivedAt: at(-6, -2), filedBy: 's-shah', filedAt: at(-6, 1),
      body: [
        'RIVERSIDE PATHOLOGY LABORATORY — FICTIONAL TEST REPORT',
        'Patient: Oliver Grant   NHS No: 999 012 3409',
        '',
        'Creatinine: 92 umol/L (ref 60-110)',
        'eGFR: 71 mL/min/1.73m2 (ref above 60)',
        'Haemoglobin: 142 g/L (ref 130-170)',
        '',
        'Comment: Results within normal limits.',
      ].join('\n'),
    },
  ];

  const transcripts: Transcript[] = [
    {
      id: DEMO_TRANSCRIPT_ID, patientId: JAMIE_ID, clinicianId: 's-shah',
      title: 'Jamie Morgan — tiredness review', recordedAt: day(1, 9, 0),
      lines: [
        { speaker: 'clinician', text: 'Hi Jamie, thanks for coming in. Tell me about the tiredness.' },
        { speaker: 'patient', text: "I've been exhausted for about six weeks, even after a full night's sleep." },
        { speaker: 'patient', text: "I get out of breath on the stairs, which isn't normal for me, and I feel light-headed when I stand up quickly." },
        { speaker: 'clinician', text: 'Any chest pain, palpitations, weight loss or blood in your stools?' },
        { speaker: 'patient', text: "No chest pain or weight loss. No blood that I've noticed. My diet is mostly vegetarian now." },
        { speaker: 'clinician', text: 'On examination you look a little pale. Pulse 92 and regular, blood pressure 112/70, oxygen saturation 98%.' },
        { speaker: 'clinician', text: 'Your blood test shows haemoglobin 98 and a very low ferritin, so this is likely iron deficiency anaemia.' },
        { speaker: 'clinician', text: "I'll start you on ferrous fumarate 210 mg once a day and we'll recheck your blood count in 8 weeks." },
        { speaker: 'clinician', text: "I'll also refer you to the practice dietitian to talk about iron in a vegetarian diet." },
        { speaker: 'clinician', text: 'If you get chest pain, severe breathlessness or black stools, call 111 or 999 straight away.' },
        { speaker: 'patient', text: 'Okay, that makes sense. Thank you.' },
      ],
    },
    {
      id: 't-rahul', patientId: 'p-rahul', clinicianId: 's-bello',
      title: 'Rahul Mehta — diabetes review', recordedAt: day(-2, 14, 0),
      lines: [
        { speaker: 'clinician', text: "Hi Rahul, let's go through your diabetes review." },
        { speaker: 'patient', text: "I've been more thirsty for the last few weeks and I'm getting up at night to pass urine." },
        { speaker: 'patient', text: "I've been taking the metformin but I sometimes forget the evening dose." },
        { speaker: 'clinician', text: 'On examination your weight is 92 kg, blood pressure 134/82, and your feet look healthy with good pulses.' },
        { speaker: 'clinician', text: 'Your HbA1c is 64, which is above target, so your diabetes is not as well controlled as we would like.' },
        { speaker: 'clinician', text: "I'll ask the GP to consider increasing your metformin, and we'll book you onto the structured education course." },
        { speaker: 'clinician', text: "We'll repeat the HbA1c in 3 months. Set a phone reminder for the evening tablet." },
        { speaker: 'patient', text: 'Sounds good.' },
      ],
    },
    {
      id: 't-hannah', patientId: 'p-hannah', clinicianId: 's-okafor',
      title: 'Hannah Clarke — anxiety follow-up', recordedAt: day(-8, 15, 0),
      lines: [
        { speaker: 'clinician', text: 'How have things been since we last spoke?' },
        { speaker: 'patient', text: "Better during the day, but I'm still not sleeping well and I worry a lot at night." },
        { speaker: 'patient', text: 'No thoughts of harming myself. Work has been stressful.' },
        { speaker: 'clinician', text: 'On examination you appear calm and engaged, with good eye contact. GAD-7 score today is 11.' },
        { speaker: 'clinician', text: 'I think the anxiety is improving but is not fully controlled.' },
        { speaker: 'clinician', text: "I'll increase sertraline to 100 mg once daily and refer you to talking therapies." },
        { speaker: 'clinician', text: "We'll review in 4 weeks, and if things get worse please contact us sooner." },
      ],
    },
  ];

  const notes: ConsultationNote[] = [
    {
      id: 'n-401', patientId: 'p-daniel', appointmentId: 'a-205', authorId: 's-shah', createdAt: day(-4, 11, 25),
      status: 'approved', edited: false, approvedBy: 's-shah', approvedAt: day(-4, 11, 30),
      soap: {
        subjective: 'Two weeks of chest tightness on exertion, relieved by rest. No pain at rest.',
        objective: 'BP 148/90, pulse 78 regular. ECG: sinus rhythm, no acute changes.',
        assessment: 'Possible stable angina.',
        plan: 'Urgent referral to rapid access chest pain clinic. GTN spray prescribed. Safety-netting advice given.',
      },
    },
    {
      id: 'n-402', patientId: 'p-hannah', appointmentId: 'a-204', authorId: 's-okafor', createdAt: day(-8, 15, 20),
      status: 'approved', edited: false, approvedBy: 's-okafor', approvedAt: day(-8, 15, 25),
      soap: {
        subjective: 'Anxiety improving in the day, poor sleep, worry at night. No thoughts of self-harm.',
        objective: 'Calm, engaged. GAD-7 score 11.',
        assessment: 'Generalised anxiety, partially controlled.',
        plan: 'Increase sertraline to 100 mg once daily. Refer to talking therapies. Review in 4 weeks.',
      },
    },
  ];

  const tasks: Task[] = [
    { id: 'k-501', patientId: 'p-chloe', title: 'Issue repeat levothyroxine prescription', status: 'open', source: 'request', sourceId: 'r-102', clinical: true, assigneeId: 's-bello', due: day(1, 17), createdAt: at(0, -2) },
    { id: 'k-502', patientId: 'p-eleanor', title: 'Check pulmonary rehab eligibility', status: 'open', source: 'manual', clinical: true, assigneeId: 's-okafor', due: day(3, 17), createdAt: at(-1, -2) },
    { id: 'k-503', patientId: 'p-hannah', title: 'Issue fit note extension', status: 'open', source: 'request', sourceId: 'r-105', clinical: true, assigneeId: 's-okafor', due: day(0, 17), createdAt: at(-1, -1) },
    { id: 'k-504', patientId: 'p-rahul', title: 'Send diabetes review invitation', status: 'done', source: 'automation', clinical: false, assigneeId: 's-reid', createdAt: at(-3), completedAt: at(-2), completedBy: 's-reid' },
    { id: 'k-505', patientId: 'p-daniel', title: 'Confirm chest pain clinic appointment received', status: 'open', source: 'referral', sourceId: 'f-602', clinical: false, assigneeId: 's-reid', due: day(-1, 17), createdAt: at(-4) },
    { id: 'k-506', patientId: 'p-oliver', title: 'File annual anticoagulation bloods', status: 'done', source: 'document', sourceId: 'd-304', clinical: true, assigneeId: 's-shah', createdAt: at(-6), completedAt: at(-6, 1), completedBy: 's-shah' },
  ];

  const referrals: Referral[] = [
    { id: 'f-601', patientId: 'p-mohammed', specialty: 'Orthopaedics', destination: 'Riverside Orthopaedic Centre (fictional)', reason: 'Right knee osteoarthritis, failing conservative treatment', priority: 'routine', status: 'booked', createdAt: at(-40), updatedAt: at(-10), expectedBy: at(-5), createdBy: 's-shah' },
    { id: 'f-602', patientId: 'p-daniel', specialty: 'Cardiology — rapid access chest pain', destination: 'Riverside General Hospital (fictional)', reason: 'Exertional chest tightness, possible angina', priority: 'urgent', status: 'sent', createdAt: at(-4), updatedAt: at(-4), expectedBy: at(-1), createdBy: 's-shah' },
    { id: 'f-603', patientId: 'p-hannah', specialty: 'Talking therapies', destination: 'Riverside Wellbeing Service (fictional)', reason: 'Generalised anxiety, partially controlled', priority: 'routine', status: 'acknowledged', createdAt: at(-8), updatedAt: at(-5), expectedBy: at(20), createdBy: 's-okafor' },
    { id: 'f-604', patientId: 'p-sofia', specialty: 'Neurology', destination: 'Riverside General Hospital (fictional)', reason: 'Increasing migraine frequency', priority: 'routine', status: 'drafted', createdAt: at(-1), updatedAt: at(-1), expectedBy: at(42), createdBy: 's-okafor' },
    { id: 'f-605', patientId: 'p-oliver', specialty: 'Anticoagulation clinic', destination: 'Riverside General Hospital (fictional)', reason: 'Annual anticoagulation review', priority: 'routine', status: 'completed', createdAt: at(-60), updatedAt: at(-20), expectedBy: at(-25), createdBy: 's-shah' },
  ];

  const automations: AutomationRule[] = [
    {
      id: 'au-1', name: 'Escalate urgent requests to a GP', enabled: true, trigger: 'request.created',
      description: 'When a new request is urgent or an emergency, assign it to a GP immediately.',
      conditions: [{ field: 'urgency', op: 'equals', value: 'urgent,emergency' }],
      actions: [{ type: 'assign_role', role: 'gp' }, { type: 'notify', message: 'Duty GP alerted to urgent request (simulated).' }],
      runCount: 4, lastRunAt: at(0, -1, -10),
    },
    {
      id: 'au-2', name: 'Route medication requests to nurse', enabled: true, trigger: 'request.created',
      description: 'Repeat prescription requests go to the practice nurse queue.',
      conditions: [{ field: 'type', op: 'equals', value: 'medication' }],
      actions: [{ type: 'assign_role', role: 'nurse' }, { type: 'set_status', status: 'assigned' }],
      runCount: 7, lastRunAt: at(-5, -3),
    },
    {
      id: 'au-3', name: 'Appointment reminder', enabled: true, trigger: 'appointment.booked',
      description: 'Send the patient a reminder message when an appointment is booked.',
      conditions: [{ field: 'always', op: 'equals', value: 'true' }],
      actions: [{ type: 'notify', message: 'Appointment confirmation SMS queued (simulated, nothing is sent).' }],
      runCount: 12, lastRunAt: at(-2, -5),
    },
    {
      id: 'au-4', name: 'Lab results filed → results letter', enabled: true, trigger: 'document.filed',
      description: 'When a lab report is filed, create a task to send the patient their results.',
      conditions: [{ field: 'documentKind', op: 'equals', value: 'lab_report' }],
      actions: [{ type: 'create_task', title: 'Send results letter to patient', clinical: false, dueInDays: 2 }],
      runCount: 9, lastRunAt: at(-6, 1),
    },
    {
      id: 'au-5', name: 'Discharge summary → medicines check', enabled: true, trigger: 'document.filed',
      description: 'After a hospital discharge, a clinician reconciles medicines within 3 days.',
      conditions: [{ field: 'documentKind', op: 'equals', value: 'discharge_summary' }],
      actions: [{ type: 'create_task', title: 'Medicines reconciliation after discharge', clinical: true, dueInDays: 3 }],
      runCount: 3, lastRunAt: at(-12),
    },
    {
      id: 'au-6', name: 'Post-visit check-in', enabled: false, trigger: 'appointment.completed',
      description: 'Two weeks after an appointment, a care navigator checks in with the patient.',
      conditions: [{ field: 'always', op: 'equals', value: 'true' }],
      actions: [{ type: 'create_task', title: 'Post-visit check-in call', clinical: false, dueInDays: 14 }],
      runCount: 0,
    },
  ];

  const name = (pid: string) => patients.find((p) => p.id === pid)?.name ?? 'Unknown patient';
  const activities: Activity[] = [];
  let n = 0;
  const log = (a: Omit<Activity, 'id'>) => activities.push({ id: `act-seed-${++n}`, ...a });
  for (const r of requests) {
    log({ at: r.createdAt, actor: 'patient', patientId: r.patientId, entity: { type: 'request', id: r.id }, kind: 'request.created', message: `${name(r.patientId)} submitted "${r.subject}"` });
    if (r.assigneeId) {
      const s = staff.find((x) => x.id === r.assigneeId);
      log({ at: r.firstResponseAt ?? r.createdAt, actor: 's-reid', patientId: r.patientId, entity: { type: 'request', id: r.id }, kind: 'request.assigned', message: `Request assigned to ${s?.name}` });
    }
    if (r.completedAt) log({ at: r.completedAt, actor: r.assigneeId ?? 'system', patientId: r.patientId, entity: { type: 'request', id: r.id }, kind: 'request.completed', message: `Request "${r.subject}" completed` });
  }
  for (const d of documents) {
    log({ at: d.receivedAt, actor: 'system', patientId: d.patientId, entity: { type: 'document', id: d.id }, kind: 'document.received', message: `Document received: ${d.title}` });
    if (d.filedAt) log({ at: d.filedAt, actor: d.filedBy ?? 'system', patientId: d.patientId, entity: { type: 'document', id: d.id }, kind: 'document.filed', message: `Document filed: ${d.title}` });
  }
  for (const note of notes) {
    log({ at: note.approvedAt!, actor: note.authorId, patientId: note.patientId, entity: { type: 'note', id: note.id }, kind: 'note.approved', message: 'Consultation note approved' });
  }
  for (const f of referrals) {
    log({ at: f.createdAt, actor: f.createdBy, patientId: f.patientId, entity: { type: 'referral', id: f.id }, kind: 'referral.created', message: `Referral to ${f.specialty} created` });
  }
  activities.sort((a, b) => b.at.localeCompare(a.at));

  return {
    staff: structuredClone(staff),
    patients: structuredClone(patients),
    requests, appointments, documents, transcripts, notes, tasks, referrals, activities, automations,
  };
}
