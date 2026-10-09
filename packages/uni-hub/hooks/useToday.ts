import { useSyncExternalStore } from 'react';

/**
 * Returns milliseconds until next local midnight, at least 1000ms.
 */
export function getMsUntilMidnight(now = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return Math.max(1000, tomorrow.getTime() - now.getTime());
}

let cachedTodayDate: Date | null = null;
const listeners = new Set<() => void>();
let midnightTimer: ReturnType<typeof setTimeout> | null = null;

function isSameCalendarDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function getClientToday(): Date {
  const now = new Date();

  if (!cachedTodayDate || !isSameCalendarDay(now, cachedTodayDate)) {
    cachedTodayDate = now;
  }

  return cachedTodayDate;
}

function scheduleMidnightNotification(): void {
  if (midnightTimer) {
    clearTimeout(midnightTimer);
  }

  const msUntilMidnight = getMsUntilMidnight(getClientToday());

  midnightTimer = setTimeout(() => {
    cachedTodayDate = new Date();
    listeners.forEach((listener) => listener());
    scheduleMidnightNotification();
  }, msUntilMidnight);
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  if (listeners.size === 1) {
    scheduleMidnightNotification();
  }

  return () => {
    listeners.delete(callback);

    if (listeners.size === 0 && midnightTimer) {
      clearTimeout(midnightTimer);
      midnightTimer = null;
    }
  };
}

const getNullServerSnapshot = (): null => null;

/**
 * Returns the current date, automatically updating when local midnight arrives.
 * Keeps today unset (null) during SSR/hydration unless an initialDate is provided,
 * preventing hydration mismatches between server and client near midnight.
 */
export function useToday(initialDate: Date | null = null): Date | null {
  const getServerSnapshot = initialDate ? () => initialDate : getNullServerSnapshot;

  return useSyncExternalStore(subscribe, getClientToday, getServerSnapshot);
}
