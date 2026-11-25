import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { withTheme, withLanguage } from '@uni-hub/utils/test-utils';
import { ThemeSwitcher } from './ThemeSwitcher';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(withTheme(withLanguage(ui)));
};

describe('ThemeSwitcher component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-theme', 'light');
    localStorage.setItem('universe-lang', 'uk');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.dataset.colorScheme = 'light';
  });

  it('should render theme switcher button with current theme icon and label in full mode', () => {
    renderWithProviders(<ThemeSwitcher />);

    const fieldset = screen.getByRole('group', { name: 'Вибір теми' });

    expect(fieldset).toBeInTheDocument();

    const lightOption = screen.getByRole('button', { name: 'Світла' });
    const darkOption = screen.getByRole('button', { name: 'Темна' });

    expect(lightOption).toBeInTheDocument();
    expect(lightOption).toHaveAttribute('aria-pressed', 'true');
    expect(lightOption.querySelector('svg')).toBeInTheDocument();
    expect(lightOption).toHaveTextContent('Світла');

    expect(darkOption).toBeInTheDocument();
    expect(darkOption).toHaveAttribute('aria-pressed', 'false');
    expect(darkOption.querySelector('svg')).toBeInTheDocument();
    expect(darkOption).toHaveTextContent('Темна');
  });

  it('should update active theme when a theme option is clicked in full mode', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ThemeSwitcher />);

    const lightOption = screen.getByRole('button', { name: 'Світла' });
    const darkOption = screen.getByRole('button', { name: 'Темна' });

    expect(lightOption).toHaveAttribute('aria-pressed', 'true');
    expect(darkOption).toHaveAttribute('aria-pressed', 'false');

    await user.click(darkOption);

    expect(darkOption).toHaveAttribute('aria-pressed', 'true');
    expect(lightOption).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('universe-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('should render compact button with icon and accessible title in compact mode', () => {
    renderWithProviders(<ThemeSwitcher compact />);

    const trigger = screen.getByRole('button', { name: 'Вибір теми: Світла' });

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('title', 'Світла');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Світла');
    expect(trigger.querySelector('svg')).toBeInTheDocument();
  });

  it('should not render text label in compact mode when showLabel is false', () => {
    renderWithProviders(<ThemeSwitcher compact showLabel={false} />);

    const trigger = screen.getByRole('button', { name: 'Вибір теми: Світла' });

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('title', 'Світла');
    expect(trigger).not.toHaveTextContent('Світла');
    expect(trigger.querySelector('svg')).toBeInTheDocument();
  });

  it('should open dropdown options when trigger button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ThemeSwitcher compact />);

    const trigger = screen.getByRole('button', { name: 'Вибір теми: Світла' });

    expect(screen.queryByRole('button', { name: 'Темна' })).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const darkOption = screen.getByRole('button', { name: 'Темна' });
    const cyberpunkOption = screen.getByRole('button', { name: 'Cyberpunk' });
    const jinxOption = screen.getByRole('button', { name: 'Jinx' });

    expect(darkOption).toBeInTheDocument();
    expect(darkOption).toHaveAttribute('aria-pressed', 'false');
    expect(cyberpunkOption).toBeInTheDocument();
    expect(jinxOption).toBeInTheDocument();
    expect(jinxOption).toHaveAttribute('aria-pressed', 'false');
  });

  it('should call setTheme and update active theme when a theme option is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ThemeSwitcher compact />);

    const trigger = screen.getByRole('button', { name: 'Вибір теми: Світла' });

    await user.click(trigger);

    const darkOption = screen.getByRole('button', { name: 'Темна' });

    await user.click(darkOption);

    const updatedTrigger = screen.getByRole('button', { name: 'Вибір теми: Темна' });

    expect(updatedTrigger).toBeInTheDocument();
    expect(updatedTrigger).toHaveAttribute('title', 'Темна');
    expect(updatedTrigger).toHaveTextContent('Темна');
    expect(screen.queryByRole('button', { name: 'Cyberpunk' })).not.toBeInTheDocument();
    expect(localStorage.getItem('universe-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('should select the Jinx theme and update dataset attributes', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ThemeSwitcher compact />);

    await user.click(screen.getByRole('button', { name: 'Вибір теми: Світла' }));
    await user.click(screen.getByRole('button', { name: 'Jinx' }));

    const updatedTrigger = screen.getByRole('button', { name: 'Вибір теми: Jinx' });

    expect(updatedTrigger).toBeInTheDocument();
    expect(updatedTrigger).toHaveAttribute('title', 'Jinx');
    expect(localStorage.getItem('universe-theme')).toBe('jinx');
    expect(document.documentElement.dataset.theme).toBe('jinx');
    expect(document.documentElement.dataset.colorScheme).toBe('dark');
  });

  it('should show inspiration tooltip on hover for Jinx in dropdown', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ThemeSwitcher compact />);

    await user.click(screen.getByRole('button', { name: 'Вибір теми: Світла' }));

    const jinxOption = screen.getByRole('button', { name: 'Jinx' });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.hover(jinxOption);

    expect(screen.getByRole('tooltip')).toHaveTextContent('Натхненно League of Legends');

    await user.unhover(jinxOption);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container: fullContainer } = renderWithProviders(
      <ThemeSwitcher className="custom-full-switcher" />,
    );

    const customFieldset = fullContainer.querySelector('.custom-full-switcher');

    expect(customFieldset).toBeInTheDocument();

    const { container: compactContainer } = renderWithProviders(
      <ThemeSwitcher compact className="custom-compact-switcher" />,
    );

    const customButton = compactContainer.querySelector('.custom-compact-switcher');

    expect(customButton).toBeInTheDocument();
  });
});
