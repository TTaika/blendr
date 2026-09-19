import type { Answers } from '../shared/types';
import sample from './fixtures/founder-sample.json' with { type: 'json' };
import { generateKeywords, type ModelCall } from './keywords';

export type SelfTest =
  | { status: 'pending' }
  | { status: 'ok'; ms: number; keywords: number }
  | { status: 'failed'; error: string }
  | { status: 'skipped' };

/** One real keyword request at startup, so a wrong key or model id shows up in the terminal, not on a tester's phone. */
export async function runSelfTest(model: ModelCall): Promise<SelfTest> {
  const start = Date.now();
  try {
    const result = await generateKeywords('founder', sample.answers as Answers, { model, fetchWebsite: async () => null });
    if (result.keywords.length === 0) return { status: 'failed', error: 'Model returned no keywords' };
    return { status: 'ok', ms: Date.now() - start, keywords: result.keywords.length };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }
}
