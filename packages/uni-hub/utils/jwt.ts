export interface JwtPayload {
  sub?: string;
  email?: string;
  roles?: string[];
  name?: string;
  [key: string]: unknown;
}

export function parseJwt(token: string): JwtPayload | null {
  if (!token) return null;

  try {
    const parts = token.split('.');

    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + (c.codePointAt(0) ?? 0).toString(16).padStart(2, '0'))
        .join(''),
    );

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}
