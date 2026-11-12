/**
 * Input guards. Everything typed by a user or arriving in a document is UNTRUSTED DATA:
 * - it is never executed or interpreted as an instruction,
 * - hidden/control characters are removed and length is capped,
 * - anything that looks like a secret is redacted before it is stored or logged,
 * - instruction-like text ("ignore previous instructions…") is FLAGGED for humans, never obeyed,
 * - real-looking personal identifiers are detected so the demo stays fictional-only.
 */

export type SecurityFlagKind = 'injection' | 'secret' | 'truncated' | 'hidden_chars' | 'markup' | 'pii';
export interface SecurityFlag {
  kind: SecurityFlagKind;
  detail: string;
}

// ---------- Secrets ----------
/** Synthetic canary used by the Security Lab. Not a real credential. */
export const CANARY_SECRET = 'sk-canary-TEST0000000000000000000000';

const SECRET_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'Private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g },
  { label: 'Credentials in URL', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@/gi },
  { label: 'Authorization header', re: /\bAuthori[sz]ation\s*:\s*\S+(\s+[A-Za-z0-9._~+/=-]{4,})?/gi },
  { label: 'Bearer/Basic token', re: /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/-]{8,}=*/g },
  { label: 'API key', re: /\b(sk|rk|pk)[-_](?:ant-|live_|test_|proj-)?[A-Za-z0-9_-]{8,}/g },
  { label: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{20,}/g },
  { label: 'GitHub token', re: /\b(gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,})/g },
  { label: 'AWS key', re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { label: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{3,}/g },
  { label: 'Webhook secret', re: /\bwhsec_[A-Za-z0-9]{8,}/g },
  { label: 'JWT', re: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g },
  {
    label: 'Password/secret',
    re: /\b(p[a@]ss(?:w[o0]rd|wd|code|phrase)?|pwd|secret|client[\s_-]?secret|api[\s_-]?key|access[\s_-]?key|auth[\s_-]?token|token)\b\s*(?:is|=|:)\s*\S+/gi,
  },
];

/** Long, mixed-character tokens with no spaces look like generated secrets (catches unknown key formats).
 *  Each token is examined once, so this stays fast even on very long input. */
const TOKEN = /[A-Za-z0-9/+_=-]{24,}/g;
const looksGenerated = (t: string) => /[a-z]/.test(t) && /[A-Z]/.test(t) && /\d/.test(t);

export function redactSecrets(text: string): { text: string; found: string[] } {
  const found: string[] = [];
  let out = text;
  for (const { label, re } of SECRET_PATTERNS) {
    out = out.replace(re, () => {
      found.push(label);
      return `[REDACTED ${label}]`;
    });
  }
  out = out.replace(TOKEN, (t) => {
    if (!looksGenerated(t)) return t;
    found.push('Possible secret');
    return '[REDACTED Possible secret]';
  });
  return { text: out, found };
}

// ---------- Prompt-injection detection ----------
export const INJECTION_PATTERNS: { id: string; label: string; re: RegExp }[] = [
  { id: 'override', label: 'Asks to ignore or override instructions', re: /\b(ignore|disregard|forget|override|bypass|skip|set aside|throw out)\b[^.]{0,40}\b(previous|prior|above|earlier|all|your|the|any|everything)\b[^.]{0,25}\b(instructions?|rules?|prompts?|guidance|guidelines|checks?|above|said|before)\b|\b(disregard|ignore|forget) (everything|all of this|the above)\b/i },
  { id: 'role', label: 'Tries to change the assistant’s role', re: /\b(you are now|act as|pretend (to be|you are)|from now on you)\b/i },
  { id: 'system', label: 'Mentions system prompts or jailbreaks', re: /\b(system prompt|developer mode|jailbreak|DAN mode)\b|\[\s*(INST|SYSTEM)\s*\]|<\|?\s*(system|im_start)\s*\|?>|^\s*(system|assistant)\s*:/im },
  { id: 'auto_approve', label: 'Asks for automatic approval', re: /\b(approve|file|sign[- ]off|accept|mark)\b[^.\n]{0,30}\b(all|everything|automatically|without (review|checking|approval))\b/i },
  { id: 'privilege', label: 'Asks for more access or a different role', re: /\b(grant|give|escalate|elevate)\b[^.\n]{0,25}\b(admin|administrator|gp|clinician|permissions?|access|privileges?|role)\b/i },
  { id: 'exfiltrate', label: 'Asks to send data somewhere', re: /\b(send|post|upload|forward|exfiltrate|email)\b[^.\n]{0,40}(https?:\/\/|\bto (this|the|my) (url|link|address|server|email)\b)/i },
  { id: 'record_tamper', label: 'Asks to change or delete record data', re: /\b(delete|remove|erase|change|set)\b[^.\n]{0,30}\b(allerg(y|ies)|medications?|records?|history|audit|log)\b[^.\n]{0,20}\b(to none|to nothing|silently|without (logging|telling))\b/i },
];

const MARKUP = /<\s*\/?\s*(script|iframe|img|svg|object|embed|style|link|meta)\b|javascript:|on(error|load|click)\s*=/i;
// Control characters, zero-width characters, and bidirectional overrides (used to hide text).
// eslint-disable-next-line no-control-regex
const HIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u3164\uFEFF\uFFA0]/g;

// Detection-only normalisation: look-alike letters, digit substitutions and line breaks are mapped to plain text
// so "ign0re", a Cyrillic "\u043E" in "ignore", or a line break can't hide an instruction. Stored text is not altered.
const HOMOGLYPHS: Record<string, string> = {
  '\u0430': 'a', '\u0435': 'e', '\u043E': 'o', '\u0440': 'p', '\u0441': 'c', '\u0445': 'x', '\u0456': 'i', '\u0443': 'y',
  '\u043A': 'k', '\u043C': 'm', '\u0442': 't', '\u0455': 's', '\u0458': 'j', '\u0501': 'd', '\u0578': 'n',
  '\u03B1': 'a', '\u03BF': 'o', '\u03BD': 'v', '\u03B9': 'i', '\u03C1': 'p', '\u03C4': 't',
};
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
export function normaliseForDetection(text: string): string {
  return text
    .normalize('NFKC')
    .replace(HIDDEN, '')
    .replace(/[\u0370-\u03FF\u0400-\u04FF\u0500-\u058F]/g, (c) => HOMOGLYPHS[c] ?? c)
    .replace(/(?<=[a-z])[013457@$](?=[a-z])|(?<![A-Za-z0-9])[013457@$](?=[a-z]{2})/gi, (c) => LEET[c] ?? c)
    .replace(/\s+/g, ' ');
}

export function detectInjection(text: string): { id: string; label: string }[] {
  const norm = normaliseForDetection(text);
  return INJECTION_PATTERNS.filter((p) => p.re.test(norm) || p.re.test(text)).map(({ id, label }) => ({ id, label }));
}

/**
 * Clean and inspect one untrusted text field.
 * Returns the SAFE text to store plus flags to show humans. Never throws.
 */
export function inspectUntrusted(raw: string, maxLength: number): { text: string; flags: SecurityFlag[] } {
  const flags: SecurityFlag[] = [];
  let text = String(raw ?? '');

  const stripped = text.replace(HIDDEN, '');
  if (stripped !== text) flags.push({ kind: 'hidden_chars', detail: 'Hidden or control characters removed' });
  text = stripped.normalize('NFKC');

  const { text: redacted, found } = redactSecrets(text);
  if (found.length) flags.push({ kind: 'secret', detail: `Redacted: ${[...new Set(found)].join(', ')}` });
  text = redacted;

  for (const hit of detectInjection(text)) flags.push({ kind: 'injection', detail: hit.label });
  if (MARKUP.test(text)) flags.push({ kind: 'markup', detail: 'HTML/script-like markup shown as plain text only' });

  if (text.length > maxLength) {
    flags.push({ kind: 'truncated', detail: `Shortened from ${text.length} to ${maxLength} characters` });
    text = text.slice(0, maxLength);
  }
  return { text, flags };
}

/** For short internal labels (task titles, rule names): clean + redact + cap, flags discarded. */
export function cleanShort(raw: string, maxLength: number): string {
  return inspectUntrusted(raw, maxLength).text.replace(/\s+/g, ' ').trim();
}

export function mergeFlags(...lists: SecurityFlag[][]): SecurityFlag[] {
  const seen = new Set<string>();
  const out: SecurityFlag[] = [];
  for (const f of lists.flat()) {
    const k = `${f.kind}:${f.detail}`;
    if (!seen.has(k)) { seen.add(k); out.push(f); }
  }
  return out;
}

// ---------- Real-looking personal information ----------
export interface PiiHit { kind: 'nhs_number' | 'email' | 'phone' | 'card'; sample: string; index: number; length: number }

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Official NHS number check digit (modulus 11). Real NHS numbers always pass; most random 10-digit values don't. */
export function isValidNhsNumber(digits: string): boolean {
  if (!/^\d{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  return check !== 10 && check === Number(digits[9]);
}

/** Same length as the input, so match positions still line up with the original text. */
function normaliseSeparators(text: string): string {
  return text.normalize('NFKC').replace(HIDDEN, ' ').replace(/[  -   　]/g, ' ');
}

const SEP = String.raw`[ .\-]?`;
const NHS_RE = new RegExp(String.raw`(?<![\d.])(\d{3})${SEP}(\d{3})${SEP}(\d{4})(?![\d.])`, 'g');
// Anchored to the start of a word so huge inputs can't trigger quadratic backtracking.
const EMAIL_RE = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,5})/g;
const OBFUSCATED_EMAIL_RE = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}\s*(?:\(at\)|\[at\]|\{at\}|\sat\s)\s*([A-Za-z0-9-]+)\s*(?:\(dot\)|\[dot\]|\{dot\}|\sdot\s|\.)\s*([A-Za-z]{2,})\b/gi;
const PHONE_RE = /(?<![\d+])(?:\+\s?44\s?(?:\(0\)\s?)?|0)7(?:[ .\-]?\d){9}(?!\d)/g;
const CARD_RE = /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g;

const FICTIONAL_EMAIL = (domain: string) => /^example\.(com|org|net)$/.test(domain) || /\.(test|invalid|example|localhost)$/.test(domain);

/**
 * Finds identifiers that could belong to a REAL person. Fictional test ranges are allowed:
 * NHS numbers starting 999, phones 07700 900xxx, emails @example.com/.org/.net or .test/.invalid/.example.
 */
export function detectRealPii(raw: string): PiiHit[] {
  const text = normaliseSeparators(raw);
  const hits: PiiHit[] = [];
  const add = (kind: PiiHit['kind'], m: RegExpMatchArray) =>
    hits.push({ kind, sample: m[0].slice(0, 3) + '…', index: m.index ?? 0, length: m[0].length });

  for (const m of text.matchAll(NHS_RE)) {
    const digits = m[1] + m[2] + m[3];
    if (m[1] !== '999' && isValidNhsNumber(digits)) add('nhs_number', m);
  }
  for (const m of text.matchAll(EMAIL_RE)) if (!FICTIONAL_EMAIL(m[1].toLowerCase())) add('email', m);
  for (const m of text.matchAll(OBFUSCATED_EMAIL_RE)) {
    const domain = `${m[1]}.${m[2]}`.toLowerCase();
    if (!FICTIONAL_EMAIL(domain) && /^(com|org|net|co|uk|io|me|info|edu|gov|nhs)$/i.test(m[2])) add('email', m);
  }
  for (const m of text.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, '').replace(/^44/, '0').replace(/^00/, '0');
    if (!digits.startsWith('07700900')) add('phone', m);
  }
  for (const m of text.matchAll(CARD_RE)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 13 && luhn(digits)) add('card', m);
  }
  return hits;
}

/** Replaces real-looking identifiers (used for documents and calls, which can't be sent back to be fixed). */
export function redactPii(raw: string): { text: string; hits: PiiHit[] } {
  const text = normaliseSeparators(raw);
  const hits = detectRealPii(raw).sort((a, b) => b.index - a.index);
  let out = text;
  for (const h of hits) out = out.slice(0, h.index) + '[REMOVED personal data]' + out.slice(h.index + h.length);
  return { text: hits.length ? out : raw, hits };
}

export function piiMessage(hits: PiiHit[]): string {
  return `This looks like real personal information (${[...new Set(hits.map((h) => PII_LABEL[h.kind]))].join(', ')}). ` +
    'This demo only accepts fictional data. Please remove it.';
}

export const PII_LABEL: Record<PiiHit['kind'], string> = {
  nhs_number: 'an NHS-style number outside the 999 test range',
  email: 'a real-looking email address',
  phone: 'a real-looking phone number',
  card: 'a payment card number',
};

/** Size limits applied to stored data (resource limits). */
export const LIMITS = {
  subject: 200,
  description: 2000,
  symptom: 60,
  symptomsCount: 15,
  shortField: 100,
  documentTitle: 200,
  documentBody: 20000,
  soapField: 5000,
  taskTitle: 200,
  ruleName: 80,
  ruleText: 300,
  ruleConditions: 5,
  ruleActions: 5,
  activityMessage: 500,
  activitiesKept: 1000,
  callsKept: 50,
  callMessage: 500,
} as const;
