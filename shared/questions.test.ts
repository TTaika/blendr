import { describe, expect, it } from 'vitest';
import { FOUNDER_QUESTIONS, INVESTOR_QUESTIONS, formatAnswer, missingRequired, questionsFor } from './questions';
import { getKeyword } from './taxonomy';

const ids = (qs: { id: string }[]) => qs.map((q) => q.id);

describe('questions', () => {
  it('has unique ids per role', () => {
    for (const qs of [FOUNDER_QUESTIONS, INVESTOR_QUESTIONS]) {
      expect(new Set(ids(qs)).size).toBe(qs.length);
    }
  });

  it('defines the answer ids other modules rely on', () => {
    expect(ids(FOUNDER_QUESTIONS)).toEqual([
      'companyName', 'website', 'oneLiner', 'stage', 'raise', 'problem',
      'solution', 'traction', 'team', 'involvement', 'whyInvest', 'workStyle',
    ]);
    expect(ids(INVESTOR_QUESTIONS)).toEqual([
      'investorName', 'fundName', 'website', 'stages', 'tickets', 'thesis',
      'regions', 'involvement', 'founderFit', 'workStyle',
    ]);
  });

  it('limits the founder one-liner to 100 characters', () => {
    expect(FOUNDER_QUESTIONS.find((q) => q.id === 'oneLiner')?.maxLength).toBe(100);
  });

  it('gives every choice question options, and involvement options are taxonomy keywords', () => {
    for (const q of [...FOUNDER_QUESTIONS, ...INVESTOR_QUESTIONS]) {
      if (q.kind === 'single' || q.kind === 'multi') expect(q.options?.length).toBeGreaterThan(1);
    }
    for (const q of [FOUNDER_QUESTIONS, INVESTOR_QUESTIONS].map((qs) => qs.find((x) => x.id === 'involvement')!)) {
      for (const o of q.options!) expect(getKeyword(o.id)?.category).toBe('involvement');
    }
  });

  it('returns the questions for a role', () => {
    expect(questionsFor('founder')).toBe(FOUNDER_QUESTIONS);
    expect(questionsFor('investor')).toBe(INVESTOR_QUESTIONS);
  });

  it('lists required questions that are empty, ignoring optional ones', () => {
    const missing = missingRequired('investor', {
      investorName: 'Sara',
      fundName: '   ',
      stages: [],
      tickets: ['t-2m-5m'],
    });
    expect(ids(missing)).toEqual(['fundName', 'stages', 'thesis', 'regions', 'involvement', 'founderFit', 'workStyle']);
  });

  it('formats answers with option labels', () => {
    const stage = FOUNDER_QUESTIONS.find((q) => q.id === 'stage')!;
    const stages = INVESTOR_QUESTIONS.find((q) => q.id === 'stages')!;
    const team = FOUNDER_QUESTIONS.find((q) => q.id === 'team')!;
    expect(formatAnswer(stage, 'seed')).toBe('Seed');
    expect(formatAnswer(stages, ['seed', 'series-a'])).toBe('Seed, Series A');
    expect(formatAnswer(team, '  Two founders ')).toBe('Two founders');
    expect(formatAnswer(team, undefined)).toBe('');
  });
});
