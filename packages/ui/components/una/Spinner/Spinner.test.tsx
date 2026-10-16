import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';
import styles from './Spinner.module.scss';
import type { SpinnerProps } from './Spinner.types';

describe('UNA Spinner Component', () => {
  it('should render spinner with accessible status role and aria-label', () => {
    const { rerender } = render(<Spinner />);

    const defaultSpinner = screen.getByRole('status', { name: 'Завантаження...' });

    expect(defaultSpinner).toBeInTheDocument();
    expect(defaultSpinner).toHaveAttribute('aria-live', 'polite');
    expect(defaultSpinner).toHaveAttribute('aria-label', 'Завантаження...');
    expect(defaultSpinner).toHaveTextContent('Завантаження...');
    expect(defaultSpinner.querySelector('p')).not.toBeInTheDocument();

    rerender(<Spinner ariaLabel="Custom loading text" />);

    const updatedSpinner = screen.getByRole('status', { name: 'Custom loading text' });

    expect(updatedSpinner).toBeInTheDocument();
    expect(updatedSpinner).toHaveAttribute('aria-label', 'Custom loading text');
    expect(updatedSpinner).toHaveTextContent('Custom loading text');
  });

  it('should prioritize tip as accessible label and render tip text', () => {
    render(<Spinner tip="Saving changes..." ariaLabel="Ignored fallback" />);

    const spinner = screen.getByRole('status', { name: 'Saving changes...' });

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Saving changes...');

    const tipParagraph = screen.getByText('Saving changes...', { selector: 'p' });

    expect(tipParagraph).toBeInTheDocument();
    expect(tipParagraph).toHaveClass(styles.tip);
  });

  it('should apply size variant styles', () => {
    const { rerender } = render(<Spinner />);

    const defaultStatus = screen.getByRole('status');
    const defaultIndicator = defaultStatus.querySelector(`.${styles.spinner}`);

    expect(defaultIndicator).toBeInTheDocument();
    expect(defaultIndicator).toHaveClass(styles.spinner);
    expect(defaultIndicator).toHaveClass(styles.medium);

    const sizes: Array<NonNullable<SpinnerProps['size']>> = ['small', 'medium', 'large'];

    for (const size of sizes) {
      rerender(<Spinner size={size} />);

      const statusEl = screen.getByRole('status');
      const indicator = statusEl.querySelector(`.${styles.spinner}`);

      expect(indicator).toHaveClass(styles[size]);
    }
  });

  it('should apply color or custom className', () => {
    render(<Spinner className="custom-color-class custom-theme" />);

    const spinner = screen.getByRole('status');

    expect(spinner).toHaveClass(styles.wrap);
    expect(spinner).toHaveClass('custom-color-class');
    expect(spinner).toHaveClass('custom-theme');
  });
});
