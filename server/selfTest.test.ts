import { describe, expect, it } from 'vitest';
import { missingRequired } from '../shared/questions';
import type { Answers } from '../shared/types';
import sample from './fixtures/founder-sample.json' with { type: 'json' };
import { runSelfTest } from './selfTest';

describe('runSelfTest', () => {
  it('is ok when the model returns keywords for the sample founder', async () => {
    const prompts: string[] = [];
    const model = async (prompt: string) => {
      prompts.push(prompt);
      return JSON.stringify({
        summary: 'Grid flexibility software',
        keywords: [{ id: 'climate', reason: 'Grid' }, { id: 'hands-on', reason: 'Chosen' }],
      });
    };
    expect(await runSelfTest(model)).toEqual({ status: 'ok', ms: expect.any(Number), keywords: 2 });
    expect(prompts[0]).toContain('Northlight Grid');
  });

  it('sends a sample founder who answers every required question, including the amount raised', async () => {
    expect(missingRequired('founder', sample.answers as Answers)).toEqual([]);
    const prompts: string[] = [];
    await runSelfTest(async (prompt: string) => {
      prompts.push(prompt);
      return JSON.stringify({ summary: 's', keywords: [{ id: 'climate', reason: 'Grid' }] });
    });
    expect(prompts[0]).toContain('Q: How much have you raised so far?\nA: €1M');
  });

  it('fails with the error message when the model throws', async () => {
    const model = async (): Promise<string> => {
      throw new Error('API key not valid');
    };
    expect(await runSelfTest(model)).toEqual({ status: 'failed', error: 'API key not valid' });
  });
});
