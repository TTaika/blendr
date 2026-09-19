// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubObjectUrls } from '../test/objectUrls';
import { MAX_VIDEO_BYTES, checkPitchVideo, formatDuration, readVideoDuration } from './pitchVideo';

const video = (name = 'pitch.mov', type = 'video/quicktime') => new File(['clip'], name, { type });
const sized = (file: File, bytes: number) => Object.defineProperty(file, 'size', { value: bytes });
const lasting = (seconds: number) => vi.fn(async () => seconds);

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('formatDuration', () => {
  it('formats whole seconds as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(48.2)).toBe('0:48');
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(84)).toBe('1:24');
  });
});

describe('checkPitchVideo', () => {
  it('accepts a video of a minute or less and describes it by name and length', async () => {
    expect(await checkPitchVideo(video(), lasting(48.2))).toEqual({ ok: true, descriptor: 'pitch.mov · 0:48' });
    expect(await checkPitchVideo(video('a.mp4', 'video/mp4'), lasting(60))).toEqual({ ok: true, descriptor: 'a.mp4 · 1:00' });
  });

  it('allows up to 60.5 s for container rounding, shown as 1:00', async () => {
    expect(await checkPitchVideo(video(), lasting(60.5))).toEqual({ ok: true, descriptor: 'pitch.mov · 1:00' });
  });

  it('rejects a longer video, saying how long it is and what to do', async () => {
    expect(await checkPitchVideo(video(), lasting(60.6))).toEqual({
      ok: false,
      message: "That video is 1:01. Choose one that's 1 minute or shorter.",
    });
    expect(await checkPitchVideo(video(), lasting(84))).toEqual({
      ok: false,
      message: "That video is 1:24. Choose one that's 1 minute or shorter.",
    });
  });

  it('rejects files that are not videos without reading them', async () => {
    const read = lasting(10);
    for (const file of [new File(['x'], 'photo.jpg', { type: 'image/jpeg' }), new File(['x'], 'notes', { type: '' })]) {
      expect(await checkPitchVideo(file, read)).toEqual({
        ok: false,
        message: "That file isn't a video. Choose a video file, such as an MP4.",
      });
    }
    expect(read).not.toHaveBeenCalled();
  });

  it('goes by the file extension when the browser gives no video type', async () => {
    for (const file of [video('clip.MOV', ''), video('clip.mp4', 'application/octet-stream'), video('clip.webm', '')]) {
      expect(await checkPitchVideo(file, lasting(30))).toMatchObject({ ok: true });
    }
  });

  it('rejects a video over 100 MB, saying how big it is', async () => {
    const read = lasting(30);
    expect(await checkPitchVideo(sized(video(), MAX_VIDEO_BYTES), read)).toMatchObject({ ok: true });
    expect(await checkPitchVideo(sized(video(), 142_300_000), read)).toEqual({
      ok: false,
      message: 'That video is 143 MB. Choose one under 100 MB, or record at a lower resolution.',
    });
  });

  it("explains when the video can't be read", async () => {
    const message = "Couldn't read that video. Try an MP4.";
    expect(await checkPitchVideo(video(), vi.fn(async () => Promise.reject(new Error('decode'))))).toEqual({ ok: false, message });
    for (const seconds of [Number.NaN, Number.POSITIVE_INFINITY, 0]) {
      expect(await checkPitchVideo(video(), lasting(seconds))).toEqual({ ok: false, message });
    }
  });

  it('names a video with no file name "Video"', async () => {
    expect(await checkPitchVideo(video('', 'video/mp4'), lasting(12))).toEqual({ ok: true, descriptor: 'Video · 0:12' });
  });
});

describe('readVideoDuration', () => {
  function start(timeoutMs?: number) {
    const urls = stubObjectUrls();
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const createElement = vi.spyOn(document, 'createElement');
    const pending = readVideoDuration(video(), timeoutMs);
    const el = createElement.mock.results.map((r) => r.value).find((v) => v instanceof HTMLVideoElement) as HTMLVideoElement;
    return { ...urls, pending, el };
  }

  it('reads the duration through a detached video element, then revokes its object URL', async () => {
    const { pending, el, revoke } = start();
    expect(el.isConnected).toBe(false);
    expect(el.getAttribute('src')).toBe('blob:test/1');
    expect(el.preload).toBe('metadata');
    Object.defineProperty(el, 'duration', { value: 48.2 });
    el.dispatchEvent(new Event('loadedmetadata'));
    await expect(pending).resolves.toBe(48.2);
    expect(revoke).toHaveBeenCalledWith('blob:test/1');
  });

  it('rejects when the browser cannot load the video', async () => {
    const { pending, el, revoke } = start();
    el.dispatchEvent(new Event('error'));
    await expect(pending).rejects.toThrow();
    expect(revoke).toHaveBeenCalledWith('blob:test/1');
  });

  it('gives up after the timeout', async () => {
    vi.useFakeTimers();
    const { pending, revoke } = start(5000);
    const settled = vi.fn();
    pending.then(settled, settled);
    await vi.advanceTimersByTimeAsync(4999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).rejects.toThrow();
    expect(revoke).toHaveBeenCalledWith('blob:test/1');
  });
});
