// Checks a founder's pitch video before it is kept: a video file, at most 100 MB and at most one
// minute long. The duration comes from the browser itself (see readVideoDuration), which jsdom
// can't do, so callers pass the reader in and tests swap it for a fake.

export const MAX_VIDEO_BYTES = 100 * 1000 * 1000; // 100 MB, as phones count it
export const MAX_VIDEO_SECONDS = 60;
// Containers often round a one-minute recording up a little (60.03 s, 60.4 s).
const DURATION_SLACK_SECONDS = 0.5;
const READ_TIMEOUT_MS = 10_000;

// Some pickers hand over a video with no type, or a generic one; the extension decides then.
const VIDEO_EXTENSION = /\.(mp4|m4v|mov|qt|webm|mkv|ogv|3gp|3g2|avi)$/i;
const UNTYPED = new Set(['', 'application/octet-stream']);

export type ReadVideoDuration = (file: File) => Promise<number>;

export type PitchVideoCheck = { ok: true; descriptor: string } | { ok: false; message: string };

/** Formats seconds as m:ss, rounded to the nearest second (84 → "1:24"). */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  return UNTYPED.has(file.type) && VIDEO_EXTENSION.test(file.name);
}

export async function checkPitchVideo(file: File, readDuration: ReadVideoDuration): Promise<PitchVideoCheck> {
  if (!isVideoFile(file)) {
    return { ok: false, message: "That file isn't a video. Choose a video file, such as an MP4." };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    const mb = Math.ceil(file.size / 1_000_000);
    return { ok: false, message: `That video is ${mb} MB. Choose one under 100 MB, or record at a lower resolution.` };
  }
  let seconds: number;
  try {
    seconds = await readDuration(file);
  } catch {
    seconds = Number.NaN;
  }
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return { ok: false, message: "Couldn't read that video. Try an MP4." };
  }
  if (seconds > MAX_VIDEO_SECONDS + DURATION_SLACK_SECONDS) {
    return { ok: false, message: `That video is ${formatDuration(seconds)}. Choose one that's 1 minute or shorter.` };
  }
  // Within the slack a video still shows as 1:00, never 1:01.
  return { ok: true, descriptor: `${file.name || 'Video'} · ${formatDuration(Math.min(seconds, MAX_VIDEO_SECONDS))}` };
}

/** Reads a video's duration in seconds from a detached <video>, giving up after `timeoutMs`. */
export function readVideoDuration(file: Blob, timeoutMs = READ_TIMEOUT_MS): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute('src');
      URL.revokeObjectURL(url);
      settle();
    };
    const timer = window.setTimeout(() => finish(() => reject(new Error('Timed out reading the video'))), timeoutMs);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      finish(() => resolve(seconds));
    };
    video.onerror = () => finish(() => reject(new Error("The browser couldn't read the video")));
    video.src = url;
    video.load(); // harmless where setting src already started loading; some mobile browsers wait for it
  });
}
