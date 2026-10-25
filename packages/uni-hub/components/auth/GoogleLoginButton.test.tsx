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
});
