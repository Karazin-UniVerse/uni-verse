import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContactInfoGrid } from './ContactInfoGrid';
import type { ContactInfoItem } from './ContactInfoGrid.types';

describe('ContactInfoGrid Component', () => {
  it('should render contact info grid with accessible contact items', () => {
    const contactItems: ContactInfoItem[] = [
      {
        id: 'email',
        label: 'Email',
        value: 'dean.cs@karazin.ua',
        icon: <span data-testid="icon-email">✉</span>,
      },
      {
        id: 'phone',
        label: 'Phone',
        value: '+38 (057) 707-55-55',
        icon: <span data-testid="icon-phone">📞</span>,
      },
      {
        id: 'location',
        label: 'Location',
        value: 'Main Building, Room 201',
      },
    ];

    render(<ContactInfoGrid items={contactItems} />);

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('dean.cs@karazin.ua')).toBeInTheDocument();
    expect(screen.getByTestId('icon-email')).toBeInTheDocument();

    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('+38 (057) 707-55-55')).toBeInTheDocument();
    expect(screen.getByTestId('icon-phone')).toBeInTheDocument();

    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Main Building, Room 201')).toBeInTheDocument();
  });

  it('should render ReactNode link values', () => {
    const linkItems: ContactInfoItem[] = [
      {
        id: 'website',
        label: 'Website',
        value: (
          <a href="https://karazin.ua" target="_blank" rel="noopener noreferrer">
            karazin.ua
          </a>
        ),
      },
      {
        id: 'telegram',
        label: 'Telegram',
        value: (
          <a href="https://t.me/karazin_edean" target="_blank" rel="noopener noreferrer">
            @karazin_edean
          </a>
        ),
      },
    ];

    render(<ContactInfoGrid items={linkItems} />);

    const websiteLink = screen.getByRole('link', { name: 'karazin.ua' });

    expect(websiteLink).toBeInTheDocument();
    expect(websiteLink).toHaveAttribute('href', 'https://karazin.ua');
    expect(websiteLink).toHaveAttribute('target', '_blank');
    expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');

    const telegramLink = screen.getByRole('link', { name: '@karazin_edean' });

    expect(telegramLink).toBeInTheDocument();
    expect(telegramLink).toHaveAttribute('href', 'https://t.me/karazin_edean');
    expect(telegramLink).toHaveAttribute('target', '_blank');
    expect(telegramLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should handle empty items array or empty item values safely', () => {
    const { container, rerender } = render(<ContactInfoGrid items={[]} />);

    expect(container.firstChild).toBeInTheDocument();

    rerender(
      <ContactInfoGrid
        items={[
          { id: 'empty-email', label: 'Email', value: '' },
          { id: 'null-phone', label: 'Phone', value: null },
        ]}
      />,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ContactInfoGrid items={[]} className="custom-grid-class" />);

    expect(container.firstChild).toHaveClass('custom-grid-class');
  });
});
