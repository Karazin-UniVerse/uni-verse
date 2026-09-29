import confetti from 'canvas-confetti';

export function fireConfetti(): void {
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 2000,
  };

  confetti({
    ...defaults,
    particleCount: 80,
    spread: 70,
    startVelocity: 35,
  });

  window.setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 40,
      spread: 100,
      startVelocity: 25,
      scalar: 0.9,
    });
  }, 180);
}
