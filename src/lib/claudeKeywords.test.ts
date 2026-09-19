import { describe, expect, it, vi } from 'vitest';
import type { Answers } from '../../shared/types';
import { createSampleModel, requestKeywordsViaClaude } from './claudeKeywords';

const reply = { summary: 'Grid software', keywords: [{ id: 'climate', reason: 'Grid balancing' }] };

describe('createSampleModel', () => {
  it('asks Claude for JSON and returns it as a string', async () => {
    const json = vi.fn(async (_input: string, _opts?: object) => reply);
    const model = createSampleModel(async () => ({ json }));
    expect(JSON.parse(await model('PROMPT', {}))).toEqual(reply);
    expect(json.mock.calls[0][0]).toMatch(/^PROMPT/);
    expect(json.mock.calls[0][0]).toContain('Reply with only one JSON object');
    expect(json.mock.calls[0][1]).toEqual({ modelTier: 'quick' });
  });

  it('explains when Claude is not available in this view', async () => {
    const model = createSampleModel(async () => null);
    await expect(model('p', {})).rejects.toThrow(/opened on claude\.ai/);
  });

  it('maps sample error codes to viewer messages', async () => {
    const failing = (code: string) =>
      createSampleModel(async () => ({ json: async () => Promise.reject({ code, message: 'x' }) }));
    await expect(failing('not_granted')('p', {})).rejects.toThrow(/permission/);
    await expect(failing('rate_limited')('p', {})).rejects.toThrow(/Too many requests/);
    await expect(failing('something_new')('p', {})).rejects.toThrow('Keyword generation failed. Please retry.');
  });
});

describe('requestKeywordsViaClaude', () => {
  it('runs the shared keyword pipeline with Claude as the model', async () => {
    const answers: Answers = { companyName: 'Acme', involvement: ['hands-on'] };
    const result = await requestKeywordsViaClaude('founder', answers, async () => JSON.stringify(reply));
    expect(result.summary).toBe('Grid software');
    expect(result.keywords.map((k) => k.id)).toEqual(['climate', 'hands-on']);
    expect(result.websiteUsed).toBe(false);
  });
});
