import { STAGES, TAXONOMY } from './taxonomy';
import type { AnswerValue, Answers, Role } from './types';

// 'video' answers are a short descriptor ("pitch.mov · 0:48"); the video itself stays on the phone
// (src/lib/videoStore.ts).
export type QuestionKind = 'text' | 'longtext' | 'url' | 'email' | 'single' | 'multi' | 'range' | 'scale' | 'video';

export interface QuestionOption {
  id: string;
  label: string;
}

export interface QuestionStop {
  value: number;
  label: string;
}

export interface QuestionScale {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

export interface Question {
  id: string;
  label: string;
  help?: string;
  kind: QuestionKind;
  required: boolean;
  maxLength?: number;
  maxSelections?: number;
  options?: QuestionOption[];
  stops?: QuestionStop[];
  rangeLabels?: [string, string];
  scale?: QuestionScale;
  /** Shown as the input's placeholder, for text, url and email kinds. */
  placeholder?: string;
  /** Consecutive questions sharing a page render together on one questionnaire step. */
  page?: string;
  /** When true, this question's answer is never sent to the AI (e.g. personal contact details, the pitch video). */
  excludeFromAi?: boolean;
}

// Values are in € thousands.
export const TICKET_STOPS: QuestionStop[] = [
  { value: 0, label: 'Under €100k' },
  { value: 100, label: '€100k' },
  { value: 250, label: '€250k' },
  { value: 500, label: '€500k' },
  { value: 1000, label: '€1M' },
  { value: 2000, label: '€2M' },
  { value: 5000, label: '€5M' },
  { value: 10000, label: '€10M' },
  { value: 25000, label: '€25M' },
  { value: 50000, label: '€50M' },
  { value: 100000, label: '€100M+' },
];

const TICKET_STOP_VALUES = new Set(TICKET_STOPS.map((s) => s.value));

/** Parses a range answer `[min, max]` (stop values as strings). Returns null unless valid. */
export function parseRange(value: AnswerValue | undefined): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [minStr, maxStr] = value;
  if (minStr.trim() === '' || maxStr.trim() === '') return null;
  const min = Number(minStr);
  const max = Number(maxStr);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (!TICKET_STOP_VALUES.has(min) || !TICKET_STOP_VALUES.has(max)) return null;
  if (min > max) return null;
  return [min, max];
}

/**
 * Formats a € thousands amount. A TICKET_STOPS value uses that stop's label (e.g. 0 → "Under
 * €100k", 100000 → "€100M+"); otherwise below 1000 → "€<k>k" (450 → "€450k"), at or above 1000 →
 * "€<k/1000>M" without a trailing ".0" (2500 → "€2.5M", 25000 → "€25M").
 */
export function formatAmount(k: number): string {
  const stop = TICKET_STOPS.find((s) => s.value === k);
  if (stop) return stop.label;
  if (k < 1000) return `€${k}k`;
  const millions = Math.round((k / 1000) * 10) / 10;
  return `€${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
}

/** Formats a `[min, max]` € thousands range, e.g. "€2M – €5M". Equal ends format as a single amount. */
export function formatRange(range: [number, number]): string {
  const [min, max] = range;
  return min === max ? formatAmount(min) : `${formatAmount(min)} – ${formatAmount(max)}`;
}

/** Parses a scale answer (an integer string within the question's [min, max]). Returns null unless valid. */
export function parseScale(question: Question, value: AnswerValue | undefined): number | null {
  const scale = question.scale;
  if (!scale || typeof value !== 'string') return null;
  if (!/^-?\d+$/.test(value)) return null;
  const n = Number(value);
  if (n < scale.min || n > scale.max) return null;
  return n;
}

const SCALE_HELP = 'Tap a number from 1 to 10.';

function scaleQuestion(id: 'pressure' | 'transparency' | 'leadership' | 'risk', label: string, minLabel: string, maxLabel: string): Question {
  return {
    id,
    label,
    help: SCALE_HELP,
    kind: 'scale',
    required: true,
    scale: { min: 1, max: 10, minLabel, maxLabel },
  };
}

// Option ids are taxonomy keyword ids, so the chosen answer maps straight to a keyword.
const INVOLVEMENT_OPTIONS: QuestionOption[] = [
  { id: 'hands-on', label: 'Hands-on: weekly sparring and operational help' },
  { id: 'board-seat', label: 'Board seat: governance and strategy' },
  { id: 'network-access', label: 'Network: intros to customers, hires and investors' },
  { id: 'light-touch', label: 'Light-touch: available when needed' },
];

export const VALUE_OPTIONS: QuestionOption[] = [
  { id: 'transparency', label: 'Transparency' },
  { id: 'speed', label: 'Speed of execution' },
  { id: 'customer-obsession', label: 'Customer obsession' },
  { id: 'sustainability', label: 'Sustainability' },
  { id: 'integrity', label: 'Integrity' },
  { id: 'innovation', label: 'Bold innovation' },
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'craftsmanship', label: 'Craftsmanship' },
  { id: 'inclusion', label: 'Diversity & inclusion' },
  { id: 'frugality', label: 'Frugality' },
  { id: 'long-term', label: 'Long-term thinking' },
  { id: 'data-driven', label: 'Data-driven decisions' },
  { id: 'impact', label: 'Social impact' },
];

// Derived from the taxonomy's personality keywords, in taxonomy order, so the chosen answer maps
// straight to a keyword.
export const PERSONALITY_OPTIONS: QuestionOption[] = TAXONOMY.filter((t) => t.category === 'personality').map((t) => ({
  id: t.id,
  label: t.label,
}));

export const FOUNDER_QUESTIONS: Question[] = [
  { id: 'companyName', label: 'Company name', kind: 'text', required: true, maxLength: 60, page: 'basics' },
  { id: 'website', label: 'Company website', help: 'We read it to suggest keywords.', kind: 'url', required: false, maxLength: 200, page: 'basics' },
  { id: 'contactName', label: 'Point of contact', help: 'Who investors should reach out to.', kind: 'text', required: true, maxLength: 80, page: 'basics', excludeFromAi: true },
  { id: 'contactEmail', label: 'Contact email', kind: 'email', required: true, maxLength: 120, page: 'basics', excludeFromAi: true },
  { id: 'values', label: "Choose your company's three main values", help: 'Pick up to three.', kind: 'multi', required: true, maxSelections: 3, options: VALUE_OPTIONS },
  { id: 'stage', label: 'Current funding stage', kind: 'single', required: true, options: [...STAGES] },
  { id: 'raise', label: 'How much are you raising?', help: 'Drag both ends to set the range.', kind: 'range', required: true, stops: TICKET_STOPS, rangeLabels: ['Minimum raise', 'Maximum raise'] },
  { id: 'problemSolution', label: 'What is the problem and how do you solve it?', kind: 'longtext', required: true, maxLength: 600 },
  { id: 'growthMoM', label: 'Month-over-month growth', kind: 'text', required: false, maxLength: 100, page: 'metrics', placeholder: '+15% revenue MoM over the last 3 months' },
  { id: 'revenue', label: 'Revenue (ARR or MRR)', kind: 'text', required: false, maxLength: 100, page: 'metrics', placeholder: '€620k ARR, or pre-revenue' },
  { id: 'customers', label: 'Customers or active users', kind: 'text', required: false, maxLength: 100, page: 'metrics', placeholder: '40 paying clinics, or 12,000 monthly active users' },
  { id: 'retention', label: 'Retention or churn', kind: 'text', required: false, maxLength: 100, page: 'metrics', placeholder: '85% 6-month retention, or <2% monthly churn' },
  { id: 'runway', label: 'Runway', kind: 'text', required: false, maxLength: 100, page: 'metrics', placeholder: '14 months at current burn' },
  { id: 'team', label: 'Your team and experience', kind: 'longtext', required: true, maxLength: 400 },
  { id: 'involvement', label: 'What kind of investor involvement do you want?', help: 'Pick all that apply.', kind: 'multi', required: true, options: INVOLVEMENT_OPTIONS },
  { id: 'whyInvest', label: 'Why should an investor invest in you now?', kind: 'longtext', required: true, maxLength: 400 },
  { id: 'pitchVideo', label: 'Add a pitch video (max 1 minute)', help: 'Optional. Investors see it on your profile.', kind: 'video', required: false, excludeFromAi: true },
  scaleQuestion('pressure', 'How do you handle high-pressure moments?', 'I need calm to think clearly', 'I do my best work under fire'),
  scaleQuestion('transparency', 'How openly does information flow in your company?', 'Need-to-know basis', 'Everything is shared, good and bad'),
  scaleQuestion('leadership', 'What kind of leader are you?', 'Loose: I set direction and let go', 'Tight: I stay close to every decision'),
];

export const INVESTOR_QUESTIONS: Question[] = [
  { id: 'investorName', label: 'Your name', kind: 'text', required: true, maxLength: 60 },
  { id: 'fundName', label: 'Fund or firm', kind: 'text', required: true, maxLength: 60 },
  { id: 'stages', label: 'Which stages do you invest in?', kind: 'multi', required: true, options: [...STAGES] },
  { id: 'tickets', label: 'What ticket sizes can you provide?', help: 'Drag both ends to set your range.', kind: 'range', required: true, stops: TICKET_STOPS, rangeLabels: ['Minimum ticket', 'Maximum ticket'] },
  { id: 'valuesWanted', label: 'What do you value in a startup?', help: 'Pick up to three.', kind: 'multi', required: true, maxSelections: 3, options: PERSONALITY_OPTIONS },
  { id: 'regions', label: 'Which regions do you invest in?', kind: 'text', required: true, maxLength: 120 },
  { id: 'involvement', label: 'How involved are you after investing?', help: 'Pick all that apply.', kind: 'multi', required: true, options: INVOLVEMENT_OPTIONS },
  { id: 'founderFit', label: 'What are you looking for in a startup and what sectors do you prefer?', kind: 'longtext', required: true, maxLength: 300 },
  scaleQuestion('pressure', 'How hard do you push founders on targets?', 'Patient: long runway, light check-ins', 'Intense: clear targets, weekly check-ins'),
  scaleQuestion('transparency', 'How much transparency do you expect from founders?', 'Quarterly highlights are enough', 'Bad news the same day it happens'),
  scaleQuestion('risk', 'How much risk do you like to take?', 'Proven models, steady returns', 'Moonshots, all-or-nothing'),
];

export function questionsFor(role: Role): Question[] {
  return role === 'founder' ? FOUNDER_QUESTIONS : INVESTOR_QUESTIONS;
}

/** Titles shown above a multi-field questionnaire step (see `questionSteps` and `Question.page`). */
export const PAGE_TITLES: Record<string, string> = { basics: 'The basics', metrics: 'Key numbers' };

/**
 * Groups a role's questions into questionnaire steps: consecutive questions sharing the same
 * `page` render together on one step, and any question without a `page` gets its own step.
 */
export function questionSteps(role: Role): Question[][] {
  const steps: Question[][] = [];
  for (const q of questionsFor(role)) {
    const current = steps[steps.length - 1];
    if (q.page !== undefined && current && current[0].page === q.page) {
      current.push(q);
    } else {
      steps.push([q]);
    }
  }
  return steps;
}

function isEmpty(value: AnswerValue | undefined): boolean {
  if (value === undefined) return true;
  return Array.isArray(value) ? value.length === 0 : value.trim() === '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: AnswerValue | undefined): boolean {
  return typeof value === 'string' && EMAIL_RE.test(value.trim());
}

export function missingRequired(role: Role, answers: Answers): Question[] {
  return questionsFor(role).filter((q) => {
    if (!q.required) return false;
    if (q.kind === 'range') return parseRange(answers[q.id]) === null;
    if (q.kind === 'scale') return parseScale(q, answers[q.id]) === null;
    if (q.kind === 'email') return !isValidEmail(answers[q.id]);
    return isEmpty(answers[q.id]);
  });
}

export function formatAnswer(question: Question, value: AnswerValue | undefined): string {
  if (value === undefined) return '';
  if (question.kind === 'range') {
    const range = parseRange(value);
    return range ? formatRange(range) : '';
  }
  if (question.kind === 'scale') {
    const n = parseScale(question, value);
    if (n === null || !question.scale) return '';
    const { min, max, minLabel, maxLabel } = question.scale;
    return `${n}/${max} (${min} = ${minLabel}, ${max} = ${maxLabel})`;
  }
  const label = (id: string) => question.options?.find((o) => o.id === id)?.label ?? id;
  if (Array.isArray(value)) {
    if (question.options) return value.map(label).join(', ');
    return value.map((v) => v.trim()).filter((v) => v !== '').join(', ');
  }
  return question.options ? label(value) : value.trim();
}
