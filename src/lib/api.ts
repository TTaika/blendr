import type { Answers, KeywordResult, Role } from '../../shared/types';
import { requestKeywordsViaClaude } from './claudeKeywords';

export type RequestKeywords = (role: Role, answers: Answers) => Promise<KeywordResult>;

/** True in the claude.ai Artifact build (`npm run build:artifact`), which has no server. */
export const IS_ARTIFACT = import.meta.env.VITE_TARGET === 'artifact';

export async function requestKeywords(role: Role, answers: Answers, fetchImpl: typeof fetch = fetch): Promise<KeywordResult> {
  if (IS_ARTIFACT) return requestKeywordsViaClaude(role, answers);
  let res: Response;
  try {
    res = await fetchImpl('/api/keywords', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role, answers }),
    });
  } catch {
    throw new Error('Could not reach the Blendr server. Check the Wi-Fi connection.');
  }
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (!res.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`);
  }
  return body as KeywordResult;
}
