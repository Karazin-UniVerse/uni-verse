import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { GoogleLoginButton } from './GoogleLoginButton';

vi.mock('next/script', () => ({
  default: () => null,
}));

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('GoogleLoginButton component', () => {
  it('renders button container without inert when not disabled', () => {
    const { container } = renderWithTheme(<GoogleLoginButton onSuccess={vi.fn()} />);

    const buttonContainer = container.querySelector('[class*="buttonContainer"]');

    expect(buttonContainer).toBeInTheDocument();
    expect(buttonContainer).not.toHaveAttribute('inert');
    expect(buttonContainer?.className).not.toContain('disabled');
  });

  it('sets inert attribute and disabled class when disabled is true', () => {
    const { container } = renderWithTheme(<GoogleLoginButton onSuccess={vi.fn()} disabled />);

    const buttonContainer = container.querySelector('[class*="buttonContainer"]');

    expect(buttonContainer).toBeInTheDocument();
    expect(buttonContainer).toHaveAttribute('inert');
    expect(buttonContainer?.className).toContain('disabled');
  });

  it('renders Google button with language locale', () => {
    const renderButton = vi.fn();
    const initialize = vi.fn();

    vi.stubGlobal('google', {
      accounts: {
        id: {
          initialize,
          renderButton,
        },
      },
    });

    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';

    renderWithTheme(<GoogleLoginButton onSuccess={vi.fn()} />);

    expect(renderButton).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        locale: 'uk',
        text: 'continue_with',
      }),
    );

    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  });
});
