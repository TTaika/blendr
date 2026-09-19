import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A fresh import has no in-memory copy, like the app after a reload.
const freshStore = async () => {
  vi.resetModules();
  return import('./videoStore');
};

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('videoStore', () => {
  it('has no video until one is saved', async () => {
    const store = await freshStore();
    expect(await store.loadPitchVideo()).toBeNull();
  });

  it('keeps the pitch video across a reload', async () => {
    const first = await freshStore();
    await first.savePitchVideo(new Blob(['clip'], { type: 'video/mp4' }));
    const second = await freshStore();
    const blob = await second.loadPitchVideo();
    expect(blob?.type).toBe('video/mp4');
    expect(await blob?.text()).toBe('clip');
  });

  it('holds a single video: saving again replaces it', async () => {
    const first = await freshStore();
    await first.savePitchVideo(new Blob(['old'], { type: 'video/mp4' }));
    await first.savePitchVideo(new Blob(['new'], { type: 'video/quicktime' }));
    const blob = await (await freshStore()).loadPitchVideo();
    expect(blob?.type).toBe('video/quicktime');
    expect(await blob?.text()).toBe('new');
  });

  it('clears the video now and after a reload', async () => {
    const first = await freshStore();
    await first.savePitchVideo(new Blob(['clip'], { type: 'video/mp4' }));
    await first.clearPitchVideo();
    expect(await first.loadPitchVideo()).toBeNull();
    expect(await (await freshStore()).loadPitchVideo()).toBeNull();
  });

  it('keeps working in memory for this session when IndexedDB is missing', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const store = await freshStore();
    const blob = new Blob(['clip'], { type: 'video/mp4' });
    await expect(store.savePitchVideo(blob)).resolves.toBeUndefined();
    expect(await store.loadPitchVideo()).toBe(blob);
    await expect(store.clearPitchVideo()).resolves.toBeUndefined();
    expect(await store.loadPitchVideo()).toBeNull();
  });

  it('never throws when IndexedDB refuses to open, as in a sandboxed frame', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    const store = await freshStore();
    const blob = new Blob(['clip'], { type: 'video/mp4' });
    await expect(store.savePitchVideo(blob)).resolves.toBeUndefined();
    expect(await store.loadPitchVideo()).toBe(blob);
    await expect(store.clearPitchVideo()).resolves.toBeUndefined();
    expect(await (await freshStore()).loadPitchVideo()).toBeNull();
  });

  it('never throws when the open request fails, as in private mode', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        const request: { error?: DOMException; onerror?: () => void } = {};
        setTimeout(() => {
          request.error = new DOMException('A mutation operation was attempted', 'InvalidStateError');
          request.onerror?.();
        });
        return request;
      },
    });
    const store = await freshStore();
    await expect(store.savePitchVideo(new Blob(['clip']))).resolves.toBeUndefined();
    expect(await (await freshStore()).loadPitchVideo()).toBeNull();
  });

  it('keeps the in-session copy when a write fails, e.g. over quota', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    const store = await freshStore();
    const blob = new Blob(['clip'], { type: 'video/mp4' });
    await expect(store.savePitchVideo(blob)).resolves.toBeUndefined();
    expect(await store.loadPitchVideo()).toBe(blob);
    expect(await (await freshStore()).loadPitchVideo()).toBeNull();
  });
});
