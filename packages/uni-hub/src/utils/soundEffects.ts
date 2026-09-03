let audioContextInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextConstructor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContextInstance) {
    audioContextInstance = new AudioContextConstructor();
  }

  return audioContextInstance;
}

function playTone(
  frequency: number,
  duration: number,
  oscillatorType: OscillatorType,
  gain = 0.04,
  delaySeconds = 0,
): void {
  const audioContext = getAudioContext();

  if (!audioContext) {
    return;
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = oscillatorType;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = gain;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const startTime = audioContext.currentTime + delaySeconds;

  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function playClick(enabled: boolean): void {
  if (!enabled) {
    return;
  }

  playTone(660, 0.05, 'sine', 0.03);
}

export function playSuccess(enabled: boolean): void {
  if (!enabled) {
    return;
  }

  playTone(523.25, 0.09, 'triangle', 0.045, 0);
  playTone(659.25, 0.1, 'triangle', 0.04, 0.08);
  playTone(783.99, 0.14, 'triangle', 0.035, 0.16);
}
