import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FEATURE_STORAGE_KEYS } from '@core/constants/features';
import { withLanguage, withFeatureToggles, resetTestFeatureFlags } from '@uni-hub/utils/test-utils';
import { DevFeaturePanel } from './DevFeaturePanel';

const renderDevFeaturePanel = () => {
  return render(withLanguage(withFeatureToggles(<DevFeaturePanel />)));
};

describe('DevFeaturePanel', () => {
  beforeEach(() => {
    resetTestFeatureFlags();
    window.localStorage.clear();
  });

  afterEach(() => {
    resetTestFeatureFlags();
    window.localStorage.clear();
  });

  it('should render trigger button with accessible label and aria-expanded=false', () => {
    renderDevFeaturePanel();

    const trigger = screen.getByRole('button', {
      name: /відкрити панель перемикачів функцій/i,
    });

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('title', expect.stringContaining('Ctrl+Shift+F'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should open popover on trigger button click and display feature toggles', async () => {
    const user = userEvent.setup();

    renderDevFeaturePanel();

    const trigger = screen.getByRole('button', {
      name: /відкрити панель перемикачів функцій/i,
    });

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog');

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByText('Панель функцій')).toBeInTheDocument();
    expect(within(dialog).getByText('Dev')).toBeInTheDocument();

    const moodleSwitch = screen.getByRole('checkbox', { name: 'Moodle LMS' });
    const eDeanSwitch = screen.getByRole('checkbox', { name: 'e-Dean' });
    const opportunitiesSwitch = screen.getByRole('checkbox', { name: 'Можливості' });

    expect(moodleSwitch).toBeInTheDocument();
    expect(eDeanSwitch).toBeInTheDocument();
    expect(opportunitiesSwitch).toBeInTheDocument();

    expect(screen.getByText('Курси, оцінки, завдання, GPA')).toBeInTheDocument();
    expect(screen.getByText('Розклад занять, студентська картка')).toBeInTheDocument();
    expect(screen.getByText('Дошка проєктів та стажувань')).toBeInTheDocument();

    expect(moodleSwitch).not.toBeChecked();
    expect(eDeanSwitch).not.toBeChecked();
    expect(opportunitiesSwitch).toBeChecked();

    const resetBtn = screen.getByRole('button', { name: /скинути/i });

    expect(resetBtn).toBeInTheDocument();
    expect(resetBtn).toBeDisabled();
  });

  it('should toggle feature override when switch is clicked', async () => {
    const user = userEvent.setup();

    renderDevFeaturePanel();

    const trigger = screen.getByRole('button', {
      name: /відкрити панель перемикачів функцій/i,
    });

    await user.click(trigger);

    const moodleSwitch = screen.getByRole('checkbox', { name: 'Moodle LMS' });

    expect(moodleSwitch).not.toBeChecked();
    expect(screen.queryByText('Перевизначено')).not.toBeInTheDocument();

    await user.click(moodleSwitch);

    expect(moodleSwitch).toBeChecked();
    expect(screen.getByText('Перевизначено')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /скинути/i });

    expect(resetBtn).toBeEnabled();

    await user.click(moodleSwitch);

    expect(moodleSwitch).not.toBeChecked();
    expect(screen.getByText('Перевизначено')).toBeInTheDocument();
  });

  it('should toggle panel open/close on Ctrl+Shift+F keyboard shortcut', () => {
    renderDevFeaturePanel();

    const trigger = screen.getByRole('button', {
      name: /відкрити панель перемикачів функцій/i,
    });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(window, {
      key: 'F',
      ctrlKey: true,
      shiftKey: true,
    });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, {
      key: 'F',
      ctrlKey: true,
      shiftKey: true,
    });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should display override badge count when overrides exist', async () => {
    window.localStorage.setItem(
      FEATURE_STORAGE_KEYS.OVERRIDES,
      JSON.stringify({ isMoodleIntegrationEnabled: true, isEDeanEnabled: true }),
    );

    const user = userEvent.setup();

    renderDevFeaturePanel();

    const trigger = screen.getByRole('button', {
      name: /відкрити панель перемикачів функцій/i,
    });

    expect(within(trigger).getByText('2')).toBeInTheDocument();

    await user.click(trigger);

    const opportunitiesSwitch = screen.getByRole('checkbox', { name: 'Можливості' });

    await user.click(opportunitiesSwitch);

    expect(within(trigger).getByText('3')).toBeInTheDocument();
  });

  it('should reset feature overrides and disable reset button after reset', async () => {
    const user = userEvent.setup();

    renderDevFeaturePanel();

    const trigger = screen.getByRole('button', {
      name: /відкрити панель перемикачів функцій/i,
    });

    await user.click(trigger);

    const moodleSwitch = screen.getByRole('checkbox', { name: 'Moodle LMS' });

    await user.click(moodleSwitch);

    const resetBtn = screen.getByRole('button', { name: /скинути/i });

    expect(resetBtn).toBeEnabled();
    expect(within(trigger).getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Перевизначено')).toBeInTheDocument();

    await user.click(resetBtn);

    const successResetBtn = screen.getByRole('button', { name: /скинуто!/i });

    expect(successResetBtn).toBeDisabled();
    expect(screen.queryByText('Перевизначено')).not.toBeInTheDocument();
    expect(within(trigger).queryByText('1')).not.toBeInTheDocument();
    expect(moodleSwitch).not.toBeChecked();
    expect(window.localStorage.getItem(FEATURE_STORAGE_KEYS.OVERRIDES)).toBeNull();
  });

  it('should close popover when close button is clicked', async () => {
    const user = userEvent.setup();

    renderDevFeaturePanel();

    const trigger = screen.getByRole('button', {
      name: /відкрити панель перемикачів функцій/i,
    });

    await user.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /закрити панель перемикачів/i });

    await user.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
