import { afterEach, describe, expect, it, vi } from 'vitest';
import { playPling, playSwoosh, setAudioContextFactory } from './sounds';

type ParamEvent = [kind: 'set' | 'linear' | 'exp', value: number, time: number];

function fakeParam() {
  const param = {
    value: 0,
    events: [] as ParamEvent[],
    setValueAtTime: (v: number, t: number) => (param.events.push(['set', v, t]), param),
    linearRampToValueAtTime: (v: number, t: number) => (param.events.push(['linear', v, t]), param),
    exponentialRampToValueAtTime: (v: number, t: number) => (param.events.push(['exp', v, t]), param),
  };
  return param;
}

// Records the nodes a sound builds, so tests can read its shape: what plays, how long, how loud.
function fakeContext(state: AudioContextState = 'running') {
  const node = () => ({ connect: <T>(target: T) => target, disconnect: () => {} });
  const scheduled = () => ({ start: vi.fn(), stop: vi.fn() });
  const nodes = {
    sources: [] as { buffer: unknown; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[],
    filters: [] as { type: string; frequency: ReturnType<typeof fakeParam>; Q: ReturnType<typeof fakeParam> }[],
    gains: [] as { gain: ReturnType<typeof fakeParam> }[],
    oscillators: [] as { type: string; frequency: ReturnType<typeof fakeParam>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[],
  };
  const ctx = {
    state,
    currentTime: 10,
    sampleRate: 48000,
    destination: {},
    resume: vi.fn(async () => {
      ctx.state = 'running';
    }),
    createBuffer: (_channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length);
      return { length, sampleRate, duration: length / sampleRate, getChannelData: () => data };
    },
    createBufferSource: () => {
      const source = { ...node(), ...scheduled(), buffer: null };
      nodes.sources.push(source);
      return source;
    },
    createBiquadFilter: () => {
      const filter = { ...node(), type: 'lowpass', frequency: fakeParam(), Q: fakeParam() };
      nodes.filters.push(filter);
      return filter;
    },
    createGain: () => {
      const gain = { ...node(), gain: fakeParam() };
      nodes.gains.push(gain);
      return gain;
    },
    createOscillator: () => {
      const osc = { ...node(), ...scheduled(), type: 'sine', frequency: fakeParam() };
      nodes.oscillators.push(osc);
      return osc;
    },
  };
  return { ctx, nodes, factory: vi.fn(() => ctx as unknown as AudioContext) };
}

const peakOf = (gain: { gain: ReturnType<typeof fakeParam> }) => Math.max(gain.gain.value, ...gain.gain.events.map(([, v]) => v));
const lengthOf = (node: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }) =>
  node.stop.mock.calls[0][0] - node.start.mock.calls[0][0];

afterEach(() => setAudioContextFactory());

describe('playSwoosh', () => {
  it('plays a short burst of noise through a band-pass filter sweeping down', () => {
    const { nodes, factory } = fakeContext();
    setAudioContextFactory(factory);
    playSwoosh();

    expect(nodes.sources).toHaveLength(1);
    const [source] = nodes.sources;
    expect(source.buffer).not.toBeNull();
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(lengthOf(source)).toBeGreaterThanOrEqual(0.25);
    expect(lengthOf(source)).toBeLessThanOrEqual(0.35);

    const [filter] = nodes.filters;
    expect(filter.type).toBe('bandpass');
    const sweep = filter.frequency.events.map(([, v]) => v);
    expect(sweep[sweep.length - 1]).toBeLessThan(sweep[0]);

    expect(nodes.oscillators).toHaveLength(0);
  });

  it('peaks at a moderate volume after a quick attack, then fades out', () => {
    const { nodes, factory } = fakeContext();
    setAudioContextFactory(factory);
    playSwoosh();
    const [gain] = nodes.gains;
    expect(peakOf(gain)).toBeGreaterThanOrEqual(0.2);
    expect(peakOf(gain)).toBeLessThanOrEqual(0.3);
    const events = gain.gain.events;
    const peakAt = events.find(([, v]) => v === peakOf(gain))![2];
    expect(peakAt - 10).toBeLessThanOrEqual(0.08);
    expect(events[events.length - 1][1]).toBeLessThan(0.01);
  });
});

describe('playPling', () => {
  it('rings a bell around 1318 Hz with a softer partial above it, for about half a second', () => {
    const { nodes, factory } = fakeContext();
    setAudioContextFactory(factory);
    playPling();

    expect(nodes.sources).toHaveLength(0);
    expect(nodes.oscillators).toHaveLength(2);
    const [base, overtone] = nodes.oscillators;
    expect(base.frequency.value).toBeCloseTo(1318.5, 0);
    expect(overtone.frequency.value).toBeGreaterThan(base.frequency.value);
    expect(lengthOf(base)).toBeGreaterThanOrEqual(0.4);
    expect(lengthOf(base)).toBeLessThanOrEqual(0.6);

    const [baseGain, overtoneGain] = nodes.gains;
    expect(peakOf(overtoneGain)).toBeLessThan(peakOf(baseGain));
    // Both partials together stay moderate.
    expect(peakOf(baseGain) + peakOf(overtoneGain)).toBeLessThanOrEqual(0.3);
    expect(peakOf(baseGain) + peakOf(overtoneGain)).toBeGreaterThanOrEqual(0.2);
    // Exponential decay down to silence.
    const last = baseGain.gain.events[baseGain.gain.events.length - 1];
    expect(last[0]).toBe('exp');
    expect(last[1]).toBeLessThan(0.01);
  });
});

describe('audio context', () => {
  it('makes one context on the first sound and reuses it', () => {
    const { factory } = fakeContext();
    setAudioContextFactory(factory);
    expect(factory).not.toHaveBeenCalled();
    playSwoosh();
    playPling();
    playSwoosh();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('resumes a suspended context', () => {
    const { ctx, factory } = fakeContext('suspended');
    setAudioContextFactory(factory);
    playPling();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    playPling();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('stays silent, without throwing, when there is no Web Audio', () => {
    // This test file runs in node, which has no AudioContext at all.
    expect(() => playSwoosh()).not.toThrow();
    setAudioContextFactory(() => null);
    expect(() => playPling()).not.toThrow();
  });

  it('stays silent, without throwing, when the browser refuses or breaks', async () => {
    setAudioContextFactory(() => {
      throw new Error('blocked');
    });
    expect(() => playSwoosh()).not.toThrow();

    const broken = fakeContext('suspended');
    broken.ctx.resume.mockRejectedValue(new Error('not allowed'));
    broken.ctx.createOscillator = () => {
      throw new Error('broken');
    };
    setAudioContextFactory(broken.factory);
    expect(() => playPling()).not.toThrow();
    // Let the rejected resume() settle: it must not surface as an unhandled rejection.
    await new Promise((r) => setTimeout(r, 0));
  });
});
