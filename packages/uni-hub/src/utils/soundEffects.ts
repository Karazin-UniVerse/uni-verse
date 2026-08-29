let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function tone(freq: number, duration: number, type: OscillatorType, gain = 0.04, when = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);

  const t0 = ctx.currentTime + when;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration);
}

export function playClick(enabled: boolean): void {
  if (!enabled) return;
  tone(660, 0.05, 'sine', 0.03);
}

export function playSuccess(enabled: boolean): void {
  if (!enabled) return;
  tone(523.25, 0.09, 'triangle', 0.045, 0);
  tone(659.25, 0.1, 'triangle', 0.04, 0.08);
  tone(783.99, 0.14, 'triangle', 0.035, 0.16);
}
