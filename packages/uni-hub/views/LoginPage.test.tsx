import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { createAppProvidersWrapper } from '@uni-hub/utils/test-utils';
import LoginPage from './LoginPage';

const mockPush = vi.fn();
const mockAuthApi = vi.hoisted(() => ({
  loginWithGoogle: vi.fn(),
  login: vi.fn(),
  linkMoodleAccount: vi.fn(),
  logout: vi.fn(),
}));

let capturedGoogleError: ((msg: string) => void) | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@uni-hub/services/api.auth', () => ({
  authApi: mockAuthApi,
}));

vi.mock('@uni-hub/components/auth', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@uni-hub/components/auth');

  return {
    ...actual,
    GoogleLoginButton: ({
      onSuccess,
      onError,
      disabled,
    }: {
      onSuccess: (token: string) => Promise<void>;
      onError?: (msg: string) => void;
      disabled?: boolean;
    }) => {
      capturedGoogleError = onError ?? null;

      return (
        <button
          type="button"
          data-testid="google-btn"
          disabled={disabled}
          onClick={() => {
            const payload = btoa(
              JSON.stringify({ name: 'Test Student', email: 'test@karazin.ua' }),
            );
            const mockToken = `header.${payload}.signature`;

            void onSuccess(mockToken);
          }}
        >
          Google
        </button>
      );
    },
  };
});

function renderLoginPage() {
  return render(<LoginPage />, {
    wrapper: createAppProvidersWrapper(),
  });
}

describe('LoginPage Google SSO Moodle integration bypass and authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
    window.localStorage.clear();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    window.localStorage.clear();
  });

  it('should set isLoggedIn = true and redirect to / without requiring Moodle link when isMoodleIntegrationEnabled is false', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'false';

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

  it('should not set isLoggedIn and not redirect to / when isMoodleIntegrationEnabled is true and account is unlinked', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';

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
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';

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
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';

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
    expect(window.localStorage.getItem('username')).toBe('moodleuser');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should allow skipping Moodle link and redirect to /', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';

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
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';

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

    expect(capturedGoogleError).not.toBeNull();

    act(() => {
      capturedGoogleError?.('Помилка авторизації через Google');
    });

    await waitFor(() => {
      expect(screen.getByText('Помилка авторизації через Google')).toBeInTheDocument();
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

    expect(screen.queryByTestId('google-btn')).not.toBeInTheDocument();
  });
});
