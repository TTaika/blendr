// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, loadSaved, save } from './storage';

afterEach(() => vi.restoreAllMocks());

describe('storage', () => {
  it('round-trips a value under the storage key', () => {
    save({ a: 1 });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{"a":1}');
    expect(loadSaved()).toEqual({ a: 1 });
  });

  it('returns null for missing or corrupted data', () => {
    expect(loadSaved()).toBeNull();
    window.localStorage.setItem(STORAGE_KEY, '{broken');
    expect(loadSaved()).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(() => save({ a: 1 })).not.toThrow();
    expect(loadSaved()).toBeNull();
  });
});
