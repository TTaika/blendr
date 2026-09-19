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
      'companyName', 'values', 'stage', 'raise', 'problem',
      'solution', 'traction', 'team', 'involvement', 'whyInvest', 'workStyle',
    ]);
    expect(ids(INVESTOR_QUESTIONS)).toEqual([
      'investorName', 'fundName', 'stages', 'tickets', 'thesis',
      'regions', 'involvement', 'founderFit', 'workStyle',
    ]);
  });

  it('limits each company value to 30 characters', () => {
    expect(FOUNDER_QUESTIONS.find((q) => q.id === 'values')?.maxLength).toBe(30);
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

  it('formats a values answer by trimming entries and joining with a comma', () => {
    const values = FOUNDER_QUESTIONS.find((q) => q.id === 'values')!;
    expect(formatAnswer(values, [' A ', 'B', 'C'])).toBe('A, B, C');
    expect(formatAnswer(values, [' A ', '', 'C'])).toBe('A, C');
  });

  it('flags a required values question as missing unless it has exactly 3 non-empty trimmed entries', () => {
    expect(missingRequired('founder', { values: ['A', '', 'C'] }).map((q) => q.id)).toContain('values');
    expect(missingRequired('founder', { values: ['A', 'B'] }).map((q) => q.id)).toContain('values');
    expect(missingRequired('founder', { values: ['A', 'B', 'C'] }).map((q) => q.id)).not.toContain('values');
  });
});
