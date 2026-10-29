import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tag } from './Tag';
import styles from './Tag.module.scss';

describe('UNA Tag Component', () => {
  it('should render tag content inside span element', () => {
    render(<Tag>Active Status</Tag>);

    const tag = screen.getByText('Active Status');

    expect(tag).toBeInTheDocument();
    expect(tag.tagName.toLowerCase()).toBe('span');
  });

  it('should render with custom tones such as success, warning, neutral', () => {
    const { rerender } = render(<Tag tone="success">Passed</Tag>);

    expect(screen.getByText('Passed')).toBeInTheDocument();

    rerender(<Tag tone="neutral">Pending</Tag>);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should apply small size class by default and medium size when specified', () => {
    const { rerender } = render(<Tag>Small Tag</Tag>);

    expect(screen.getByText('Small Tag')).toHaveClass(styles.small);

    rerender(<Tag size="medium">Medium Tag</Tag>);
    expect(screen.getByText('Medium Tag')).toHaveClass(styles.medium);
  });

  it('should merge custom className with base tag styles', () => {
    render(<Tag className="custom-indicator-badge">Custom</Tag>);

    const tag = screen.getByText('Custom');

    expect(tag).toHaveClass('custom-indicator-badge');
  });
});
