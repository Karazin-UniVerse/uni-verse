import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeatureToggleProvider } from '@uni-hub/features';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import LoginPage from './LoginPage';

const mockPush = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
const mockStorage = vi.hoisted(() => ({}) as Record<string, string>);
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

vi.mock('@una', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@una');

  return {
    ...actual,
    useToast: () => mockToast,
    Modal: ({
      open,
      title,
      children,
    }: {
      open: boolean;
      title?: string;
      children?: React.ReactNode;
    }) =>
      open ? (
        <dialog open aria-label={title}>
          {title ? <h2>{title}</h2> : null}
          {children}
        </dialog>
      ) : null,
  };
});

vi.mock('@uni-hub/theme/ThemeSwitcher', () => ({
  ThemeSwitcher: () => null,
}));

vi.mock('@uni-hub/components/common/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));

vi.mock('@uni-hub/services/api.auth', () => ({
  authApi: mockAuthApi,
}));

vi.mock('@uni-hub/services/api', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@uni-hub/services/api');

  return {
    ...actual,
    safeStorage: {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
    },
    authApi: mockAuthApi,
  };
});

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
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <FeatureToggleProvider>
          <LoginPage />
        </FeatureToggleProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe('LoginPage Google SSO Moodle integration bypass and authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }

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
    const { authApi } = await import('@uni-hub/services/api');

    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: { isLinked: false, token: 'mock-token' },
    } as any);

    renderLoginPage();

    const googleBtn = screen.getByTestId('google-btn');

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockStorage.isLoggedIn).toBe('true');
    });

    expect(mockStorage.isMoodleLinked).toBe('false');
    expect(mockStorage.username).toBe('Test Student');
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockToast.success).toHaveBeenCalledWith('Вхід виконано успішно');
  });

  it('should not set isLoggedIn and not redirect to / when isMoodleIntegrationEnabled is true and account is unlinked', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
    const { authApi } = await import('@uni-hub/services/api');

    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: { isLinked: false, token: 'mock-token' },
    } as any);

    renderLoginPage();

    const googleBtn = screen.getByTestId('google-btn');

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockStorage.isMoodleLinked).toBe('false');
    });

    expect(mockStorage.isLoggedIn).toBeUndefined();
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /прив’язати moodle/i })).toBeInTheDocument();
  });

  it('should show error toast on Google login failure', async () => {
    const { authApi } = await import('@uni-hub/services/api');

    vi.mocked(authApi.loginWithGoogle).mockRejectedValueOnce(new Error('Помилка сервера Google'));

    renderLoginPage();

    const googleBtn = screen.getByTestId('google-btn');

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Помилка сервера Google');
    });

    expect(screen.getByText('Помилка сервера Google')).toBeInTheDocument();
    expect(mockStorage.isLoggedIn).toBeUndefined();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should set isLoggedIn = true and redirect to / when isMoodleIntegrationEnabled is true and account is already linked', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
    const { authApi } = await import('@uni-hub/services/api');

    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: { isLinked: true, token: 'mock-token' },
    } as any);

    renderLoginPage();

    const googleBtn = screen.getByTestId('google-btn');

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(mockStorage.isLoggedIn).toBe('true');
    });

    expect(mockStorage.isMoodleLinked).toBe('true');
    expect(mockStorage.username).toBe('Test Student');
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockToast.success).toHaveBeenCalledWith('Вхід виконано успішно');
  });

  it('should allow linking Moodle account when user enters credentials on link screen', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
    const { authApi } = await import('@uni-hub/services/api');

    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: { isLinked: false, token: 'mock-token' },
    } as any);
    vi.mocked(authApi.linkMoodleAccount).mockResolvedValueOnce({} as any);

    renderLoginPage();

    const googleBtn = screen.getByTestId('google-btn');

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Логін у Moodle')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Логін у Moodle'), {
      target: { value: 'moodleuser' },
    });
    fireEvent.change(screen.getByPlaceholderText('Пароль'), {
      target: { value: 'moodlepassword' },
    });

    const submitBtn = screen.getByRole('button', { name: /прив’язати moodle/i });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockStorage.isLoggedIn).toBe('true');
    });

    expect(mockStorage.isMoodleLinked).toBe('true');
    expect(mockStorage.username).toBe('moodleuser');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should allow skipping Moodle link and redirect to /', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
    const { authApi } = await import('@uni-hub/services/api');

    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: { isLinked: false, token: 'mock-token' },
    } as any);

    renderLoginPage();

    const googleBtn = screen.getByTestId('google-btn');

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /пропустити/i })).toBeInTheDocument();
    });

    const skipBtn = screen.getByRole('button', { name: /пропустити/i });

    fireEvent.click(skipBtn);

    expect(mockStorage.isLoggedIn).toBe('true');
    expect(mockStorage.isMoodleLinked).toBe('false');
    expect(mockStorage.username).toBe('Test Student');
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockToast.success).toHaveBeenCalledWith('Вхід виконано успішно');
  });

  it('should cancel Moodle linking and return to login form', async () => {
    process.env.NEXT_PUBLIC_FEATURE_MOODLE = 'true';
    const { authApi } = await import('@uni-hub/services/api');

    vi.mocked(authApi.loginWithGoogle).mockResolvedValueOnce({
      data: { isLinked: false, token: 'mock-token' },
    } as any);

    renderLoginPage();

    const googleBtn = screen.getByTestId('google-btn');

    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /повернутися до входу/i })).toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button', { name: /повернутися до входу/i });

    fireEvent.click(backBtn);

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
    const { authApi } = await import('@uni-hub/services/api');

    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: { token: 'moodle-session-token' },
    } as any);

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('Ім’я користувача або email'), {
      target: { value: 'moodle_student' },
    });
    fireEvent.change(screen.getByPlaceholderText('Пароль'), {
      target: { value: 'secretpass' },
    });

    const submitBtn = screen.getByRole('button', { name: /^увійти$/i });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockStorage.isLoggedIn).toBe('true');
    });

    expect(mockStorage.isMoodleLinked).toBe('true');
    expect(mockStorage.username).toBe('moodle_student');
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockToast.success).toHaveBeenCalledWith('Вхід виконано успішно');
  });

  it('should show error when username is empty during credentials login', async () => {
    renderLoginPage();

    const submitBtn = screen.getByRole('button', { name: /^увійти$/i });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Будь ласка, введіть ім'я користувача")).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show error when password is empty during credentials login', async () => {
    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('Ім’я користувача або email'), {
      target: { value: 'moodle_student' },
    });

    const submitBtn = screen.getByRole('button', { name: /^увійти$/i });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Будь ласка, введіть пароль')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show error toast when credentials login fails', async () => {
    const { authApi } = await import('@uni-hub/services/api');

    vi.mocked(authApi.login).mockRejectedValueOnce(new Error('Невірний логін або пароль'));

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('Ім’я користувача або email'), {
      target: { value: 'moodle_student' },
    });
    fireEvent.change(screen.getByPlaceholderText('Пароль'), {
      target: { value: 'wrongpass' },
    });

    const submitBtn = screen.getByRole('button', { name: /^увійти$/i });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Невірний логін або пароль');
    });

    expect(screen.getByText('Невірний логін або пароль')).toBeInTheDocument();
  });

  it('should toggle password visibility when show password button is clicked', () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText('Пароль');

    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByLabelText(/показати пароль/i);

    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideButton = screen.getByLabelText(/сховати пароль/i);

    fireEvent.click(hideButton);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should not render Google login button when NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    renderLoginPage();

    expect(screen.queryByTestId('google-btn')).not.toBeInTheDocument();
  });
});
