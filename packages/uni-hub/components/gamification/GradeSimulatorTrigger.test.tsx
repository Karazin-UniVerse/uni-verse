import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { GradeSimulatorTrigger } from './GradeSimulatorTrigger';

describe('GradeSimulatorTrigger component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
    window.dispatchEvent(new Event('language-change'));
  });

  afterEach(() => {
    localStorage.removeItem('universe-lang');
    window.dispatchEvent(new Event('language-change'));
  });

  it('should render simulator trigger button with localized text', () => {
    const handleOpen = vi.fn();

    render(
      <LanguageProvider>
        <GradeSimulatorTrigger onOpen={handleOpen} />
      </LanguageProvider>,
    );

    const button = screen.getByRole('button', { name: 'Симулятор балів (Що, якщо?)' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Симулятор балів (Що, якщо?)');
  });

  it('should render simulator trigger button with localized text in English when locale is en', () => {
    localStorage.setItem('universe-lang', 'en');
    window.dispatchEvent(new Event('language-change'));

    const handleOpen = vi.fn();

    render(
      <LanguageProvider>
        <GradeSimulatorTrigger onOpen={handleOpen} />
      </LanguageProvider>,
    );

    const button = screen.getByRole('button', { name: 'Grade Simulator (What if?)' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Grade Simulator (What if?)');
  });

  it('should render simulator trigger button with localized text outside LanguageProvider fallback', () => {
    const handleOpen = vi.fn();

    render(<GradeSimulatorTrigger onOpen={handleOpen} />);

    const button = screen.getByRole('button', { name: 'Симулятор балів (Що, якщо?)' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Симулятор балів (Що, якщо?)');
  });

  it('should call onOpen when button is clicked', async () => {
    const handleOpen = vi.fn();
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <GradeSimulatorTrigger onOpen={handleOpen} />
      </LanguageProvider>,
    );

    const button = screen.getByRole('button', { name: 'Симулятор балів (Що, якщо?)' });

    expect(handleOpen).not.toHaveBeenCalled();

    await user.click(button);

    expect(handleOpen).toHaveBeenCalledTimes(1);

    await user.click(button);

    expect(handleOpen).toHaveBeenCalledTimes(2);
  });

  it('should render with correct variant and button attributes', () => {
    const handleOpen = vi.fn();

    render(
      <LanguageProvider>
        <GradeSimulatorTrigger onOpen={handleOpen} />
      </LanguageProvider>,
    );

    const button = screen.getByRole('button', { name: 'Симулятор балів (Що, якщо?)' });

    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toBeDisabled();
    expect(button.className).toMatch(/btn/);
    expect(button.className).toMatch(/secondary/);
    expect(button.className).toMatch(/small/);
  });

  it('should open modal dialog using semantic dialog tag when trigger is clicked', async () => {
    const user = userEvent.setup();

    const InteractiveWrapper: React.FC = () => {
      const [isOpen, setIsOpen] = React.useState(false);

      return (
        <LanguageProvider>
          <GradeSimulatorTrigger onOpen={() => setIsOpen(true)} />
          {isOpen && (
            <dialog open aria-label="Grade Simulator Modal">
              <p>Simulator Content</p>
            </dialog>
          )}
        </LanguageProvider>
      );
    };

    render(<InteractiveWrapper />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Симулятор балів (Що, якщо?)' });

    await user.click(button);

    const dialog = screen.getByRole('dialog', { name: 'Grade Simulator Modal' });

    expect(dialog).toBeInTheDocument();
    expect(dialog.tagName.toLowerCase()).toBe('dialog');
  });
});
