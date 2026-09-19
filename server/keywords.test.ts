import { describe, expect, it, vi } from 'vitest';
import { KEYWORD_IDS } from '../shared/taxonomy';
import type { Answers } from '../shared/types';
import { KEYWORD_SCHEMA, MAX_KEYWORDS, buildPrompt, generateKeywords, parseKeywordResponse } from './keywords';

const founderAnswers: Answers = {
  companyName: 'Acme Grid',
  website: 'acme.example',
  contactName: 'Jamie Rivera',
  contactEmail: 'jamie@acme.example',
  values: ['craftsmanship', 'customer-obsession', 'sustainability'],
  stage: 'seed',
  raise: ['2000', '5000'],
  problemSolution: 'Grids lack flexibility. We shift building loads.',
  revenue: '€500k ARR',
  team: 'Two engineers.',
  involvement: ['hands-on'],
  whyInvest: 'The market is exploding.',
  pressure: '8',
  transparency: '9',
  leadership: '4',
};

const investorAnswers: Answers = {
  investorName: 'Sara',
  fundName: 'Birch Ventures',
  stages: ['seed'],
  tickets: ['2000', '5000'],
  valuesWanted: ['data-driven', 'long-term'],
  regions: 'Nordics',
  involvement: ['hands-on'],
  founderFit: 'Technical founders.',
  pressure: '8',
  transparency: '7',
  risk: '6',
};

describe('buildPrompt', () => {
  it('includes the role rules, every taxonomy id, labelled answers and website text', () => {
    const prompt = buildPrompt('founder', founderAnswers, 'We are Acme Grid.');
    expect(prompt).toContain('profiling a startup');
    for (const id of KEYWORD_IDS) expect(prompt).toContain(`- ${id} (`);
    expect(prompt).toContain('Q: Current funding stage\nA: Seed');
    expect(prompt).toContain('Q: How much are you raising?\nA: €2M – €5M');
    expect(prompt).toContain("Q: Choose your company's three main values\nA: Craftsmanship, Customer obsession, Sustainability");
    expect(prompt).toContain('Website text (truncated):\nWe are Acme Grid.');
  });

  it('marks missing answers and a missing website', () => {
    const prompt = buildPrompt('investor', { investorName: 'Sara' }, null);
    expect(prompt).toContain('profiling an investor');
    expect(prompt).toContain('Q: Fund or firm\nA: (no answer)');
    expect(prompt).toContain('Website text: (not available)');
  });

  it('never mentions the thesis in the investor prompt', () => {
    const prompt = buildPrompt('investor', investorAnswers, null);
    expect(prompt.toLowerCase()).not.toContain('thesis');
  });

  it('never sends the founder contact name or email to the AI, but keeps the company name', () => {
    const prompt = buildPrompt('founder', founderAnswers, null);
    expect(prompt).not.toContain('Jamie Rivera');
    expect(prompt).not.toContain('jamie@acme.example');
    expect(prompt).not.toContain('Point of contact');
    expect(prompt).not.toContain('Contact email');
    expect(prompt).toContain('Acme Grid');
  });

  it('includes the investor personality and sector rules referencing valuesWanted and risk', () => {
    const prompt = buildPrompt('investor', investorAnswers, null);
    expect(prompt).toContain('Pick 1-4 sector keywords from the sectors they say they prefer in what they are looking for in a startup; if they name none, pick none.');
    expect(prompt).toContain(
      'Pick 2-3 personality keywords from what they value in a startup, the three 1-10 scale answers (pressure, transparency, risk) and what they are looking for in a startup.',
    );
    expect(prompt).toContain("Q: What do you value in a startup?\nA: Data-driven, Long-term thinker");
  });
});

describe('parseKeywordResponse', () => {
  it('keeps valid keywords and drops unknown, duplicate and reasonless ones', () => {
    const raw = JSON.stringify({
      summary: 'Grid software',
      keywords: [
        { id: 'climate', reason: 'Grid balancing' },
        { id: 'made-up', reason: 'x' },
        { id: 'climate', reason: 'again' },
        { id: 'b2b', reason: '  ' },
        { id: 'nordics', reason: 'Finland' },
      ],
    });
    expect(parseKeywordResponse(raw)).toEqual({
      summary: 'Grid software',
      keywords: [
        { id: 'climate', reason: 'Grid balancing' },
        { id: 'nordics', reason: 'Finland' },
      ],
    });
  });

  it('truncates long text and caps the keyword count', () => {
    const raw = JSON.stringify({ summary: 's'.repeat(300), keywords: KEYWORD_IDS.map((id) => ({ id, reason: 'r'.repeat(500) })) });
    const parsed = parseKeywordResponse(raw);
    expect(parsed.summary).toHaveLength(100);
    expect(parsed.keywords).toHaveLength(MAX_KEYWORDS);
    expect(parsed.keywords[0].reason).toHaveLength(200);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseKeywordResponse('not json')).toThrow('Model returned invalid JSON');
  });
});

describe('generateKeywords', () => {
  it('reads the website, calls the model with the schema and adds the chosen involvement keyword', async () => {
    const fetchWebsite = vi.fn(async (_url: string) => 'Acme Grid homepage');
    const model = vi.fn(async (_prompt: string, _schema: object) =>
      JSON.stringify({ summary: 'Grid flexibility', keywords: [{ id: 'climate', reason: 'Grid' }] }),
    );
    const result = await generateKeywords('founder', founderAnswers, { model, fetchWebsite });
    expect(fetchWebsite).toHaveBeenCalledWith('acme.example');
    expect(model.mock.calls[0][0]).toContain('Acme Grid homepage');
    expect(model.mock.calls[0][1]).toBe(KEYWORD_SCHEMA);
    expect(result).toEqual({
      summary: 'Grid flexibility',
      websiteUsed: true,
      keywords: [
        { id: 'climate', reason: 'Grid' },
        { id: 'hands-on', reason: 'You chose this in the questionnaire.' },
      ],
    });
  });

  it('skips the website when none is given and does not duplicate involvement', async () => {
    const fetchWebsite = vi.fn(async (_url: string) => 'unused');
    const model = vi.fn(async () => JSON.stringify({ summary: 's', keywords: [{ id: 'hands-on', reason: 'Asked for sparring' }] }));
    const result = await generateKeywords('founder', { ...founderAnswers, website: '' }, { model, fetchWebsite });
    expect(fetchWebsite).not.toHaveBeenCalled();
    expect(result.websiteUsed).toBe(false);
    expect(result.keywords).toEqual([{ id: 'hands-on', reason: 'Asked for sparring' }]);
  });

  it('appends every chosen involvement keyword the model missed, one per chosen option', async () => {
    const fetchWebsite = vi.fn(async (_url: string) => 'unused');
    const model = vi.fn(async () => JSON.stringify({ summary: 's', keywords: [{ id: 'climate', reason: 'Grid' }] }));
    const result = await generateKeywords(
      'founder',
      { ...founderAnswers, website: '', involvement: ['hands-on', 'network-access'] },
      { model, fetchWebsite },
    );
    expect(result.keywords).toEqual([
      { id: 'climate', reason: 'Grid' },
      { id: 'hands-on', reason: 'You chose this in the questionnaire.' },
      { id: 'network-access', reason: 'You chose this in the questionnaire.' },
    ]);
  });

  it('does not duplicate a chosen involvement id the model already returned', async () => {
    const fetchWebsite = vi.fn(async (_url: string) => 'unused');
    const model = vi.fn(async () =>
      JSON.stringify({ summary: 's', keywords: [{ id: 'hands-on', reason: 'Asked for sparring' }] }),
    );
    const result = await generateKeywords(
      'founder',
      { ...founderAnswers, website: '', involvement: ['hands-on', 'network-access'] },
      { model, fetchWebsite },
    );
    expect(result.keywords).toEqual([
      { id: 'hands-on', reason: 'Asked for sparring' },
      { id: 'network-access', reason: 'You chose this in the questionnaire.' },
    ]);
  });

  it('still accepts a legacy string involvement answer', async () => {
    const fetchWebsite = vi.fn(async (_url: string) => 'unused');
    const model = vi.fn(async () => JSON.stringify({ summary: 's', keywords: [] }));
    const result = await generateKeywords(
      'founder',
      { ...founderAnswers, website: '', involvement: 'hands-on' },
      { model, fetchWebsite },
    );
    expect(result.keywords).toEqual([{ id: 'hands-on', reason: 'You chose this in the questionnaire.' }]);
  });

  it('appends each chosen valuesWanted id the model missed, for investors', async () => {
    const fetchWebsite = vi.fn(async (_url: string) => 'unused');
    const model = vi.fn(async () => JSON.stringify({ summary: 's', keywords: [{ id: 'climate', reason: 'Focus' }] }));
    const result = await generateKeywords('investor', { ...investorAnswers, involvement: [] }, { model, fetchWebsite });
    expect(result.keywords).toEqual([
      { id: 'climate', reason: 'Focus' },
      { id: 'data-driven', reason: 'You value this in a startup.' },
      { id: 'long-term', reason: 'You value this in a startup.' },
    ]);
  });

  it('does not duplicate a valuesWanted id the model already returned', async () => {
    const fetchWebsite = vi.fn(async (_url: string) => 'unused');
    const model = vi.fn(async () =>
      JSON.stringify({ summary: 's', keywords: [{ id: 'data-driven', reason: 'Likes data' }] }),
    );
    const result = await generateKeywords('investor', { ...investorAnswers, involvement: [] }, { model, fetchWebsite });
    expect(result.keywords).toEqual([
      { id: 'data-driven', reason: 'Likes data' },
      { id: 'long-term', reason: 'You value this in a startup.' },
    ]);
  });

  it('accepts a legacy string valuesWanted answer', async () => {
    const fetchWebsite = vi.fn(async (_url: string) => 'unused');
    const model = vi.fn(async () => JSON.stringify({ summary: 's', keywords: [] }));
    const result = await generateKeywords(
      'investor',
      { ...investorAnswers, involvement: [], valuesWanted: 'data-driven' },
      { model, fetchWebsite },
    );
    expect(result.keywords).toEqual([{ id: 'data-driven', reason: 'You value this in a startup.' }]);
  });

  it('is harmless for founders, who have no valuesWanted answer', async () => {
    const fetchWebsite = vi.fn(async (_url: string) => 'unused');
    const model = vi.fn(async () => JSON.stringify({ summary: 's', keywords: [{ id: 'climate', reason: 'Grid' }] }));
    const result = await generateKeywords('founder', { ...founderAnswers, website: '' }, { model, fetchWebsite });
    // The involvement append still runs (unrelated feature); no valuesWanted keyword is added.
    expect(result.keywords).toEqual([
      { id: 'climate', reason: 'Grid' },
      { id: 'hands-on', reason: 'You chose this in the questionnaire.' },
    ]);
  });
});
