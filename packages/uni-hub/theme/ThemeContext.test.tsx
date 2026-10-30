import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

const STORAGE_KEY = 'universe-theme';

const ThemeConsumer = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button type="button" onClick={() => setTheme('cyberpunk')}>
        Set Cyberpunk
      </button>
      <button type="button" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button type="button" onClick={() => setTheme('karazinClassic')}>
        Set Karazin Classic
      </button>
    </div>
  );
};

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Light system theme, so the default is karazinClassic
    mockMatchMedia(false);
  });

  afterEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.colorScheme;
    vi.restoreAllMocks();
  });

  it('should throw error when useTheme is called outside ThemeProvider', () => {
    const Consumer = () => {
      useTheme();

      return null;
    };

    expect(() => render(<Consumer />)).toThrow('useTheme must be used within ThemeProvider');
  });

  it("should provide default theme 'karazinClassic' and apply default dataset attributes", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('karazinClassic');
    expect(document.documentElement.dataset.colorScheme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('karazinClassic');
  });

  it('should use karazinGold when system prefers dark and nothing is stored', () => {
    mockMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('karazinGold');
  });

  it('should not crash and use karazinClassic when matchMedia is unavailable', () => {
    // @ts-expect-error simulating an environment without matchMedia
    window.matchMedia = undefined;

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('karazinClassic');
  });

  it('should load initial theme from localStorage if valid theme stored', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.colorScheme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it("should fallback to 'karazinClassic' if stored theme is invalid", () => {
    window.localStorage.setItem(STORAGE_KEY, 'nonexistent-theme');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('karazinClassic');
    expect(document.documentElement.dataset.colorScheme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('karazinClassic');
  });

  it('should change theme via setTheme, updating state, localStorage, and document.documentElement dataset', async () => {
    const user = userEvent.setup();
    const themeChangeListener = vi.fn();

    window.addEventListener('theme-change', themeChangeListener);

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Set Cyberpunk' }));

    expect(screen.getByTestId('theme-value')).toHaveTextContent('cyberpunk');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('cyberpunk');
    expect(document.documentElement.dataset.theme).toBe('cyberpunk');
    expect(document.documentElement.dataset.colorScheme).toBe('dark');
    expect(themeChangeListener).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Set Light' }));

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.documentElement.dataset.colorScheme).toBe('light');
    expect(themeChangeListener).toHaveBeenCalledTimes(2);

    window.removeEventListener('theme-change', themeChangeListener);
  });

  it("should synchronize theme across windows/tabs on 'storage' and 'theme-change' events", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-value')).toHaveTextContent('karazinClassic');

    act(() => {
      window.localStorage.setItem(STORAGE_KEY, 'universeSpace');
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: 'universeSpace',
        }),
      );
    });

    expect(screen.getByTestId('theme-value')).toHaveTextContent('universeSpace');
    expect(document.documentElement.dataset.theme).toBe('universeSpace');
    expect(document.documentElement.dataset.colorScheme).toBe('dark');

    act(() => {
      window.localStorage.setItem(STORAGE_KEY, 'karazinClassic');
      window.dispatchEvent(new Event('theme-change'));
    });

    expect(screen.getByTestId('theme-value')).toHaveTextContent('karazinClassic');
    expect(document.documentElement.dataset.theme).toBe('karazinClassic');
    expect(document.documentElement.dataset.colorScheme).toBe('light');

    act(() => {
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event('theme-change'));
    });

    expect(screen.getByTestId('theme-value')).toHaveTextContent('karazinClassic');
    expect(document.documentElement.dataset.theme).toBe('karazinClassic');
    expect(document.documentElement.dataset.colorScheme).toBe('light');
  });

  it('should unsubscribe from storage and theme-change events on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('theme-change', expect.any(Function));
  });
});
