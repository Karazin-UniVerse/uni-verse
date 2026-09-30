import { useEffect, useState } from 'react';

/** Updates once per second for countdown UIs without calling Date.now during render purity checks. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), intervalMs);

    return () => window.clearInterval(intervalId);
  }, [intervalMs]);

  return now;
}
