// A synthesized two-stage mechanical shutter click: a sharp high-frequency "open" tick followed
// ~70ms later by a slightly lower, softer "close" tick - the same two-click cadence a real
// leaf-shutter camera makes. Same lazy-singleton AudioContext pattern as the rest of src/lib's
// sound modules.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function click(audioCtx: AudioContext, time: number, highpassFreq: number, duration: number, peak: number) {
  const bufferSize = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpassFreq;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  noise.connect(filter).connect(gain).connect(audioCtx.destination);
  noise.start(time);
  noise.stop(time + duration + 0.02);
}

export function playShutterSound() {
  const audioCtx = getContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  click(audioCtx, now, 3200, 0.03, 0.6);
  click(audioCtx, now + 0.07, 2000, 0.05, 0.4);
}
