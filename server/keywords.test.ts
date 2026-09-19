import { describe, expect, it, vi } from 'vitest';
import { KEYWORD_IDS } from '../shared/taxonomy';
import type { Answers } from '../shared/types';
import { KEYWORD_SCHEMA, MAX_KEYWORDS, buildPrompt, generateKeywords, parseKeywordResponse } from './keywords';

const founderAnswers: Answers = {
  companyName: 'Acme Grid',
  website: 'acme.example',
  values: ['craftsmanship', 'customer-obsession', 'sustainability'],
  stage: 'seed',
  raise: ['2000', '5000'],
  problem: 'Grids lack flexibility.',
  solution: 'We shift building loads.',
  traction: '€500k ARR',
  team: 'Two engineers.',
  involvement: ['hands-on'],
  whyInvest: 'The market is exploding.',
  workStyle: 'Fast and data-driven.',
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
});
