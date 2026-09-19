import { describe, expect, it } from 'vitest';
import {
  CATEGORY_ORDER,
  KEYWORD_IDS,
  STAGES,
  TAXONOMY,
  getKeyword,
  isKeywordId,
  isStageId,
  stageLabel,
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

  it('defines stages with labels and guards', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['pre-seed', 'seed', 'series-a', 'series-b-plus']);
    expect(stageLabel('series-a')).toBe('Series A');
    expect(isStageId('seed')).toBe(true);
    expect(isStageId('series-z')).toBe(false);
  });
});
