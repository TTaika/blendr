import { describe, expect, it } from 'vitest';
import { FOUNDER_QUESTIONS, INVESTOR_QUESTIONS, VALUE_OPTIONS, formatAnswer, missingRequired, questionsFor } from './questions';
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

  it('makes the values question a multi-choice with at most 3 selections from 14 options', () => {
    const values = FOUNDER_QUESTIONS.find((q) => q.id === 'values')!;
    expect(values.kind).toBe('multi');
    expect(values.maxSelections).toBe(3);
    expect(values.options).toEqual(VALUE_OPTIONS);
    expect(VALUE_OPTIONS).toHaveLength(14);
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

  it('formats a values answer by mapping option ids to labels', () => {
    expect(formatAnswer(FOUNDER_QUESTIONS.find((q) => q.id === 'values')!, ['transparency', 'integrity'])).toBe('Transparency, Integrity');
  });

  it('flags a required values question as missing when empty, and present with at least one selection', () => {
    expect(missingRequired('founder', { values: [] }).map((q) => q.id)).toContain('values');
    expect(missingRequired('founder', { values: ['transparency'] }).map((q) => q.id)).not.toContain('values');
  });
});
