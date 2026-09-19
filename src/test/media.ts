import { vi } from 'vitest';

/**
 * jsdom has no IntersectionObserver and can't play media, so video tests install a fake observer
 * and fake play()/pause() that keep a paused state per element. `showVideo(video, 0.6)` reports
 * that 60% of it is on screen. Undo with vi.unstubAllGlobals() and vi.restoreAllMocks().
 */
export function stubVideoPlayback() {
  const observers = new Set<{ callback: IntersectionObserverCallback; targets: Set<Element> }>();
  class FakeIntersectionObserver {
    readonly targets = new Set<Element>();
    constructor(
      readonly callback: IntersectionObserverCallback,
      readonly options?: IntersectionObserverInit,
    ) {
      observers.add(this);
    }
    observe(target: Element) {
      this.targets.add(target);
    }
    unobserve(target: Element) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
      observers.delete(this);
    }
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

  const paused = new WeakMap<HTMLMediaElement, boolean>();
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(function (this: HTMLMediaElement) {
    return paused.get(this) ?? true;
  });
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    paused.set(this, false);
    return Promise.resolve();
  });
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    paused.set(this, true);
  });

  return {
    play,
    pause,
    /** Number of observers watching `target`. */
    watching: (target: Element) => [...observers].filter((o) => o.targets.has(target)).length,
    showVideo(target: Element, ratio: number) {
      for (const o of observers) {
        if (!o.targets.has(target)) continue;
        const entry = { target, intersectionRatio: ratio, isIntersecting: ratio > 0 } as IntersectionObserverEntry;
        o.callback([entry], o as unknown as IntersectionObserver);
      }
    },
    /** What the browser does when the viewer pauses with the native controls, or the video ends. */
    stopByViewer(video: HTMLMediaElement) {
      paused.set(video, true);
    },
  };
}
