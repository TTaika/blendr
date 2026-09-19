import { STAGES } from './taxonomy';
import type { AnswerValue, Answers, Role } from './types';

export type QuestionKind = 'text' | 'longtext' | 'url' | 'single' | 'multi' | 'range';

export interface QuestionOption {
  id: string;
  label: string;
}

export interface QuestionStop {
  value: number;
  label: string;
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
  { id: 'ownership', label: 'Ownership' },
  { id: 'craftsmanship', label: 'Craftsmanship' },
  { id: 'inclusion', label: 'Diversity & inclusion' },
  { id: 'frugality', label: 'Frugality' },
  { id: 'long-term', label: 'Long-term thinking' },
  { id: 'data-driven', label: 'Data-driven decisions' },
  { id: 'impact', label: 'Social impact' },
];

export const FOUNDER_QUESTIONS: Question[] = [
  { id: 'companyName', label: 'Company name', kind: 'text', required: true, maxLength: 60 },
  { id: 'values', label: "Choose your company's three main values", help: 'Pick up to three.', kind: 'multi', required: true, maxSelections: 3, options: VALUE_OPTIONS },
  { id: 'stage', label: 'Current funding stage', kind: 'single', required: true, options: [...STAGES] },
  { id: 'raise', label: 'How much are you raising?', help: 'Drag both ends to set the range.', kind: 'range', required: true, stops: TICKET_STOPS, rangeLabels: ['Minimum raise', 'Maximum raise'] },
  { id: 'problem', label: 'What problem are you solving?', kind: 'longtext', required: true, maxLength: 400 },
  { id: 'solution', label: 'How do you solve it?', kind: 'longtext', required: true, maxLength: 400 },
  { id: 'traction', label: 'Key numbers and growth', help: 'e.g. ARR, month-on-month growth, users, pilots', kind: 'longtext', required: true, maxLength: 300 },
  { id: 'team', label: 'Your team and experience', kind: 'longtext', required: true, maxLength: 400 },
  { id: 'involvement', label: 'What kind of investor involvement do you want?', help: 'Pick all that apply.', kind: 'multi', required: true, options: INVOLVEMENT_OPTIONS },
  { id: 'whyInvest', label: 'Why should an investor invest in you now?', kind: 'longtext', required: true, maxLength: 400 },
  { id: 'workStyle', label: 'How would your co-founders describe the way you work?', help: 'Used to match personalities.', kind: 'longtext', required: true, maxLength: 300 },
];

export const INVESTOR_QUESTIONS: Question[] = [
  { id: 'investorName', label: 'Your name', kind: 'text', required: true, maxLength: 60 },
  { id: 'fundName', label: 'Fund or firm', kind: 'text', required: true, maxLength: 60 },
  { id: 'stages', label: 'Which stages do you invest in?', kind: 'multi', required: true, options: [...STAGES] },
  { id: 'tickets', label: 'What ticket sizes can you provide?', help: 'Drag both ends to set your range.', kind: 'range', required: true, stops: TICKET_STOPS, rangeLabels: ['Minimum ticket', 'Maximum ticket'] },
  { id: 'thesis', label: 'Describe your investment thesis', help: 'Sectors, business models, what excites you', kind: 'longtext', required: true, maxLength: 400 },
  { id: 'regions', label: 'Which regions do you invest in?', kind: 'text', required: true, maxLength: 120 },
  { id: 'involvement', label: 'How involved are you after investing?', help: 'Pick all that apply.', kind: 'multi', required: true, options: INVOLVEMENT_OPTIONS },
  { id: 'founderFit', label: 'What makes you say yes to a founder?', kind: 'longtext', required: true, maxLength: 300 },
  { id: 'workStyle', label: 'How would founders you have backed describe working with you?', help: 'Used to match personalities.', kind: 'longtext', required: true, maxLength: 300 },
];

export function questionsFor(role: Role): Question[] {
  return role === 'founder' ? FOUNDER_QUESTIONS : INVESTOR_QUESTIONS;
}

function isEmpty(value: AnswerValue | undefined): boolean {
  if (value === undefined) return true;
  return Array.isArray(value) ? value.length === 0 : value.trim() === '';
}

export function missingRequired(role: Role, answers: Answers): Question[] {
  return questionsFor(role).filter((q) => {
    if (!q.required) return false;
    if (q.kind === 'range') return parseRange(answers[q.id]) === null;
    return isEmpty(answers[q.id]);
  });
}

export function formatAnswer(question: Question, value: AnswerValue | undefined): string {
  if (value === undefined) return '';
  if (question.kind === 'range') {
    const range = parseRange(value);
    return range ? formatRange(range) : '';
  }
  const label = (id: string) => question.options?.find((o) => o.id === id)?.label ?? id;
  if (Array.isArray(value)) {
    if (question.options) return value.map(label).join(', ');
    return value.map((v) => v.trim()).filter((v) => v !== '').join(', ');
  }
  return question.options ? label(value) : value.trim();
}
