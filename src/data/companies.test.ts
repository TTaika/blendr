import { describe, expect, it } from 'vitest';
import { COMPANIES, COMPANY_BY_ID } from './companies';
import { getKeyword, isKeywordId, isStageId, isTicketId } from '../../shared/taxonomy';
import { VALUE_OPTIONS } from '../../shared/questions';

const VALUE_LABELS = new Set(VALUE_OPTIONS.map((o) => o.label));

describe('test companies', () => {
  it('has 12 companies with unique ids, all indexed by id', () => {
    expect(COMPANIES).toHaveLength(12);
    expect(new Set(COMPANIES.map((c) => c.id)).size).toBe(12);
    for (const c of COMPANIES) expect(COMPANY_BY_ID.get(c.id)).toBe(c);
  });

  it.each(COMPANIES.map((c) => [c.id, c] as const))('%s is well-formed', (_id, c) => {
    expect(c.values.length).toBeGreaterThanOrEqual(1);
    expect(c.values.length).toBeLessThanOrEqual(3);
    for (const v of c.values) {
      expect(VALUE_LABELS.has(v), `unknown value label ${v}`).toBe(true);
    }
    expect(isStageId(c.stage)).toBe(true);
    expect(isTicketId(c.raise)).toBe(true);
    const keywordIds = c.keywords.map((k) => k.id);
    expect(new Set(keywordIds).size).toBe(keywordIds.length);
    for (const k of c.keywords) {
      expect(isKeywordId(k.id), `unknown keyword ${k.id}`).toBe(true);
      expect(k.reason.trim()).not.toBe('');
    }
    const categories = keywordIds.map((id) => getKeyword(id)!.category);
    expect(categories).toContain('sector');
    expect(categories).toContain('personality');
    for (const text of [c.name, c.problem, c.solution, c.team, c.whyInvest, c.website]) expect(text.trim()).not.toBe('');
    expect(c.keyNumbers.length).toBeGreaterThan(0);
    expect(c.contact.email).toMatch(/^[^@\s]+@[^@\s]+$/);
  });
});
