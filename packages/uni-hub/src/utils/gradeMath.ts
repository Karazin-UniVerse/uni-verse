/**
 * Weighted final grade for the "what if" simulator.
 * Current course grade = 70%, hypothetical remaining work average = 30%.
 */
export function computeSimulatedFinal(
  currentScore: number | null,
  remainingScores: number[],
): number {
  const current =
    currentScore === null || currentScore === undefined || Number.isNaN(currentScore)
      ? 0
      : clamp(currentScore, 0, 100);

  if (remainingScores.length === 0) {
    return Math.round(current * 10) / 10;
  }

  const avgRemaining =
    remainingScores.reduce((sum, s) => sum + clamp(s, 0, 100), 0) / remainingScores.length;

  return Math.round((current * 0.7 + avgRemaining * 0.3) * 10) / 10;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
