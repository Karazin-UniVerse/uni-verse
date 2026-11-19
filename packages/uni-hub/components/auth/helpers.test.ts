import { describe, it, expect } from 'vitest';
import {
  parseGoogleClaims,
  extractGoogleDisplayName,
  getLinkMoodleContentKeys,
  LinkMoodleMode,
  resolveGoogleButtonWidth,
  GOOGLE_BUTTON_FALLBACK_WIDTH,
  GOOGLE_BUTTON_MIN_WIDTH,
  GOOGLE_BUTTON_MAX_WIDTH,
} from './helpers';

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

describe('extractGoogleDisplayName', () => {
  it('returns trimmed claims.name when present', () => {
    expect(extractGoogleDisplayName({ name: '  Богдан Мельник  ' })).toBe('Богдан Мельник');
  });

  it('combines given_name and family_name when name is absent', () => {
    expect(
      extractGoogleDisplayName({
        given_name: 'Богдан',
        family_name: 'Мельник',
      }),
    ).toBe('Богдан Мельник');
  });

  it('combines given_name and family_name when name is empty whitespace', () => {
    expect(
      extractGoogleDisplayName({
        name: '   ',
        given_name: 'Богдан',
        family_name: 'Мельник',
      }),
    ).toBe('Богдан Мельник');
  });

  it('returns single given_name or family_name when only one is provided', () => {
    expect(extractGoogleDisplayName({ given_name: 'Богдан' })).toBe('Богдан');
    expect(extractGoogleDisplayName({ family_name: 'Мельник' })).toBe('Мельник');
  });

  it('returns empty string when no name claims are present', () => {
    expect(extractGoogleDisplayName({})).toBe('');
    expect(extractGoogleDisplayName({ email: 'student@karazin.ua' })).toBe('');
  });
});

describe('resolveGoogleButtonWidth', () => {
  it('returns fallback width when measured width is not provided, 0, or negative', () => {
    expect(resolveGoogleButtonWidth()).toBe(GOOGLE_BUTTON_FALLBACK_WIDTH);
    expect(resolveGoogleButtonWidth(null)).toBe(GOOGLE_BUTTON_FALLBACK_WIDTH);
    expect(resolveGoogleButtonWidth(0)).toBe(GOOGLE_BUTTON_FALLBACK_WIDTH);
    expect(resolveGoogleButtonWidth(-50)).toBe(GOOGLE_BUTTON_FALLBACK_WIDTH);
    expect(resolveGoogleButtonWidth(Number.NaN)).toBe(GOOGLE_BUTTON_FALLBACK_WIDTH);
  });

  it('clamps to minimum width (200px) when container is narrower than 200px', () => {
    expect(resolveGoogleButtonWidth(120)).toBe(GOOGLE_BUTTON_MIN_WIDTH);
    expect(resolveGoogleButtonWidth(199)).toBe(GOOGLE_BUTTON_MIN_WIDTH);
  });

  it('clamps to maximum width (400px) when container is wider than 400px', () => {
    expect(resolveGoogleButtonWidth(401)).toBe(GOOGLE_BUTTON_MAX_WIDTH);
    expect(resolveGoogleButtonWidth(600)).toBe(GOOGLE_BUTTON_MAX_WIDTH);
  });

  it('floors fractional widths and returns the exact integer value within range', () => {
    expect(resolveGoogleButtonWidth(280.7)).toBe(280);
    expect(resolveGoogleButtonWidth(336)).toBe(336);
    expect(resolveGoogleButtonWidth(250)).toBe(250);
  });
});
