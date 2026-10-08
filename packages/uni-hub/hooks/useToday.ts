import { useEffect, useState } from 'react';

/**
 * Returns milliseconds until next local midnight, at least 1000ms.
 */
export function getMsUntilMidnight(now = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return Math.max(1000, tomorrow.getTime() - now.getTime());
}

/**
 * Returns the current date, automatically updating when local midnight arrives.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const timerId = setTimeout(() => {
      setToday(new Date());
    }, getMsUntilMidnight());

    return () => clearTimeout(timerId);
  }, [today]);

  return today;
}
