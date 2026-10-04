export interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  name?: string;
  [key: string]: unknown;
}

export function parseJwt(token: string): JwtPayload | null {
  if (!token) return null;

  try {
    const parts = token.split('.');

    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}
