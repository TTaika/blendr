import { describe, expect, it } from 'vitest';
import type { Profile } from '../../shared/types';
import { companyFromFounderProfile } from './founderCard';

const profile: Profile = {
  role: 'founder',
  answers: {
    companyName: ' Acme ',
    values: ['transparency', 'bogus-id', 'speed', 'integrity', 'craftsmanship'],
    stage: 'series-a',
    raise: 't-5m-15m',
    problem: 'P',
    solution: 'S',
    traction: '€1M ARR',
    team: 'Team',
    whyInvest: 'W',
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
      website: '',
      keywords: [{ id: 'fintech', reason: 'Payments' }],
      keyNumbers: [{ label: 'Traction', value: '€1M ARR' }],
    });
    // maps option ids to labels, drops unknown ids, and keeps only the first 3
    expect(c.values).toEqual(['Transparency', 'Speed of execution', 'Integrity']);
  });

  it('uses safe fallbacks for missing answers', () => {
    const c = companyFromFounderProfile({ ...profile, answers: {} });
    expect(c.name).toBe('Your company');
    expect(c.stage).toBe('pre-seed');
    expect(c.raise).toBe('t-under-500k');
    expect(c.keyNumbers).toEqual([]);
    expect(c.values).toEqual([]);
  });
});
