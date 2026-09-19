import { vi } from 'vitest';

/**
 * jsdom has no media loading and can't make object URLs for its Blobs, so tests swap
 * URL.createObjectURL / revokeObjectURL for numbered fakes ("blob:test/1", …). Undo with
 * vi.restoreAllMocks().
 */
export function stubObjectUrls() {
  let n = 0;
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test/${++n}`);
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  return { create, revoke };
}
