// Swipe sounds, synthesized with the Web Audio API so there are no audio files to ship or load:
// a swoosh of air for a pass and a bell-like pling for a match. Sound is decoration only: with no
// Web Audio, or when the browser blocks it, every call is a silent no-op.

type ContextFactory = () => AudioContext | null;

const defaultFactory: ContextFactory = () => {
  const scope = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Context = scope.AudioContext ?? scope.webkitAudioContext;
  return Context ? new Context() : null;
};

let createContext = defaultFactory;
let context: AudioContext | null = null;

/** Test seam: make the context with `factory` from now on (the browser's when omitted), starting afresh. */
export function setAudioContextFactory(factory: ContextFactory = defaultFactory) {
  createContext = factory;
  context = null;
}

// One context for the app, made on the first sound. Sounds play from a swipe or a button tap, a user
// gesture, so the browser lets the context start, or resume if it was suspended.
function play(build: (ctx: AudioContext, t: number) => void) {
  try {
    context ??= createContext();
    if (!context) return;
    if (context.state !== 'running') context.resume().catch(() => {});
    build(context, context.currentTime);
  } catch {
    // No Web Audio, or blocked: stay silent.
  }
}

/** A pass: about 0.3 s of white noise through a band-pass sweeping down, a quick swell and a smooth fade. */
export function playSwoosh() {
  play((ctx, t) => {
    const length = 0.3;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.8;
    band.frequency.setValueAtTime(2800, t);
    band.frequency.exponentialRampToValueAtTime(400, t + length);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);

    noise.connect(band).connect(gain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + length);
  });
}

/** A match: a bright bell, E6 (1318.5 Hz) with a softer octave that fades first, about half a second. */
export function playPling() {
  play((ctx, t) => {
    const partials: [frequency: number, peak: number, length: number][] = [
      [1318.5, 0.2, 0.5],
      [2637, 0.07, 0.3],
    ];
    for (const [frequency, peak, length] of partials) {
      const tone = ctx.createOscillator();
      tone.type = 'sine';
      tone.frequency.value = frequency;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
      tone.connect(gain).connect(ctx.destination);
      tone.start(t);
      tone.stop(t + length);
    }
  });
}
