import { VALUE_OPTIONS } from '../../shared/questions';
import { isStageId, isTicketId } from '../../shared/taxonomy';
import type { AnswerValue, Company, Profile } from '../../shared/types';

const text = (value: AnswerValue | undefined) => (typeof value === 'string' ? value.trim() : '');
const VALUE_LABEL_BY_ID = new Map(VALUE_OPTIONS.map((o) => [o.id, o.label]));

/** Shapes a founder's answers like a feed company so they can preview their own card. */
export function companyFromFounderProfile(profile: Profile): Company {
  const a = profile.answers;
  const traction = text(a.traction);
  const rawValues = Array.isArray(a.values) ? a.values : [];
  const values = rawValues
    .map((id) => VALUE_LABEL_BY_ID.get(id))
    .filter((label): label is string => label !== undefined)
    .slice(0, 3);
  return {
    id: 'founder-preview',
    name: text(a.companyName) || 'Your company',
    values,
    stage: isStageId(a.stage) ? a.stage : 'pre-seed',
    raise: isTicketId(a.raise) ? a.raise : 't-under-500k',
    keywords: profile.keywords.map(({ id, reason }) => ({ id, reason })),
    problem: text(a.problem),
    solution: text(a.solution),
    team: text(a.team),
    keyNumbers: traction ? [{ label: 'Traction', value: traction }] : [],
    whyInvest: text(a.whyInvest),
    website: '',
    contact: { name: '', title: '', email: '' },
  };
}
