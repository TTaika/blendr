import { describe, expect, it, vi } from 'vitest';
import { createGeminiModel } from './gemini';

describe('createGeminiModel', () => {
  it('asks for JSON that follows the schema and returns the text', async () => {
    const generate = vi.fn(async () => ({ text: '{"summary":"s","keywords":[]}' }));
    const call = createGeminiModel(generate, 'gemini-test');
    const schema = { type: 'OBJECT' };
    expect(await call('the prompt', schema)).toBe('{"summary":"s","keywords":[]}');
    expect(generate).toHaveBeenCalledWith({
      model: 'gemini-test',
      contents: 'the prompt',
      config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 },
    });
  });

  it('rejects an empty response', async () => {
    const call = createGeminiModel(async () => ({ text: undefined }), 'gemini-test');
    await expect(call('p', {})).rejects.toThrow('Gemini returned an empty response');
  });

  it('times out', async () => {
    const call = createGeminiModel(() => new Promise(() => {}), 'gemini-test', 10);
    await expect(call('p', {})).rejects.toThrow('Gemini timed out');
  });
});
