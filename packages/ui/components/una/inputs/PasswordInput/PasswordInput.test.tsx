import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from './PasswordInput';

describe('UNA PasswordInput Component', () => {
  it('should render input with type="password" and default toggle button', () => {
    render(<PasswordInput placeholder="Enter password" />);

    const input = screen.getByPlaceholderText('Enter password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toBeInTheDocument();
  });

  it('should toggle password visibility when toggle button is clicked', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();

    render(<PasswordInput placeholder="Enter password" onTogglePassword={handleToggle} />);

    const input = screen.getByPlaceholderText('Enter password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    await user.click(toggle);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
    expect(handleToggle).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'Hide password' }));

    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
    expect(handleToggle).toHaveBeenCalledWith(false);
  });

  it('should use custom showPasswordLabel and hidePasswordLabel', async () => {
    const user = userEvent.setup();

    render(
      <PasswordInput
        placeholder="Enter password"
        showPasswordLabel="Показати пароль"
        hidePasswordLabel="Приховати пароль"
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Показати пароль' });

    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('title', 'Показати пароль');

    await user.click(toggle);

    const hideToggle = screen.getByRole('button', { name: 'Приховати пароль' });

    expect(hideToggle).toBeInTheDocument();
    expect(hideToggle).toHaveAttribute('title', 'Приховати пароль');
  });

  it('should respect controlled showPassword prop', () => {
    const { rerender } = render(<PasswordInput placeholder="Enter password" showPassword={true} />);

    const input = screen.getByPlaceholderText('Enter password');

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();

    rerender(<PasswordInput placeholder="Enter password" showPassword={false} />);

    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('should disable both input and toggle button when disabled', () => {
    render(<PasswordInput placeholder="Enter password" disabled />);

    expect(screen.getByPlaceholderText('Enter password')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled();
  });

  it('should render leftIcon when provided', () => {
    render(
      <PasswordInput
        placeholder="Enter password"
        leftIcon={<span data-testid="left-icon">🔒</span>}
      />,
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('should support forwarding ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();

    render(<PasswordInput ref={ref} placeholder="Enter password" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.placeholder).toBe('Enter password');
  });
});
