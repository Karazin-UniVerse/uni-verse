import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

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
});
