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

  audioContextInstance ??= new AudioContextConstructor();

  return audioContextInstance;
}

type PlayToneParams = {
  frequency: number;
  duration: number;
  oscillatorType: OscillatorType;
  gain?: number;
  delaySeconds?: number;
};

function playTone({
  frequency,
  duration,
  oscillatorType,
  gain = 0.04,
  delaySeconds = 0,
}: PlayToneParams): void {
  const audioContext = getAudioContext();

  if (!audioContext) {
    return;
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => {
      // Ignore autoplay restriction rejections
    });
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

  playTone({ frequency: 660, duration: 0.05, oscillatorType: 'sine', gain: 0.03 });
}

export function playSuccess(enabled: boolean): void {
  if (!enabled) {
    return;
  }

  playTone({ frequency: 523.25, duration: 0.09, oscillatorType: 'triangle', gain: 0.045 });
  playTone({
    frequency: 659.25,
    duration: 0.1,
    oscillatorType: 'triangle',
    gain: 0.04,
    delaySeconds: 0.08,
  });
  playTone({
    frequency: 783.99,
    duration: 0.14,
    oscillatorType: 'triangle',
    gain: 0.035,
    delaySeconds: 0.16,
  });
}
