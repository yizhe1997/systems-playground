// A tiny synthesized "music box" pluck per gallery tile - no sample library, just oscillators.
// Notes are drawn from a major pentatonic scale (no interval in that scale ever clashes), so
// clicking tiles in any order - slow, fast, out of sequence, mashed rapidly - always sounds
// musical rather than occasionally landing on a dissonant pair the way a full major/chromatic
// scale can.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// C major pentatonic (C D E G A), semitones from C4 - wraps into successive octaves for however
// many tiles exist, so a bigger gallery climbs higher rather than repeating the same five notes.
const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9];
const BASE_FREQ = 261.63; // C4

function frequencyForIndex(index: number): number {
  const step = ((index % PENTATONIC_SEMITONES.length) + PENTATONIC_SEMITONES.length) % PENTATONIC_SEMITONES.length;
  const octave = Math.floor(index / PENTATONIC_SEMITONES.length);
  const semitone = PENTATONIC_SEMITONES[step] + octave * 12;
  return BASE_FREQ * Math.pow(2, semitone / 12);
}

// Each tile gets a fixed, stable note (by its position in the gallery) - clicking the same tile
// twice always plays the same pitch, so the gallery behaves like a real (if tiny) instrument
// rather than random noise.
export function playTileNote(index: number) {
  const audioCtx = getContext();
  if (!audioCtx) return;

  const freq = frequencyForIndex(index);
  const now = audioCtx.currentTime;

  // Fundamental + a quiet octave-up partial - a single oscillator reads as a flat beep, two (with
  // the upper one much quieter) reads as a small bell/music-box.
  const partials: { freq: number; gain: number; duration: number }[] = [
    { freq, gain: 0.16, duration: 0.35 },
    { freq: freq * 2, gain: 0.05, duration: 0.2 },
  ];

  for (const p of partials) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(p.gain, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + p.duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + p.duration + 0.02);
  }
}
