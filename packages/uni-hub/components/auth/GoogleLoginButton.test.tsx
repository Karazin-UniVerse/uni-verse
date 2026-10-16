import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect } from 'react';
import { GoogleLoginButton } from './GoogleLoginButton';

let mockTheme = 'light';
let autoScriptReady = true;
let triggerScriptReady: (() => void) | null = null;

const mockInitialize = vi.fn();
const mockRenderButton = vi.fn();

vi.mock('@uni-hub/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: vi.fn(),
  }),
}));

function MockScript({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    triggerScriptReady = onReady ?? null;

    if (autoScriptReady) {
      onReady?.();
    }
  }, [onReady]);

  return null;
}

vi.mock('next/script', () => ({
  default: MockScript,
}));

describe('GoogleLoginButton component', () => {
  const originalEnvClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'light';
    autoScriptReady = true;
    triggerScriptReady = null;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';

    window.google = {
      accounts: {
        id: {
          initialize: mockInitialize,
          renderButton: mockRenderButton,
        },
      },
    } as any;
  });

  afterEach(() => {
    if (originalEnvClientId !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnvClientId;
    } else {
      delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    }

    delete (window as any).google;
  });

  it('should render button with accessible google login label and icon', () => {
    render(<GoogleLoginButton onSuccess={vi.fn()} />);

    const button = screen.getByRole('button', { name: /продовжити з google/i });

    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should call onClick/login handler when clicked', async () => {
    const handleClick = vi.fn();
    const handleSuccess = vi.fn();
    const user = userEvent.setup();

    render(<GoogleLoginButton onClick={handleClick} onSuccess={handleSuccess} />);

    const button = screen.getByRole('button', { name: /продовжити з google/i });

    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled or show loading indicator when isLoading or disabled is true', () => {
    const { rerender } = render(<GoogleLoginButton disabled={true} onSuccess={vi.fn()} />);

    const disabledButton = screen.getByRole('button', { name: /продовжити з google/i });

    expect(disabledButton).toBeDisabled();

    rerender(<GoogleLoginButton isLoading={true} onSuccess={vi.fn()} />);

    const loadingButton = screen.getByRole('button', { name: /завантаження.../i });

    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Завантаження...')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <GoogleLoginButton className="custom-login-class" onSuccess={vi.fn()} />,
    );

    expect(container.firstElementChild).toHaveClass('custom-login-class');
  });

  it('should initialize and render google button when script is loaded and client id is configured', () => {
    render(<GoogleLoginButton onSuccess={vi.fn()} />);

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledWith({
      client_id: 'test-client-id',
      callback: expect.any(Function),
    });
    expect(mockRenderButton).toHaveBeenCalledTimes(1);
    expect(mockRenderButton).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 336,
        locale: 'uk',
      }),
    );
  });

  it('should render google button with dark theme style when theme is dark', () => {
    mockTheme = 'dark';

    render(<GoogleLoginButton onSuccess={vi.fn()} />);

    expect(mockRenderButton).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        theme: 'filled_black',
      }),
    );
  });

  it('should call onSuccess when google callback receives credential', () => {
    const handleSuccess = vi.fn();

    render(<GoogleLoginButton onSuccess={handleSuccess} />);

    const initCall = mockInitialize.mock.calls[0];
    const callback = initCall?.[0]?.callback;

    callback?.({ credential: 'valid-google-token' });

    expect(handleSuccess).toHaveBeenCalledTimes(1);
    expect(handleSuccess).toHaveBeenCalledWith('valid-google-token');
  });

  it('should call onError when google callback receives no credential', () => {
    const handleError = vi.fn();

    render(<GoogleLoginButton onError={handleError} onSuccess={vi.fn()} />);

    const initCall = mockInitialize.mock.calls[0];
    const callback = initCall?.[0]?.callback;

    callback?.({});

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith('Не вдалося отримати токен від Google');
  });

  it('should call onError when google initialization throws an error', () => {
    const handleError = vi.fn();

    mockInitialize.mockImplementationOnce(() => {
      throw new Error('Google init crash');
    });

    render(<GoogleLoginButton onError={handleError} onSuccess={vi.fn()} />);

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith('Google init crash');
  });

  it('should not initialize google accounts when client id is missing', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    render(<GoogleLoginButton onSuccess={vi.fn()} />);

    expect(mockInitialize).not.toHaveBeenCalled();
    expect(mockRenderButton).not.toHaveBeenCalled();
  });

  it('should initialize google button when script is ready via onReady callback', () => {
    delete (window as any).google;
    autoScriptReady = false;

    render(<GoogleLoginButton onSuccess={vi.fn()} />);

    expect(mockInitialize).not.toHaveBeenCalled();

    window.google = {
      accounts: {
        id: {
          initialize: mockInitialize,
          renderButton: mockRenderButton,
        },
      },
    } as any;

    act(() => {
      triggerScriptReady?.();
    });

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockRenderButton).toHaveBeenCalledTimes(1);
  });
});
