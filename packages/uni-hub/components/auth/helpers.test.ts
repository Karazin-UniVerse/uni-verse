import { describe, it, expect } from 'vitest';
import { parseGoogleClaims, getLinkMoodleContentKeys, LinkMoodleMode } from './helpers';

describe('getLinkMoodleContentKeys', () => {
  it('returns default connect mode translation keys', () => {
    const keys = getLinkMoodleContentKeys(LinkMoodleMode.CONNECT);

    expect(keys.titleKey).toBe('login.linkMoodleTitle');
    expect(keys.hintKey).toBe('login.linkMoodleHint');
    expect(keys.submitKey).toBe('login.linkMoodleSubmit');
    expect(keys.successKey).toBe('login.linkMoodleSuccess');
  });

  it('defaults to connect mode when no argument passed', () => {
    const keys = getLinkMoodleContentKeys();

    expect(keys.titleKey).toBe('login.linkMoodleTitle');
    expect(keys.hintKey).toBe('login.linkMoodleHint');
  });

  it('returns change mode translation keys when mode is CHANGE', () => {
    const keys = getLinkMoodleContentKeys(LinkMoodleMode.CHANGE);

    expect(keys.titleKey).toBe('login.changeMoodleTitle');
    expect(keys.hintKey).toBe('login.changeMoodleHint');
    expect(keys.submitKey).toBe('login.changeMoodleSubmit');
    expect(keys.successKey).toBe('login.changeMoodleSuccess');
  });
});

describe('parseGoogleClaims', () => {
  it('correctly parses claims from a valid mock JWT token', () => {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        email: 'student@karazin.ua',
        name: 'Student Name',
        given_name: 'Student',
        family_name: 'Name',
      }),
    );
    const mockToken = `${header}.${payload}.mock-signature`;

    const claims = parseGoogleClaims(mockToken);

    expect(claims.email).toBe('student@karazin.ua');
    expect(claims.name).toBe('Student Name');
  });

  it('correctly decodes UTF-8 Cyrillic names in claims', () => {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payloadJson = JSON.stringify({
      email: 'skrypnyk.dmytro@student.karazin.ua',
      name: 'Дмитро Скрипник',
    });
    // encode UTF-8 bytes to base64
    const base64 = btoa(unescape(encodeURIComponent(payloadJson)));
    const mockToken = `${header}.${base64}.signature`;

    const claims = parseGoogleClaims(mockToken);

    expect(claims.email).toBe('skrypnyk.dmytro@student.karazin.ua');
    expect(claims.name).toBe('Дмитро Скрипник');
  });

  it('returns empty object when token is empty or invalid format', () => {
    expect(parseGoogleClaims('')).toEqual({});
    expect(parseGoogleClaims('invalid-token')).toEqual({});
    expect(parseGoogleClaims('header.invalid-base64-payload!!!.signature')).toEqual({});
  });
});
