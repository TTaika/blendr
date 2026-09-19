import { parseRange } from '../../shared/questions';
import { getKeyword, type KeywordCategory } from '../../shared/taxonomy';
import type { AnswerValue, Company, FeedEntry, Profile } from '../../shared/types';

export interface InvestorCriteria {
  stages: string[];
  ticketRange: [number, number] | null;
  keywordIds: string[];
}

export interface MatchResult {
  score: number;
  matched: string[];
}

const STAGE_POINTS = 10;
const TICKET_POINTS = 7;
const CATEGORY_POINTS: Record<KeywordCategory, { per: number; max: number }> = {
  sector: { per: 5, max: 10 },
  geography: { per: 5, max: 5 },
  model: { per: 3, max: 3 },
  involvement: { per: 5, max: 5 },
  personality: { per: 20, max: 60 },
};

function asList(value: AnswerValue | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function criteriaFromProfile(profile: Profile): InvestorCriteria {
  return {
    stages: asList(profile.answers.stages),
    ticketRange: parseRange(profile.answers.tickets),
    keywordIds: profile.keywords.map((k) => k.id),
  };
}

// 100000 ("€100M+") is the top of the TICKET_STOPS scale and stands for "or more".
const toUpperBound = (value: number) => (value >= 100000 ? Infinity : value);

function ticketFits(ticketRange: [number, number] | null, raise: Company['raise']): boolean {
  if (!ticketRange) return false;
  const [invMin, invMaxRaw] = ticketRange;
  const invMax = toUpperBound(invMaxRaw);
  const [compMin, compMaxRaw] = raise;
  const compMax = toUpperBound(compMaxRaw);
  return invMin <= compMax && invMax >= compMin;
}

export function scoreCompany(criteria: InvestorCriteria, company: Company): MatchResult {
  let score = 0;
  if (criteria.stages.includes(company.stage)) score += STAGE_POINTS;
  if (ticketFits(criteria.ticketRange, company.raise)) score += TICKET_POINTS;

  const wanted = new Set(criteria.keywordIds);
  const matched = company.keywords.map((k) => k.id).filter((id) => wanted.has(id));
  const countByCategory = new Map<KeywordCategory, number>();
  for (const id of matched) {
    const category = getKeyword(id)?.category;
    if (category) countByCategory.set(category, (countByCategory.get(category) ?? 0) + 1);
  }
  for (const [category, count] of countByCategory) {
    const { per, max } = CATEGORY_POINTS[category];
    score += Math.min(count * per, max);
  }
  return { score, matched };
}

export function rankFeed(criteria: InvestorCriteria, companies: Company[]): FeedEntry[] {
  return companies
    .map((company) => ({ company, ...scoreCompany(criteria, company) }))
    .sort((a, b) => b.score - a.score || a.company.name.localeCompare(b.company.name))
    .map(({ company, score, matched }) => ({ companyId: company.id, score, matched }));
}

export function randomFeed(companies: Company[], random: () => number = Math.random): FeedEntry[] {
  const ids = companies.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.map((companyId) => ({ companyId, matched: [] }));
}

export function topKeywords(company: Company, matched: string[], limit = 4): { id: string; reason: string }[] {
  const isMatched = new Set(matched);
  return [
    ...company.keywords.filter((k) => isMatched.has(k.id)),
    ...company.keywords.filter((k) => !isMatched.has(k.id)),
  ].slice(0, limit);
}

export type PersonalityFit = 'strong' | 'some' | 'different';

export const FIT_LABELS: Record<PersonalityFit, string> = {
  strong: 'Strong personality fit',
  some: 'Some common ground',
  different: 'Different styles, could complement',
};

/** Counts matched ids in the personality taxonomy category: ≥2 is a strong fit, 1 is some, 0 is different. */
export function personalityFit(matched: string[]): PersonalityFit {
  const count = matched.filter((id) => getKeyword(id)?.category === 'personality').length;
  if (count >= 2) return 'strong';
  if (count === 1) return 'some';
  return 'different';
}

/** The matched ids that are personality keywords, in company keyword order. */
export function sharedPersonality(company: Company, matched: string[]): string[] {
  const isMatched = new Set(matched);
  return company.keywords.filter((k) => isMatched.has(k.id) && getKeyword(k.id)?.category === 'personality').map((k) => k.id);
}
