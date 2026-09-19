import { FOUNDER_QUESTIONS, VALUE_OPTIONS, isAsked, parseAmount, parseRange } from '../../shared/questions';
import { isStageId } from '../../shared/taxonomy';
import type { AnswerValue, Company, Profile } from '../../shared/types';

const text = (value: AnswerValue | undefined) => (typeof value === 'string' ? value.trim() : '');
const VALUE_LABEL_BY_ID = new Map(VALUE_OPTIONS.map((o) => [o.id, o.label]));
const RAISED_QUESTION = FOUNDER_QUESTIONS.find((q) => q.id === 'raisedSoFar')!;

// The founder "Key numbers" page's questions, in order, with their short card labels.
const METRIC_FIELDS: { id: string; label: string }[] = [
  { id: 'growthMoM', label: 'MoM growth' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'customers', label: 'Customers / users' },
  { id: 'retention', label: 'Retention' },
  { id: 'runway', label: 'Runway' },
];

/** Shapes a founder's answers like a feed company so they can preview their own card. */
export function companyFromFounderProfile(profile: Profile): Company {
  const a = profile.answers;
  const keyNumbers = METRIC_FIELDS.map(({ id, label }) => ({ label, value: text(a[id]) })).filter((n) => n.value !== '');
  const rawValues = Array.isArray(a.values) ? a.values : [];
  const values = rawValues
    .map((id) => VALUE_LABEL_BY_ID.get(id))
    .filter((label): label is string => label !== undefined)
    .slice(0, 3);
  // Ignores an amount kept from before the founder went back and picked Pre-seed.
  const raised = isAsked(RAISED_QUESTION, a) ? parseAmount(a.raisedSoFar) : null;
  return {
    id: 'founder-preview',
    name: text(a.companyName) || 'Your company',
    values,
    stage: isStageId(a.stage) ? a.stage : 'pre-seed',
    raise: parseRange(a.raise) ?? [0, 100000],
    ...(raised !== null && { raised }),
    keywords: profile.keywords.map(({ id, reason }) => ({ id, reason })),
    problem: text(a.problemSolution),
    solution: '',
    team: text(a.team),
    keyNumbers,
    whyInvest: text(a.whyInvest),
    website: text(a.website),
    contact: { name: text(a.contactName), title: 'Point of contact', email: text(a.contactEmail) },
  };
}
