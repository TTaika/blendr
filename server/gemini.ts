import { GoogleGenAI, type Schema } from '@google/genai';
import type { ModelCall } from './keywords';

export const DEFAULT_MODEL = 'gemini-flash-latest';

export type GenerateContent = (params: {
  model: string;
  contents: string;
  config: { responseMimeType: string; responseSchema: Schema; temperature: number };
}) => Promise<{ text?: string }>;

export function geminiGenerate(apiKey: string): GenerateContent {
  const ai = new GoogleGenAI({ apiKey });
  return (params) => ai.models.generateContent(params);
}

export function createGeminiModel(generate: GenerateContent, model: string, timeoutMs = 20_000): ModelCall {
  return async (prompt, schema) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Gemini timed out')), timeoutMs);
    });
    try {
      const response = await Promise.race([
        generate({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json', responseSchema: schema as Schema, temperature: 0.2 },
        }),
        timeout,
      ]);
      if (!response.text) throw new Error('Gemini returned an empty response');
      return response.text;
    } finally {
      clearTimeout(timer);
    }
  };
}
