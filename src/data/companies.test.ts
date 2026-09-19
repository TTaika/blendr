import { describe, expect, it } from 'vitest';
import { COMPANIES, COMPANY_BY_ID, EXAMPLE_PITCH_VIDEO } from './companies';
import { getKeyword, isKeywordId, isStageId } from '../../shared/taxonomy';

describe('test companies', () => {
  it('has 30 companies with unique ids, all indexed by id', () => {
    expect(COMPANIES).toHaveLength(30);
    expect(new Set(COMPANIES.map((c) => c.id)).size).toBe(30);
    for (const c of COMPANIES) expect(COMPANY_BY_ID.get(c.id)).toBe(c);
  });

  it('gives every company the shared example pitch video, relative to the app base', () => {
    expect(EXAMPLE_PITCH_VIDEO).toBe(`${import.meta.env.BASE_URL}videos/pitch.mp4`);
    for (const c of COMPANIES) expect(c.videoUrl).toBe(EXAMPLE_PITCH_VIDEO);
  });

  it.each(COMPANIES.map((c) => [c.id, c] as const))('%s is well-formed', (_id, c) => {
    expect(c.values).toHaveLength(3);
    for (const v of c.values) expect(v.trim()).not.toBe('');

    expect(isStageId(c.stage)).toBe(true);
    expect(c.raise).toHaveLength(2);
    const [raiseMin, raiseMax] = c.raise;
    expect(raiseMin).toBeGreaterThanOrEqual(0);
    expect(raiseMax).toBeLessThanOrEqual(100000);
    expect(raiseMin).toBeLessThanOrEqual(raiseMax);

    const keywordIds = c.keywords.map((k) => k.id);
    expect(new Set(keywordIds).size).toBe(keywordIds.length);
    for (const k of c.keywords) {
      expect(isKeywordId(k.id), `unknown keyword ${k.id}`).toBe(true);
      expect(k.reason.trim()).not.toBe('');
    }
    const categories = keywordIds.map((id) => getKeyword(id)!.category);
    expect(categories).toContain('sector');
    expect(categories).toContain('personality');

    for (const text of [c.name, c.problem, c.solution, c.team, c.whyInvest]) expect(text.trim()).not.toBe('');
    expect(c.keyNumbers.length).toBeGreaterThan(0);
    for (const n of c.keyNumbers) {
      expect(n.value.trim()).not.toBe('');
      expect(n.label.trim()).not.toBe('');
    }
    expect(c.contact.email).toMatch(/@.+\.example$/);
  });
});
