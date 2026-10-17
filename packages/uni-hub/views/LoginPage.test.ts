import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { withQueryClient } from '@uni-hub/utils/with-query-client';
import LoginPage from './LoginPage';

const mockPush = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
const mockStorage: Record<string, string> = {};
let mockMoodleIntegrationEnabled = false;
let capturedGoogleSuccess: ((token: string) => Promise<void>) | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@una', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@una');

  return {
    ...actual,
    useToast: () => mockToast,
    SimpleForm: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('form', null, children),
    Button: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('button', { type: 'button' }, children),
  };
});

vi.mock('@uni-hub/theme/ThemeSwitcher', () => ({
  ThemeSwitcher: () => null,
}));

vi.mock('@uni-hub/components/common/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));

vi.mock('@uni-hub/features', () => ({
  useFeatures: () => ({
    isMoodleIntegrationEnabled: mockMoodleIntegrationEnabled,
  }),
}));

vi.mock('@uni-hub/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    formatMessage: (key: string) => key,
  }),
}));

vi.mock('@uni-hub/services/api.auth', () => ({
  authApi: {
    loginWithGoogle: vi.fn(),
  },
}));

vi.mock('@uni-hub/services/api', () => ({
  safeStorage: {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
  },
  getErrorMessage: vi.fn((_error, fallback) => fallback),
}));

vi.mock('@uni-hub/components/auth', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@uni-hub/components/auth');

  return {
    ...actual,
    GoogleLoginButton: ({ onSuccess }: { onSuccess: (token: string) => Promise<void> }) => {
      capturedGoogleSuccess = onSuccess;

      return React.createElement('button', { 'data-testid': 'google-btn' }, 'Google');
    },
  };
});

describe('LoginPage Google SSO Moodle integration bypass', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }

    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
  });

  it('sets isLoggedIn = true and redirects to / without requiring Moodle link when isMoodleIntegrationEnabled is false', async () => {
    mockMoodleIntegrationEnabled = false;
    const { authApi } = await import('@uni-hub/services/api.auth');

    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: { isLinked: false, token: 'mock-token' },
    } as any);

    renderToStaticMarkup(withQueryClient(React.createElement(LoginPage)));
    expect(capturedGoogleSuccess).toBeDefined();

    const payload = btoa(JSON.stringify({ name: 'Test Student', email: 'test@karazin.ua' }));
    const mockToken = `header.${payload}.signature`;

    await capturedGoogleSuccess!(mockToken);

    expect(mockStorage.isLoggedIn).toBe('true');
    expect(mockStorage.isMoodleLinked).toBe('false');
    expect(mockStorage.username).toBe('Test Student');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('does not set isLoggedIn and does not redirect to / when isMoodleIntegrationEnabled is true and account is unlinked', async () => {
    mockMoodleIntegrationEnabled = true;
    const { authApi } = await import('@uni-hub/services/api.auth');

    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: { isLinked: false, token: 'mock-token' },
    } as any);

    renderToStaticMarkup(withQueryClient(React.createElement(LoginPage)));
    expect(capturedGoogleSuccess).toBeDefined();

    const payload = btoa(JSON.stringify({ name: 'Test Student', email: 'test@karazin.ua' }));
    const mockToken = `header.${payload}.signature`;

    await capturedGoogleSuccess!(mockToken);

    expect(mockStorage.isLoggedIn).toBeUndefined();
    expect(mockStorage.isMoodleLinked).toBe('false');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
