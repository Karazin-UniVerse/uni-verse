import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { DeanContactInfo } from './DeanContactInfo';

describe('DeanContactInfo component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  afterEach(() => {
    localStorage.removeItem('universe-lang');
  });

  it('should render dean contact info with accessible contact channels (phone, email, hours)', () => {
    render(<DeanContactInfo />);

    expect(screen.getByText('dean.cs@karazin.ua')).toBeInTheDocument();
    expect(screen.getByText('+38 (057) 707-55-55')).toBeInTheDocument();
    expect(screen.getByText('Пн–Пт, 09:00 – 17:00')).toBeInTheDocument();
    expect(screen.getByText('@karazin_edean')).toBeInTheDocument();

    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('Тел:')).toBeInTheDocument();
    expect(screen.getByText('Графік:')).toBeInTheDocument();
    expect(screen.getByText('Telegram:')).toBeInTheDocument();
  });

  it('should render external mailto and tel links with safe attributes', () => {
    render(<DeanContactInfo />);

    const emailLink = screen.getByRole('link', { name: 'dean.cs@karazin.ua' });
    const phoneLink = screen.getByRole('link', { name: '+38 (057) 707-55-55' });
    const telegramLink = screen.getByRole('link', { name: '@karazin_edean' });

    expect(emailLink).toHaveAttribute('href', 'mailto:dean.cs@karazin.ua');
    expect(phoneLink).toHaveAttribute('href', 'tel:+380577075555');

    expect(telegramLink).toHaveAttribute('href', 'https://t.me/karazin_edean');
    expect(telegramLink).toHaveAttribute('target', '_blank');
    expect(telegramLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render localized labels appropriately', () => {
    const { unmount } = render(
      <LanguageProvider>
        <DeanContactInfo />
      </LanguageProvider>,
    );

    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('Тел:')).toBeInTheDocument();
    expect(screen.getByText('Графік:')).toBeInTheDocument();
    expect(screen.getByText('Пн–Пт, 09:00 – 17:00')).toBeInTheDocument();
    expect(screen.getByText('Telegram:')).toBeInTheDocument();

    unmount();

    localStorage.setItem('universe-lang', 'en');

    render(
      <LanguageProvider>
        <DeanContactInfo />
      </LanguageProvider>,
    );

    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('Phone:')).toBeInTheDocument();
    expect(screen.getByText('Hours:')).toBeInTheDocument();
    expect(screen.getByText('Mon–Fri, 09:00 – 17:00')).toBeInTheDocument();
    expect(screen.getByText('Telegram:')).toBeInTheDocument();
  });

  it('should apply custom className if supported', () => {
    const { container } = render(<DeanContactInfo className="custom-dean-contact-info" />);

    expect(container.firstChild).toHaveClass('custom-dean-contact-info');
  });

  it('should render custom contact channels when props are provided', () => {
    const customProps = {
      email: 'custom.dean@karazin.ua',
      phone: '+38 (057) 123-45-67',
      schedule: 'Пн–Чт, 10:00 – 16:00',
      telegram: '@custom_dean',
    };

    render(<DeanContactInfo {...customProps} />);

    const emailLink = screen.getByRole('link', { name: 'custom.dean@karazin.ua' });
    const phoneLink = screen.getByRole('link', { name: '+38 (057) 123-45-67' });
    const telegramLink = screen.getByRole('link', { name: '@custom_dean' });

    expect(emailLink).toHaveAttribute('href', 'mailto:custom.dean@karazin.ua');
    expect(phoneLink).toHaveAttribute('href', 'tel:+380571234567');
    expect(telegramLink).toHaveAttribute('href', 'https://t.me/custom_dean');
    expect(screen.getByText('Пн–Чт, 10:00 – 16:00')).toBeInTheDocument();
  });
});
