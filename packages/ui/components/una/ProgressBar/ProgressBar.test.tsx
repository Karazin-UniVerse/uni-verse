import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('UNA ProgressBar Component', () => {
  it('should render progressbar element with role="progressbar" and accessibility labels', () => {
    render(<ProgressBar value={75} max={100} />);

    const progressbar = screen.getByRole('progressbar');

    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '75');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuetext', '75%');
  });

  it('should clamp values safely to [0, max]', () => {
    const { rerender } = render(<ProgressBar value={150} max={100} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    rerender(<ProgressBar value={-20} max={100} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('should support custom ariaLabel and custom className', () => {
    render(
      <ProgressBar value={50} ariaLabel="Успішність студента" className="academic-progress" />,
    );

    const progressbar = screen.getByRole('progressbar', { name: 'Успішність студента' });

    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveClass('academic-progress');
  });

  it('should render tone class on fill element', () => {
    const { container } = render(<ProgressBar value={60} tone="success" />);

    const fillElement = container.querySelector('[class*="success"]');

    expect(fillElement).toBeInTheDocument();
  });
});
