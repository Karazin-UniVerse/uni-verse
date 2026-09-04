/**
 * Utility flag indicating whether the current runtime environment is a browser.
 * Protects against SSR / Node.js execution errors when accessing window or localStorage.
 */
export const isBrowser = typeof window !== 'undefined';
