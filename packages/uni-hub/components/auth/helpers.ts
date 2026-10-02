export interface GoogleJwtClaims {
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export const parseGoogleClaims = (token: string): GoogleJwtClaims => {
  try {
    const parts = token.split('.');

    if (parts.length < 2) {
      return {};
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => '%' + ('00' + (char.codePointAt(0) ?? 0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload) as GoogleJwtClaims;
  } catch {
    return {};
  }
};
