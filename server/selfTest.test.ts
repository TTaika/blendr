import { describe, expect, it } from 'vitest';
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

  it('fails with the error message when the model throws', async () => {
    const model = async (): Promise<string> => {
      throw new Error('API key not valid');
    };
    expect(await runSelfTest(model)).toEqual({ status: 'failed', error: 'API key not valid' });
  });
});
