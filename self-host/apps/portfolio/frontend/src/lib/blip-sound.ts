// A short, cute "bit" blip - two quick square-wave notes rising in pitch, the classic
// retro-UI-confirmation sound. Synthesized rather than a sound file: no asset to host, no
// licensing to track, and this really is how chiptune blips are made in the first place (a
// couple of oscillator tones with a fast decay envelope), so it's not really a compromise.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  // Reused across calls, not recreated per-click - browsers cap how many AudioContexts can
  // exist at once, and there's no reason to pay setup cost twice.
  if (!ctx) ctx = new Ctor();
  // Autoplay policy suspends new contexts until a user gesture - playBlip() is only ever called
  // from a click handler, which counts, but the context can still start suspended on first use.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

const NOTES: { freq: number; start: number; duration: number }[] = [
  { freq: 740, start: 0, duration: 0.06 },
  { freq: 988, start: 0.05, duration: 0.09 },
];

export function playBlip() {
  const audioCtx = getContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  for (const note of NOTES) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(note.freq, now + note.start);
    // Ramp up first (exponentialRamp can't start from 0), then decay - avoids the click/pop a
    // hard on/off transition would leave in the waveform.
    gain.gain.setValueAtTime(0, now + note.start);
    gain.gain.linearRampToValueAtTime(0.15, now + note.start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + note.start);
    osc.stop(now + note.start + note.duration + 0.02);
  }
}
