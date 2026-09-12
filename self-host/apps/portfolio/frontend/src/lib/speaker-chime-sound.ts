// A tiny 4-note major-triad-plus-octave arpeggio ("boop-boop-boop-BOOP") for the device's fake
// speaker grille - reads as a little "power on" chime rather than a flat beep. Same lazy-singleton
// AudioContext pattern as the rest of src/lib's sound modules.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// C major triad climbing to the octave - C5, E5, G5, C6. Purely a "cute little device chime",
// not tied to the tile gallery's own pentatonic scale (tile-note-sound.ts) since this isn't a
// clickable instrument, just a one-shot confirmation sound.
const NOTES: { freq: number; start: number; duration: number }[] = [
  { freq: 523.25, start: 0, duration: 0.11 },
  { freq: 659.25, start: 0.09, duration: 0.11 },
  { freq: 783.99, start: 0.18, duration: 0.11 },
  { freq: 1046.5, start: 0.27, duration: 0.22 },
];

// volume is the device's own 0-100 volume-button state (see BlogIpadFrame's volume prop),
// scaled here to a 0-1 gain multiplier - this is the speaker grille's actual output level, not
// just a HUD number, so muting (volume 0) genuinely silences the chime rather than only hiding
// the on-screen bar.
export function playSpeakerChime(volume = 100) {
  const audioCtx = getContext();
  if (!audioCtx) return;
  const gainMultiplier = Math.max(0, Math.min(100, volume)) / 100;
  if (gainMultiplier === 0) return;

  const now = audioCtx.currentTime;
  for (const note of NOTES) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, now + note.start);
    gain.gain.setValueAtTime(0, now + note.start);
    gain.gain.linearRampToValueAtTime(0.18 * gainMultiplier, now + note.start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + note.start);
    osc.stop(now + note.start + note.duration + 0.02);
  }
}
