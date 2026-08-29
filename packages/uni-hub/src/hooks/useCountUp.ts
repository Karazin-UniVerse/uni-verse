import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a number toward `target` with requestAnimationFrame.
 * Skips animation when `enabled` is false or `target` has not changed.
 */
export function useCountUp(target: number, duration = 800, enabled = true): number {
  const [value, setValue] = useState(target);
  const prevTargetRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (prevTargetRef.current === target) return;

    const from = prevTargetRef.current;
    prevTargetRef.current = target;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      setValue(Math.round(from + (target - from) * easeOutCubic(t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  return value;
}
