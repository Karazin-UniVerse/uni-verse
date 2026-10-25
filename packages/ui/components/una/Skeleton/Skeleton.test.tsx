import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';
import styles from './Skeleton.module.scss';

describe('UNA Skeleton Component', () => {
  it('should render skeleton element with appropriate aria attributes', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstElementChild as HTMLElement;

    expect(skeleton).toBeInTheDocument();
    expect(skeleton.tagName.toLowerCase()).toBe('div');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveClass(styles.skeleton);
  });

  it('should apply width, height, or custom styles', () => {
    const { container, rerender } = render(<Skeleton width={160} height={24} borderRadius={8} />);
    const skeleton = container.firstElementChild as HTMLElement;

    expect(skeleton).toHaveStyle({
      width: '160px',
      height: '24px',
      borderRadius: '8px',
    });

    rerender(<Skeleton width="100%" height="48px" borderRadius="50%" />);
    expect(skeleton).toHaveStyle({
      width: '100%',
      height: '48px',
      borderRadius: '50%',
    });

    rerender(
      <Skeleton width={100} height={20} style={{ opacity: 0.5, backgroundColor: 'transparent' }} />,
    );
    expect(skeleton).toHaveStyle({
      width: '100px',
      height: '20px',
      opacity: '0.5',
      backgroundColor: 'transparent',
    });
  });

  it('should apply variant/shape classes', () => {
    const { container, rerender } = render(
      <Skeleton className="skeleton-circle" borderRadius="50%" />,
    );
    const skeleton = container.firstElementChild as HTMLElement;

    expect(skeleton).toHaveClass('skeleton-circle');
    expect(skeleton).toHaveClass(styles.skeleton);
    expect(skeleton).toHaveStyle({ borderRadius: '50%' });

    rerender(<Skeleton className="skeleton-avatar" width={40} height={40} />);
    expect(skeleton).toHaveClass('skeleton-avatar');
    expect(skeleton).toHaveClass(styles.skeleton);

    rerender(<Skeleton className="skeleton-text-line" width={240} height={16} />);
    expect(skeleton).toHaveClass('skeleton-text-line');
    expect(skeleton).toHaveClass(styles.skeleton);
  });

  it('should support custom className', () => {
    const { container } = render(
      <Skeleton className="custom-skeleton-loader user-avatar-placeholder" />,
    );
    const skeleton = container.firstElementChild as HTMLElement;

    expect(skeleton).toHaveClass(styles.skeleton);
    expect(skeleton).toHaveClass('custom-skeleton-loader');
    expect(skeleton).toHaveClass('user-avatar-placeholder');
  });
});
