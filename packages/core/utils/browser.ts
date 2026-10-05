/**
 * Determines whether the current execution context is a browser.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}
