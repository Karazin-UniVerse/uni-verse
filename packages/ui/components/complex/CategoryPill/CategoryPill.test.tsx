import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Briefcase } from 'lucide-react';
import { CategoryPill } from './CategoryPill';

describe('CategoryPill', () => {
  it('renders the provided label', () => {
    render(<CategoryPill label="Вакансія" tone="success" />);

    expect(screen.getByText('Вакансія')).toBeInTheDocument();
  });

  it('renders an optional icon marked as decorative', () => {
    const { container } = render(
      <CategoryPill label="Практика" tone="info" icon={<Briefcase size={12} />} />,
    );

    const iconWrapper = container.querySelector('[aria-hidden="true"]');

    expect(iconWrapper).toBeInTheDocument();
    expect(screen.getByText('Практика')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<CategoryPill label="Досвід" className="custom-pill" />);

    expect(container.firstChild).toHaveClass('custom-pill');
  });

  it('keeps the full label in the DOM when truncate is enabled', () => {
    const longLabel = 'Оплачувана (15 000 грн за кожен етап завершеної роботи)';

    render(<CategoryPill label={longLabel} truncate />);

    expect(screen.getByText(longLabel)).toBeInTheDocument();
  });

  it('does not change the label markup when truncate is off', () => {
    const { container } = render(<CategoryPill label="Досвід" />);

    expect(container.querySelectorAll('span > span')).toHaveLength(1);
  });
});
