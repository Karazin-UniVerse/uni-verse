import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { createAppProvidersWrapper, setTestFeatureFlags } from '@uni-hub/utils/test-utils';
import LoginPage from './LoginPage';

const mockPush = vi.fn();
const mockAuthApi = vi.hoisted(() => ({
  loginWithGoogle: vi.fn(),
  login: vi.fn(),
  linkMoodleAccount: vi.fn(),
  logout: vi.fn(),
}));

const MOCK_GOOGLE_TOKEN = `header.${btoa(
  JSON.stringify({ name: 'Test Student', email: 'test@karazin.ua' }),
)}.signature`;

let googleCallback: ((response: { credential?: string }) => void) | undefined;

function setupGoogleIdentityStub(token: string = MOCK_GOOGLE_TOKEN) {
  googleCallback = undefined;

  window.google = {
    accounts: {
      id: {
        initialize: vi.fn(({ callback }: { callback: (res: { credential?: string }) => void }) => {
          googleCallback = callback;
        }),
        renderButton: vi.fn((container: HTMLElement) => {
          const btn = document.createElement('button');

          btn.type = 'button';
          btn.setAttribute('data-testid', 'google-btn');
          btn.addEventListener('click', () => {
            googleCallback?.({ credential: token });
          });
          container.appendChild(btn);
        }),
      },
    },
  } as unknown as typeof window.google;
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/script', () => ({
  default: () => null,
}));

vi.mock('@uni-hub/services/api.auth', () => ({
  authApi: mockAuthApi,
}));

function renderLoginPage() {
  return render(<LoginPage />, {
    wrapper: createAppProvidersWrapper(),
  });
}

describe('LoginPage Google SSO Moodle integration bypass and authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupGoogleIdentityStub();
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
    window.localStorage.clear();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    delete (window as unknown as { google?: unknown }).google;
    window.localStorage.clear();
  });

  it('should set isLoggedIn = true and redirect to / without requiring Moodle link when isMoodleIntegrationEnabled is false', async () => {
    setTestFeatureFlags({ isMoodleIntegrationEnabled: false });

    const user = userEvent.setup();

    mockAuthApi.loginWithGoogle.mockResolvedValueOnce({
      data: { isLinked: false, access_token: 'mock-token' },
    });

    renderLoginPage();

    await user.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(window.localStorage.getItem('isLoggedIn')).toBe('true');
    });

    expect(window.localStorage.getItem('isMoodleLinked')).toBe('false');
    expect(window.localStorage.getItem('username')).toBe('Test Student');
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(screen.getByText('Вхід виконано успішно')).toBeInTheDocument();
  });

  it('should fall back to email username when Google claims omit name fields', async () => {
    setTestFeatureFlags({ isMoodleIntegrationEnabled: false });

    const tokenWithoutName = `header.${btoa(
      JSON.stringify({ email: 'nameless.student@karazin.ua' }),
    )}.signature`;

    setupGoogleIdentityStub(tokenWithoutName);

    const user = userEvent.setup();

    mockAuthApi.loginWithGoogle.mockResolvedValueOnce({
      data: { isLinked: false, access_token: 'mock-token' },
    });

    renderLoginPage();

    await user.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(window.localStorage.getItem('isLoggedIn')).toBe('true');
    });

    expect(window.localStorage.getItem('username')).toBe('nameless.student');
    expect(window.localStorage.getItem('userEmail')).toBe('nameless.student@karazin.ua');
  });

  it('should not set isLoggedIn and not redirect to / when isMoodleIntegrationEnabled is true and account is unlinked', async () => {
    setTestFeatureFlags({ isMoodleIntegrationEnabled: true });

    const user = userEvent.setup();

    mockAuthApi.loginWithGoogle.mockResolvedValueOnce({
      data: { isLinked: false, access_token: 'mock-token' },
    });

    renderLoginPage();

    await user.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(window.localStorage.getItem('isMoodleLinked')).toBe('false');
    });

    expect(window.localStorage.getItem('isLoggedIn')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /прив’язати moodle/i })).toBeInTheDocument();
  });

  it('should show error toast on Google login failure', async () => {
    const user = userEvent.setup();

    mockAuthApi.loginWithGoogle.mockRejectedValueOnce(new Error('Помилка сервера Google'));

    renderLoginPage();

    await user.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(screen.getAllByText('Помилка сервера Google').length).toBeGreaterThanOrEqual(1);
    });

    expect(window.localStorage.getItem('isLoggedIn')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should set isLoggedIn = true and redirect to / when isMoodleIntegrationEnabled is true and account is already linked', async () => {
    setTestFeatureFlags({ isMoodleIntegrationEnabled: true });

    const user = userEvent.setup();

    mockAuthApi.loginWithGoogle.mockResolvedValueOnce({
      data: { isLinked: true, access_token: 'mock-token' },
    });

    renderLoginPage();

    await user.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(window.localStorage.getItem('isLoggedIn')).toBe('true');
    });

    expect(window.localStorage.getItem('isMoodleLinked')).toBe('true');
    expect(window.localStorage.getItem('username')).toBe('Test Student');
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(screen.getByText('Вхід виконано успішно')).toBeInTheDocument();
  });

  it('should allow linking Moodle account when user enters credentials on link screen', async () => {
    setTestFeatureFlags({ isMoodleIntegrationEnabled: true });

    const user = userEvent.setup();

    mockAuthApi.loginWithGoogle.mockResolvedValueOnce({
      data: { isLinked: false, access_token: 'mock-token' },
    });
    mockAuthApi.linkMoodleAccount.mockResolvedValueOnce({});

    renderLoginPage();

    await user.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Логін у Moodle')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Логін у Moodle'), 'moodleuser');
    await user.type(screen.getByPlaceholderText('Пароль'), 'moodlepassword');

    await user.click(screen.getByRole('button', { name: /прив’язати moodle/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('isLoggedIn')).toBe('true');
    });

    expect(window.localStorage.getItem('isMoodleLinked')).toBe('true');
    expect(window.localStorage.getItem('username')).toBe('Test Student');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should allow skipping Moodle link and redirect to /', async () => {
    setTestFeatureFlags({ isMoodleIntegrationEnabled: true });

    const user = userEvent.setup();

    mockAuthApi.loginWithGoogle.mockResolvedValueOnce({
      data: { isLinked: false, access_token: 'mock-token' },
    });

    renderLoginPage();

    await user.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /пропустити/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /пропустити/i }));

    expect(window.localStorage.getItem('isLoggedIn')).toBe('true');
    expect(window.localStorage.getItem('isMoodleLinked')).toBe('false');
    expect(window.localStorage.getItem('username')).toBe('Test Student');
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(screen.getByText('Вхід виконано успішно')).toBeInTheDocument();
  });

  it('should cancel Moodle linking and return to login form', async () => {
    setTestFeatureFlags({ isMoodleIntegrationEnabled: true });

    const user = userEvent.setup();

    mockAuthApi.loginWithGoogle.mockResolvedValueOnce({
      data: { isLinked: false, access_token: 'mock-token' },
    });

    renderLoginPage();

    await user.click(screen.getByTestId('google-btn'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /повернутися до входу/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /повернутися до входу/i }));

    expect(screen.queryByPlaceholderText('Логін у Moodle')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ім’я користувача або email')).toBeInTheDocument();
  });

  it('should show error message when GoogleLoginButton triggers onError', async () => {
    renderLoginPage();

    expect(googleCallback).toBeDefined();

    act(() => {
      googleCallback?.({});
    });

    await waitFor(() => {
      expect(screen.getByText('Помилка входу через Google')).toBeInTheDocument();
    });
  });

  it('should perform standard Moodle credentials login successfully', async () => {
    const user = userEvent.setup();

    mockAuthApi.login.mockResolvedValueOnce({
      data: { access_token: 'moodle-session-token' },
    });

    renderLoginPage();

    await user.type(screen.getByPlaceholderText('Ім’я користувача або email'), 'moodle_student');
    await user.type(screen.getByPlaceholderText('Пароль'), 'secretpass');

    await user.click(screen.getByRole('button', { name: /^увійти$/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('isLoggedIn')).toBe('true');
    });

    expect(window.localStorage.getItem('isMoodleLinked')).toBe('true');
    expect(window.localStorage.getItem('username')).toBe('moodle_student');
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(screen.getByText('Вхід виконано успішно')).toBeInTheDocument();
  });

  it('should show error when username is empty during credentials login', async () => {
    const user = userEvent.setup();

    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /^увійти$/i }));

    await waitFor(() => {
      expect(screen.getByText("Будь ласка, введіть ім'я користувача")).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show error when password is empty during credentials login', async () => {
    const user = userEvent.setup();

    renderLoginPage();

    await user.type(screen.getByPlaceholderText('Ім’я користувача або email'), 'moodle_student');

    await user.click(screen.getByRole('button', { name: /^увійти$/i }));

    await waitFor(() => {
      expect(screen.getByText('Будь ласка, введіть пароль')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show error toast when credentials login fails', async () => {
    const user = userEvent.setup();

    mockAuthApi.login.mockRejectedValueOnce(new Error('Невірний логін або пароль'));

    renderLoginPage();

    await user.type(screen.getByPlaceholderText('Ім’я користувача або email'), 'moodle_student');
    await user.type(screen.getByPlaceholderText('Пароль'), 'wrongpass');

    await user.click(screen.getByRole('button', { name: /^увійти$/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Невірний логін або пароль').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should toggle password visibility when show password button is clicked', async () => {
    const user = userEvent.setup();

    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText('Пароль');

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByLabelText(/показати пароль/i));

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByLabelText(/сховати пароль/i));

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should not render Google login button when NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    renderLoginPage();

    expect(screen.queryByRole('button', { name: /продовжити з google/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('google-btn')).not.toBeInTheDocument();
  });
});
