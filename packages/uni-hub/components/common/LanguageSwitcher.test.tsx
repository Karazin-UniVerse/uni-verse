import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should render language switcher with accessible role and current language', () => {
    render(
      withLanguage(<LanguageSwitcher />),
    );

    const trigger = screen.getByRole('button', { name: 'Мова інтерфейсу: Українська' });

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('title', 'Мова інтерфейсу: Українська');
    expect(trigger).toHaveTextContent('Українська');
  });

  it('should switch language when language option is selected', async () => {
    const user = userEvent.setup();

    render(
      withLanguage(<LanguageSwitcher />),
    );

    const trigger = screen.getByRole('button', { name: 'Мова інтерфейсу: Українська' });

    await user.click(trigger);

    const englishOption = screen.getByRole('button', { name: 'English' });

    expect(englishOption).toBeInTheDocument();

    await user.click(englishOption);

    const updatedTrigger = screen.getByRole('button', { name: 'Interface Language: English' });

    expect(updatedTrigger).toBeInTheDocument();
    expect(updatedTrigger).toHaveTextContent('English');
    expect(screen.queryByRole('button', { name: 'English' })).not.toBeInTheDocument();
  });

  it('should reflect active language state', async () => {
    const user = userEvent.setup();

    render(
      withLanguage(<LanguageSwitcher />),
    );

    const trigger = screen.getByRole('button', { name: 'Мова інтерфейсу: Українська' });

    await user.click(trigger);

    const ukOption = screen.getByRole('button', { name: 'Українська' });
    const enOption = screen.getByRole('button', { name: 'English' });

    expect(ukOption).toHaveAttribute('aria-pressed', 'true');
    expect(enOption).toHaveAttribute('aria-pressed', 'false');

    await user.click(enOption);

    const updatedTrigger = screen.getByRole('button', { name: 'Interface Language: English' });

    await user.click(updatedTrigger);

    const reopenedUkOption = screen.getByRole('button', { name: 'Українська' });
    const reopenedEnOption = screen.getByRole('button', { name: 'English' });

    expect(reopenedUkOption).toHaveAttribute('aria-pressed', 'false');
    expect(reopenedEnOption).toHaveAttribute('aria-pressed', 'true');
  });

  it('should support custom className', () => {
    const { container } = render(
      withLanguage(<LanguageSwitcher className="custom-language-switcher" />),
    );

    const customElement = container.querySelector('.custom-language-switcher');

    expect(customElement).toBeInTheDocument();
  });

  it('should not render text label when showLabel is false', () => {
    render(
      withLanguage(<LanguageSwitcher showLabel={false} />),
    );

    const trigger = screen.getByRole('button', { name: 'Мова інтерфейсу: Українська' });

    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toHaveTextContent('Українська');
  });
});
