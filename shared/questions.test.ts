import { describe, expect, it } from 'vitest';
import { FOUNDER_QUESTIONS, INVESTOR_QUESTIONS, PERSONALITY_OPTIONS, TICKET_STOPS, VALUE_OPTIONS, formatAmount, formatAnswer, formatRange, missingRequired, parseRange, questionSteps, questionsFor } from './questions';
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
      'companyName', 'website', 'contactName', 'contactEmail',
      'values', 'stage', 'raise', 'problemSolution',
      'traction', 'team', 'involvement', 'whyInvest',
      'pressure', 'transparency', 'leadership',
    ]);
    expect(ids(INVESTOR_QUESTIONS)).toEqual([
      'investorName', 'fundName', 'stages', 'tickets', 'valuesWanted',
      'regions', 'involvement', 'founderFit',
      'pressure', 'transparency', 'risk',
    ]);
  });

  it('groups the founder basics questions into one step and gives every other question its own step', () => {
    const steps = questionSteps('founder');
    expect(steps).toHaveLength(12);
    expect(ids(steps[0])).toEqual(['companyName', 'website', 'contactName', 'contactEmail']);
    expect(ids(steps[1])).toEqual(['values']);
    expect(ids(steps[11])).toEqual(['leadership']);
    for (const step of steps.slice(1)) expect(step).toHaveLength(1);
  });

  it('gives investors 11 steps of one question each', () => {
    const steps = questionSteps('investor');
    expect(steps).toHaveLength(11);
    for (const step of steps) expect(step).toHaveLength(1);
    expect(ids(steps[0])).toEqual(['investorName']);
  });

  it('marks the contact questions as excluded from the AI prompt, and companyName as included', () => {
    expect(FOUNDER_QUESTIONS.find((q) => q.id === 'contactName')?.excludeFromAi).toBe(true);
    expect(FOUNDER_QUESTIONS.find((q) => q.id === 'contactEmail')?.excludeFromAi).toBe(true);
    expect(FOUNDER_QUESTIONS.find((q) => q.id === 'companyName')?.excludeFromAi).toBeUndefined();
  });

  it('validates the contact email format in missingRequired', () => {
    const base = { companyName: 'Acme', contactName: 'Ada' };
    expect(missingRequired('founder', { ...base, contactEmail: 'a@b.co' }).map((q) => q.id)).not.toContain('contactEmail');
    expect(missingRequired('founder', { ...base, contactEmail: '' }).map((q) => q.id)).toContain('contactEmail');
    expect(missingRequired('founder', { ...base, contactEmail: 'nope' }).map((q) => q.id)).toContain('contactEmail');
    expect(missingRequired('founder', { ...base, contactEmail: 'a@b' }).map((q) => q.id)).toContain('contactEmail');
    expect(missingRequired('founder', base).map((q) => q.id)).toContain('contactEmail');
  });

  it('treats the founder website as optional', () => {
    expect(missingRequired('founder', {}).map((q) => q.id)).not.toContain('website');
  });

  it('combines the problem and solution questions into a single problemSolution question', () => {
    const q = FOUNDER_QUESTIONS.find((x) => x.id === 'problemSolution')!;
    expect(q.label).toBe('What is the problem and how do you solve it?');
    expect(q.kind).toBe('longtext');
    expect(q.required).toBe(true);
    expect(q.maxLength).toBe(600);
    expect(ids(FOUNDER_QUESTIONS)).not.toContain('problem');
    expect(ids(FOUNDER_QUESTIONS)).not.toContain('solution');
  });

  it('makes the values question a multi-choice with at most 3 selections from 13 options', () => {
    const values = FOUNDER_QUESTIONS.find((q) => q.id === 'values')!;
    expect(values.kind).toBe('multi');
    expect(values.maxSelections).toBe(3);
    expect(values.options).toEqual(VALUE_OPTIONS);
    expect(VALUE_OPTIONS).toHaveLength(13);
    expect(VALUE_OPTIONS.map((o) => o.id)).not.toContain('ownership');
    expect(PERSONALITY_OPTIONS.map((o) => o.label)).not.toContain('Ownership');
  });

  it('makes the valuesWanted question a multi-choice with at most 3 selections from the 9 personality options', () => {
    const valuesWanted = INVESTOR_QUESTIONS.find((q) => q.id === 'valuesWanted')!;
    expect(valuesWanted.kind).toBe('multi');
    expect(valuesWanted.required).toBe(true);
    expect(valuesWanted.maxSelections).toBe(3);
    expect(valuesWanted.options).toEqual(PERSONALITY_OPTIONS);
    expect(PERSONALITY_OPTIONS).toHaveLength(9);
    for (const o of PERSONALITY_OPTIONS) expect(getKeyword(o.id)?.category).toBe('personality');
  });

  it('asks investors what they look for in a startup and which sectors they prefer', () => {
    const q = INVESTOR_QUESTIONS.find((x) => x.id === 'founderFit')!;
    expect(q.label).toBe('What are you looking for in a startup and what sectors do you prefer?');
    expect(q.kind).toBe('longtext');
  });

  it('gives the investor risk question a 1-10 scale with the moonshot/steady-returns labels', () => {
    const risk = INVESTOR_QUESTIONS.find((q) => q.id === 'risk')!;
    expect(risk.kind).toBe('scale');
    expect(risk.required).toBe(true);
    expect(risk.help).toBe('Tap a number from 1 to 10.');
    expect(risk.scale).toEqual({
      min: 1,
      max: 10,
      minLabel: 'Proven models, steady returns',
      maxLabel: 'Moonshots, all-or-nothing',
    });
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
    expect(ids(missing)).toEqual(['fundName', 'stages', 'valuesWanted', 'regions', 'involvement', 'founderFit', 'pressure', 'transparency', 'risk']);
  });

  it('treats a valid two-stop range as answered, and anything else as missing', () => {
    const missingFor = (tickets: string[]) =>
      missingRequired('investor', {
        investorName: 'Sara',
        fundName: 'Birch',
        stages: ['seed'],
        valuesWanted: ['data-driven'],
        regions: 'Nordics',
        involvement: 'hands-on',
        founderFit: 'F',
        pressure: '5',
        transparency: '5',
        risk: '5',
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

  it('gives every scale question 1-10 bounds, required, and the tap help text', () => {
    for (const id of ['pressure', 'transparency', 'leadership']) {
      const q = FOUNDER_QUESTIONS.find((x) => x.id === id)!;
      expect(q.kind).toBe('scale');
      expect(q.required).toBe(true);
      expect(q.scale).toEqual({ min: 1, max: 10, minLabel: expect.any(String), maxLabel: expect.any(String) });
      expect(q.help).toBe('Tap a number from 1 to 10.');
    }
    for (const id of ['pressure', 'transparency', 'risk']) {
      const q = INVESTOR_QUESTIONS.find((x) => x.id === id)!;
      expect(q.kind).toBe('scale');
      expect(q.required).toBe(true);
      expect(q.scale).toEqual({ min: 1, max: 10, minLabel: expect.any(String), maxLabel: expect.any(String) });
      expect(q.help).toBe('Tap a number from 1 to 10.');
    }
  });

  it('flags a required scale question as missing unless the answer is an integer string in range', () => {
    for (const bad of [undefined, '0', '11', 'x']) {
      expect(missingRequired('founder', { pressure: bad } as never).map((q) => q.id)).toContain('pressure');
    }
    for (const good of ['1', '10']) {
      expect(missingRequired('founder', { pressure: good }).map((q) => q.id)).not.toContain('pressure');
    }
  });

  it('formats a scale answer with both end labels, and blanks an invalid one', () => {
    const pressure = FOUNDER_QUESTIONS.find((q) => q.id === 'pressure')!;
    expect(formatAnswer(pressure, '8')).toBe('8/10 (1 = I need calm to think clearly, 10 = I do my best work under fire)');
    expect(formatAnswer(pressure, '11')).toBe('');
    expect(formatAnswer(pressure, 'x')).toBe('');
    expect(formatAnswer(pressure, undefined)).toBe('');
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
