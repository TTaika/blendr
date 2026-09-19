import { describe, expect, it } from 'vitest';
import type { Profile } from '../../shared/types';
import { companyFromFounderProfile } from './founderCard';

const profile: Profile = {
  role: 'founder',
  answers: {
    companyName: ' Acme ',
    website: ' https://acme.example ',
    contactName: ' Ada Lovelace ',
    contactEmail: ' ada@acme.example ',
    values: ['transparency', 'bogus-id', 'speed', 'integrity', 'craftsmanship'],
    stage: 'series-a',
    raise: ['5000', '10000'],
    problemSolution: 'P and S',
    growthMoM: ' +15% MoM ',
    revenue: '€620k ARR',
    customers: '',
    retention: '   ',
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
      raise: [5000, 10000],
      problem: 'P and S',
      solution: '',
      team: 'Team',
      whyInvest: 'W',
      website: 'https://acme.example',
      keywords: [{ id: 'fintech', reason: 'Payments' }],
    });
    // maps option ids to labels, drops unknown ids, and keeps only the first 3
    expect(c.values).toEqual(['Transparency', 'Speed of execution', 'Integrity']);
    expect(c.contact).toEqual({ name: 'Ada Lovelace', title: 'Point of contact', email: 'ada@acme.example' });
  });

  it('maps filled metrics to key numbers with their card labels, trimmed, in order, skipping empty, blank or missing ones', () => {
    const c = companyFromFounderProfile(profile);
    expect(c.keyNumbers).toEqual([
      { label: 'MoM growth', value: '+15% MoM' },
      { label: 'Revenue', value: '€620k ARR' },
    ]);
  });

  it('uses safe fallbacks for missing answers', () => {
    const c = companyFromFounderProfile({ ...profile, answers: {} });
    expect(c.name).toBe('Your company');
    expect(c.stage).toBe('pre-seed');
    expect(c.raise).toEqual([0, 100000]);
    expect(c.keyNumbers).toEqual([]);
    expect(c.values).toEqual([]);
    expect(c.website).toBe('');
    expect(c.contact).toEqual({ name: '', title: 'Point of contact', email: '' });
  });
});
