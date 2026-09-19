import { describe, expect, it } from 'vitest';
import {
  CATEGORY_ORDER,
  KEYWORD_IDS,
  STAGES,
  TAXONOMY,
  TICKETS,
  getKeyword,
  isKeywordId,
  isStageId,
  isTicketId,
  stageLabel,
  ticketLabel,
} from './taxonomy';

describe('taxonomy', () => {
  it('has unique keyword ids', () => {
    expect(new Set(KEYWORD_IDS).size).toBe(KEYWORD_IDS.length);
    expect(KEYWORD_IDS).toHaveLength(TAXONOMY.length);
  });

  it('uses every category and nothing else', () => {
    expect(new Set(TAXONOMY.map((t) => t.category))).toEqual(new Set(CATEGORY_ORDER));
  });

  it('looks keywords up by id', () => {
    expect(getKeyword('fintech')).toEqual({ id: 'fintech', label: 'Fintech', category: 'sector' });
    expect(getKeyword('nope')).toBeUndefined();
    expect(isKeywordId('hands-on')).toBe(true);
    expect(isKeywordId('nope')).toBe(false);
  });

  it('defines stages and ticket buckets with labels and guards', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['pre-seed', 'seed', 'series-a', 'series-b-plus']);
    expect(TICKETS).toHaveLength(5);
    expect(stageLabel('series-a')).toBe('Series A');
    expect(ticketLabel('t-500k-2m')).toBe('€500k – €2M');
    expect(isStageId('seed')).toBe(true);
    expect(isStageId('series-z')).toBe(false);
    expect(isTicketId('t-15m-plus')).toBe(true);
    expect(isTicketId(42)).toBe(false);
  });
});
