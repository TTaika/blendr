import { isStageId, isTicketId } from '../../shared/taxonomy';
import type { AnswerValue, Company, Profile } from '../../shared/types';

const text = (value: AnswerValue | undefined) => (typeof value === 'string' ? value.trim() : '');

/** Shapes a founder's answers like a feed company so they can preview their own card. */
export function companyFromFounderProfile(profile: Profile): Company {
  const a = profile.answers;
  const traction = text(a.traction);
  const rawValues = Array.isArray(a.values) ? a.values : [];
  const values = rawValues.map((v) => v.trim()).filter((v) => v !== '').slice(0, 3);
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
