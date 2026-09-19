import { describe, expect, it } from 'vitest';
import type { Profile } from '../../shared/types';
import { companyFromFounderProfile } from './founderCard';

const profile: Profile = {
  role: 'founder',
  answers: {
    companyName: ' Acme ',
    oneLiner: 'x'.repeat(120),
    stage: 'series-a',
    raise: 't-5m-15m',
    problem: 'P',
    solution: 'S',
    traction: '€1M ARR',
    team: 'Team',
    whyInvest: 'W',
    website: 'acme.example',
  },
  summary: 'Acme does X',
  keywords: [{ id: 'fintech', reason: 'Payments', source: 'ai' }],
};

describe('companyFromFounderProfile', () => {
  it('builds an investor-facing card from the founder answers', () => {
    const c = companyFromFounderProfile(profile);
    expect(c).toMatchObject({
      id: 'founder-preview',
      name: 'Acme',
      stage: 'series-a',
      raise: 't-5m-15m',
      problem: 'P',
      solution: 'S',
      team: 'Team',
      whyInvest: 'W',
      website: 'acme.example',
      keywords: [{ id: 'fintech', reason: 'Payments' }],
      keyNumbers: [{ label: 'Traction', value: '€1M ARR' }],
    });
    expect(c.oneLiner).toHaveLength(100);
  });

  it('uses safe fallbacks for missing answers', () => {
    const c = companyFromFounderProfile({ ...profile, answers: {} });
    expect(c.name).toBe('Your company');
    expect(c.stage).toBe('pre-seed');
    expect(c.raise).toBe('t-under-500k');
    expect(c.keyNumbers).toEqual([]);
  });
});
