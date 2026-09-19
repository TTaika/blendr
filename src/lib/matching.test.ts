import { describe, expect, it } from 'vitest';
import type { Company } from '../../shared/types';
import { COMPANIES } from '../data/companies';
import { criteriaFromProfile, randomFeed, rankFeed, scoreCompany, topKeywords, type InvestorCriteria } from './matching';

const company = (overrides: Partial<Company> = {}): Company => ({
  id: 'acme',
  name: 'Acme',
  values: ['Customer trust', 'Fast execution', 'Simple pricing'],
  stage: 'seed',
  raise: [2000, 5000],
  keywords: [
    { id: 'fintech', reason: 'r' },
    { id: 'ai-ml', reason: 'r' },
    { id: 'b2b', reason: 'r' },
    { id: 'nordics', reason: 'r' },
    { id: 'hands-on', reason: 'r' },
    { id: 'data-driven', reason: 'r' },
    { id: 'technical', reason: 'r' },
  ],
  problem: 'p',
  solution: 's',
  team: 't',
  keyNumbers: [],
  whyInvest: 'w',
  website: 'https://acme.example',
  contact: { name: 'A', title: 'CEO', email: 'a@acme.example' },
  ...overrides,
});

const none: InvestorCriteria = { stages: [], ticketRange: null, keywordIds: [] };

describe('scoreCompany', () => {
  it('scores a perfect match as 100', () => {
    const criteria: InvestorCriteria = {
      stages: ['seed'],
      ticketRange: [2000, 5000],
      keywordIds: ['fintech', 'ai-ml', 'b2b', 'nordics', 'hands-on', 'data-driven', 'technical'],
    };
    expect(scoreCompany(criteria, company()).score).toBe(100);
  });

  it('gives 25 for stage fit and 15 for ticket fit', () => {
    expect(scoreCompany({ ...none, stages: ['seed'] }, company()).score).toBe(25);
    expect(scoreCompany({ ...none, ticketRange: [2000, 5000] }, company()).score).toBe(15);
    expect(scoreCompany(none, company()).score).toBe(0);
  });

  it('applies ticket fit when the investor range and the raise range overlap as closed ranges', () => {
    expect(scoreCompany({ ...none, ticketRange: [2000, 5000] }, company({ raise: [2000, 5000] })).score).toBe(15);
    expect(scoreCompany({ ...none, ticketRange: [2000, 5000] }, company({ raise: [5000, 10000] })).score).toBe(15);
    expect(scoreCompany({ ...none, ticketRange: [100, 250] }, company({ raise: [500, 2000] })).score).toBe(0);
    expect(scoreCompany({ ...none, ticketRange: [50000, 100000] }, company({ raise: [25000, 50000] })).score).toBe(15);
    expect(scoreCompany({ ...none, ticketRange: null }, company({ raise: [2000, 5000] })).score).toBe(0);
  });

  it('caps sector points at 30', () => {
    const c = company({ keywords: [{ id: 'fintech', reason: 'r' }, { id: 'ai-ml', reason: 'r' }, { id: 'b2b-saas', reason: 'r' }] });
    expect(scoreCompany({ ...none, keywordIds: ['fintech', 'ai-ml', 'b2b-saas'] }, c).score).toBe(30);
  });

  it('returns shared keyword ids in company order', () => {
    const result = scoreCompany({ ...none, keywordIds: ['technical', 'nordics', 'climate'] }, company());
    expect(result.matched).toEqual(['nordics', 'technical']);
  });
});

describe('rankFeed', () => {
  it('sorts by score, then by name', () => {
    const feed = rankFeed({ stages: ['seed'], ticketRange: [2000, 5000], keywordIds: [] }, [
      company({ id: 'b', name: 'Beta', stage: 'series-a', raise: [5000, 10000] }),
      company({ id: 'high', name: 'Zeta' }),
      company({ id: 'a', name: 'Alpha', stage: 'series-a', raise: [5000, 10000] }),
    ]);
    expect(feed.map((e) => e.companyId)).toEqual(['high', 'a', 'b']);
    expect(feed[0]).toEqual({ companyId: 'high', score: 40, matched: [] });
  });

  it('puts Northlight Grid first for a Nordic climate seed investor', () => {
    const feed = rankFeed(
      { stages: ['seed'], ticketRange: [2000, 5000], keywordIds: ['climate', 'usage-based', 'nordics', 'hands-on', 'technical'] },
      COMPANIES,
    );
    expect(feed[0]).toEqual({
      companyId: 'northlight-grid',
      score: 80,
      matched: ['climate', 'usage-based', 'nordics', 'hands-on', 'technical'],
    });
    expect(feed).toHaveLength(COMPANIES.length);
  });
});

describe('randomFeed', () => {
  it('shuffles with the given random source and has no scores', () => {
    const cs = ['a', 'b', 'c', 'd'].map((id) => company({ id }));
    const feed = randomFeed(cs, () => 0);
    expect(feed.map((e) => e.companyId)).toEqual(['b', 'c', 'd', 'a']);
    expect(feed.every((e) => e.score === undefined && e.matched.length === 0)).toBe(true);
  });

  it('keeps every company exactly once', () => {
    const ids = randomFeed(COMPANIES).map((e) => e.companyId);
    expect([...ids].sort()).toEqual(COMPANIES.map((c) => c.id).sort());
  });
});

describe('topKeywords', () => {
  it('lists matched keywords first and respects the limit', () => {
    expect(topKeywords(company(), ['technical', 'nordics'], 3).map((k) => k.id)).toEqual(['nordics', 'technical', 'fintech']);
    expect(topKeywords(company(), [])).toHaveLength(4);
  });
});

describe('criteriaFromProfile', () => {
  it('reads stages, ticket range and keyword ids', () => {
    expect(
      criteriaFromProfile({
        role: 'investor',
        answers: { stages: ['seed', 'series-a'], tickets: ['2000', '5000'] },
        summary: '',
        keywords: [{ id: 'fintech', reason: 'r', source: 'ai' }],
      }),
    ).toEqual({ stages: ['seed', 'series-a'], ticketRange: [2000, 5000], keywordIds: ['fintech'] });
  });

  it('gives a null ticket range for a missing or legacy answer', () => {
    expect(
      criteriaFromProfile({
        role: 'investor',
        answers: { stages: ['seed'] },
        summary: '',
        keywords: [],
      }).ticketRange,
    ).toBeNull();
    expect(
      criteriaFromProfile({
        role: 'investor',
        answers: { stages: ['seed'], tickets: 't-2m-5m' },
        summary: '',
        keywords: [],
      }).ticketRange,
    ).toBeNull();
  });
});
