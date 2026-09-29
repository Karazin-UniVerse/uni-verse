import { useEffect, useRef, useState } from 'react';

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

/**
 * Animates a number toward `target` with requestAnimationFrame.
 * Skips animation when `enabled` is false or `target` has not changed.
 * Synchronizes displayed value when disabled or interrupted early.
 */
export function useCountUp(target: number, duration = 800, enabled = true): number {
  const [prevTarget, setPrevTarget] = useState(target);
  const [prevEnabled, setPrevEnabled] = useState(enabled);
  const [value, setValue] = useState(target);
  const displayedValueRef = useRef(target);
  const prevTargetRef = useRef(target);
  const rafRef = useRef(0);

  if (target !== prevTarget || enabled !== prevEnabled) {
    setPrevTarget(target);
    setPrevEnabled(enabled);

    if (!enabled || duration <= 0) {
      setValue(target);
    }
  }

  useEffect(() => {
    if (!enabled || duration <= 0) {
      displayedValueRef.current = target;
      prevTargetRef.current = target;

      return;
    }

    if (prevTargetRef.current === target && displayedValueRef.current === target) {
      return;
    }

    const from = displayedValueRef.current;

    prevTargetRef.current = target;

    const startTime = performance.now();

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const nextValue = Math.round(from + (target - from) * easeOutCubic(progress));

      displayedValueRef.current = nextValue;
      setValue(nextValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayedValueRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  if (!enabled || duration <= 0) {
    return target;
  }

  return value;
}
