import React from 'react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import type { Window } from 'happy-dom';
import userEvent from '@testing-library/user-event';
import { FeatureToggleProvider } from '@uni-hub/features/FeatureToggleContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { NAV_KEY } from '@uni-hub/views/dashboard/constants';
import { MobileBottomNav } from './MobileBottomNav';

// Happy DOM rejects canceled WAAPI animations; exercise Framer's JS animation path.
const animateDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');

beforeAll(() => {
  Reflect.deleteProperty(Element.prototype, 'animate');
});

beforeEach(() => {
  (window as unknown as Window).happyDOM.setWindowSize({ width: 390, height: 844 });
});

afterAll(() => {
  if (animateDescriptor) {
    Object.defineProperty(Element.prototype, 'animate', animateDescriptor);
  }
});

const renderNav = () =>
  render(
    <FeatureToggleProvider>
      <ThemeProvider>
        <MobileBottomNav
          activeKey={NAV_KEY.Overview}
          onSelectKey={vi.fn()}
          soundEnabled={false}
          onToggleSound={vi.fn()}
        />
      </ThemeProvider>
    </FeatureToggleProvider>,
    { reactStrictMode: true },
  );

describe('MobileBottomNav More dialog', () => {
  it('removes the modal when resizing to the desktop breakpoint', async () => {
    const user = userEvent.setup();

    renderNav();
    await user.click(screen.getByRole('button', { name: 'Ще' }));

    const dialog = screen.getByRole('dialog');

    act(() => {
      (window as unknown as Window).happyDOM.setWindowSize({ width: 768, height: 900 });
    });
    expect(dialog).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('links the expanded trigger to the native modal sheet', async () => {
    const user = userEvent.setup();

    renderNav();
    const trigger = screen.getByRole('button', { name: 'Ще' });

    expect(trigger).not.toHaveAttribute('aria-controls');
    await user.click(trigger);

    const dialog = screen.getByRole('dialog');

    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAttribute('id', 'mobile-more-sheet');
    expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps the modal open during its exit and restores trigger focus after closing', async () => {
    const user = userEvent.setup();

    renderNav();
    const trigger = screen.getByRole('button', { name: 'Ще' });

    await user.click(trigger);
    const dialog = screen.getByRole('dialog');
    const closeButton = screen.getByRole('button', { name: 'Закрити меню' });

    closeButton.focus();
    await user.click(closeButton);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(dialog).toHaveAttribute('open');
    expect(document.body.style.overflow).toBe('hidden');
    await waitForElementToBeRemoved(dialog);
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('defers native Escape dismissal until after the exit animation', async () => {
    const user = userEvent.setup();
    const { unmount } = renderNav();
    const trigger = screen.getByRole('button', { name: 'Ще' });

    await user.click(trigger);
    const dialog = screen.getByRole('dialog');

    expect(fireEvent(dialog, new Event('cancel', { cancelable: true }))).toBe(false);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(dialog).toHaveAttribute('open');
    await waitForElementToBeRemoved(dialog);
    expect(trigger).toHaveFocus();

    document.body.style.overflow = 'auto';
    await user.click(trigger);
    unmount();
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
});
