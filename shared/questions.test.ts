import { describe, expect, it } from 'vitest';
import { FOUNDER_QUESTIONS, INVESTOR_QUESTIONS, TICKET_STOPS, VALUE_OPTIONS, formatAmount, formatAnswer, formatRange, missingRequired, parseRange, questionsFor } from './questions';
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

  it('makes both involvement questions multiple choice', () => {
    for (const q of [FOUNDER_QUESTIONS, INVESTOR_QUESTIONS].map((qs) => qs.find((x) => x.id === 'involvement')!)) {
      expect(q.kind).toBe('multi');
      expect(q.required).toBe(true);
      expect(q.maxSelections).toBeUndefined();
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
      tickets: ['500', '5000'],
    });
    expect(ids(missing)).toEqual(['fundName', 'stages', 'thesis', 'regions', 'involvement', 'founderFit', 'workStyle']);
  });

  it('treats a valid two-stop range as answered, and anything else as missing', () => {
    const missingFor = (tickets: string[]) =>
      missingRequired('investor', {
        investorName: 'Sara',
        fundName: 'Birch',
        stages: ['seed'],
        thesis: 'T',
        regions: 'Nordics',
        involvement: 'hands-on',
        founderFit: 'F',
        workStyle: 'W',
        tickets,
      }).map((q) => q.id);
    expect(missingFor(['500', '5000'])).not.toContain('tickets');
    expect(missingFor([])).toContain('tickets');
    expect(missingFor(['500'])).toContain('tickets');
    expect(missingFor(['t-2m-5m'])).toContain('tickets');
  });

  it('has 11 ticket stops from under €100k to €100M+', () => {
    const tickets = INVESTOR_QUESTIONS.find((q) => q.id === 'tickets')!;
    expect(tickets.kind).toBe('range');
    expect(tickets.stops).toBe(TICKET_STOPS);
    expect(TICKET_STOPS).toHaveLength(11);
    expect(TICKET_STOPS[0]).toEqual({ value: 0, label: 'Under €100k' });
    expect(TICKET_STOPS[TICKET_STOPS.length - 1]).toEqual({ value: 100000, label: '€100M+' });
  });

  it('parseRange rejects malformed values, including min > max', () => {
    expect(parseRange(['500', '5000'])).toEqual([500, 5000]);
    expect(parseRange(['5000', '500'])).toBeNull();
    expect(parseRange(undefined)).toBeNull();
    expect(parseRange([])).toBeNull();
    expect(parseRange(['500'])).toBeNull();
    expect(parseRange(['t-2m-5m'])).toBeNull();
    expect(parseRange('500')).toBeNull();
  });

  it('formats a range answer with stop labels', () => {
    const tickets = INVESTOR_QUESTIONS.find((q) => q.id === 'tickets')!;
    expect(formatAnswer(tickets, ['500', '5000'])).toBe('€500k – €5M');
    expect(formatAnswer(tickets, ['5000', '500'])).toBe('');
    expect(formatAnswer(tickets, [])).toBe('');
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

describe('formatAmount', () => {
  it('uses the TICKET_STOPS label for a stop value', () => {
    expect(formatAmount(0)).toBe('Under €100k');
    expect(formatAmount(100000)).toBe('€100M+');
    expect(formatAmount(25000)).toBe('€25M');
  });

  it('formats amounts below €1M in thousands', () => {
    expect(formatAmount(450)).toBe('€450k');
  });

  it('formats amounts at or above €1M in millions without a trailing .0', () => {
    expect(formatAmount(2500)).toBe('€2.5M');
    expect(formatAmount(8500)).toBe('€8.5M');
  });
});

describe('formatRange', () => {
  it('formats an equal-ends range as a single amount', () => {
    expect(formatRange([2500, 2500])).toBe('€2.5M');
  });

  it('formats a min–max range with an en dash', () => {
    expect(formatRange([500, 5000])).toBe('€500k – €5M');
  });
});
