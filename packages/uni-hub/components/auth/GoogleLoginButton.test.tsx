import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { LanguageProvider, useLanguage } from '@uni-hub/i18n/LanguageContext';
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

  it('renders Google button with language locale and updates on language change', () => {
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

    function TestConsumer() {
      const { setLanguage } = useLanguage();

      return (
        <>
          <button type="button" onClick={() => setLanguage('en')}>
            Switch
          </button>
          <GoogleLoginButton onSuccess={vi.fn()} />
        </>
      );
    }

    render(
      <LanguageProvider>
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      </LanguageProvider>,
    );

    expect(renderButton).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        locale: 'uk',
        text: 'continue_with',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));

    expect(renderButton).toHaveBeenLastCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        locale: 'en',
        text: 'continue_with',
      }),
    );

    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  });
});
