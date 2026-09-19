import { generateKeywords, type ModelCall } from '../../server/keywords';
import type { Answers, KeywordResult, Role } from '../../shared/types';

// Keyword generation for the claude.ai Artifact build: the same prompt rules and
// validation as the server, with Claude (the Artifact `sample` capability, on the
// viewer's own account) as the model instead of Gemini. No API key is involved.

type SampleJson = (input: string, options?: { modelTier?: 'quick' | 'default' | 'complex' }) => Promise<unknown>;
export interface SampleCapability {
  json: SampleJson;
}
type ClaudeWindow = { claude?: { use?: (name: string) => Promise<unknown> } };

const OUTPUT_FORMAT =
  '\n\nReply with only one JSON object and nothing else: {"summary": string, "keywords": [{"id": string, "reason": string}]}. ' +
  'Copy every id exactly from the keyword list above.';

const MESSAGES: Record<string, string> = {
  not_granted: 'Blendr needs your permission to use Claude for keywords. Allow it and retry, or add keywords manually.',
  sampling_disabled: "Claude isn't available for this account. Add keywords manually.",
  rate_limited: 'Too many requests right now. Wait a moment, then retry.',
  session_expired: 'Your claude.ai session expired. Sign in again, then retry.',
};

export async function getSample(): Promise<SampleCapability | null> {
  const claude = typeof window === 'undefined' ? undefined : (window as unknown as ClaudeWindow).claude;
  if (!claude?.use) return null;
  return (await claude.use('sample')) as SampleCapability | null;
}

export function createSampleModel(getSampleFn: () => Promise<SampleCapability | null> = getSample): ModelCall {
  return async (prompt) => {
    const sample = await getSampleFn();
    if (!sample) {
      throw new Error('Keyword generation works when Blendr is opened on claude.ai. Add keywords manually for now.');
    }
    try {
      return JSON.stringify(await sample.json(prompt + OUTPUT_FORMAT, { modelTier: 'quick' }));
    } catch (e) {
      const code = (e as { code?: unknown } | null)?.code;
      throw new Error((typeof code === 'string' && MESSAGES[code]) || 'Keyword generation failed. Please retry.');
    }
  };
}

export function requestKeywordsViaClaude(
  role: Role,
  answers: Answers,
  model: ModelCall = createSampleModel(),
): Promise<KeywordResult> {
  return generateKeywords(role, answers, { model, fetchWebsite: async () => null });
}
