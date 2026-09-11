import { isBrowser } from '@uni-hub/utils/browser';

export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.length > 0) {
      searchParams.append(key, value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}
/**
 * Determines whether a URL is secure (HTTPS) or points to a local loopback interface
 * (IPv4 localhost/127.0.0.1 or IPv6 ::1/[::1]).
 */
export function isSecureOrLoopback(targetUrl: string): boolean {
  try {
    const fallbackOrigin = isBrowser ? window.location.origin : '';
    const parsed = new URL(targetUrl, fallbackOrigin);

    return (
      parsed.protocol === 'https:' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname === '[::1]'
    );
  } catch {
    return false;
  }
}
