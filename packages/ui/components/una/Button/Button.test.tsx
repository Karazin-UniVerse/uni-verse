import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import type { BaseProps } from './Button.types';
import css from './Button.module.scss';

type ToneCase = {
  tone: NonNullable<BaseProps['tone']>;
  variant: NonNullable<BaseProps['variant']>;
};

describe('UNA Button Component', () => {
  it('should render standard button element with default type="button"', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should render an anchor element when isLink is true', () => {
    render(
      <Button isLink href="/dashboard">
        Dashboard Link
      </Button>,
    );

    const link = screen.getByRole('link', { name: /dashboard link/i });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should apply custom className and variant styles', () => {
    render(
      <Button variant="secondary" size="large" className="custom-test-class">
        Action
      </Button>,
    );

    const button = screen.getByRole('button', { name: /action/i });

    expect(button).toHaveClass('custom-test-class');
  });

  it('should pass through native button attributes like disabled', () => {
    render(<Button disabled>Disabled Action</Button>);

    const button = screen.getByRole('button', { name: /disabled action/i });

    expect(button).toBeDisabled();
  });

  it('should trigger onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it.each<ToneCase>([
    { tone: 'success', variant: 'primary' },
    { tone: 'warning', variant: 'primary' },
    { tone: 'danger', variant: 'primary' },
    { tone: 'success', variant: 'secondary' },
    { tone: 'warning', variant: 'secondary' },
    { tone: 'danger', variant: 'secondary' },
  ])('should apply the $tone tone on top of the $variant variant', ({ tone, variant }) => {
    render(
      <Button variant={variant} tone={tone}>
        Decide
      </Button>,
    );

    const button = screen.getByRole('button', { name: /decide/i });

    expect(button).toHaveClass(css[variant], css.toned, css[tone]);
  });

  it('should not apply tone styles for the default tone', () => {
    render(<Button tone="default">Neutral</Button>);

    const button = screen.getByRole('button', { name: /neutral/i });

    expect(button).not.toHaveClass(css.toned);
  });

  it('should keep a toned button disabled and ignore clicks', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button tone="danger" disabled onClick={handleClick}>
        Reject
      </Button>,
    );

    const button = screen.getByRole('button', { name: /reject/i });

    await user.click(button);

    expect(button).toBeDisabled();
    expect(handleClick).not.toHaveBeenCalled();
  });
});
