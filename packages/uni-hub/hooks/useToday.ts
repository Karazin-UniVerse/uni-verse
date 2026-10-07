import { useEffect, useState } from 'react';

/**
 * Returns the current date, automatically updating when local midnight arrives.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = Math.max(1000, tomorrow.getTime() - now.getTime());

    const timerId = window.setTimeout(() => {
      setToday(new Date());
    }, msUntilMidnight);

    return () => window.clearTimeout(timerId);
  }, [today]);

  return today;
}
