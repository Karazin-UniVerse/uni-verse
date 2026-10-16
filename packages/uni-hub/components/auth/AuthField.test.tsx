import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthField } from './AuthField';

describe('AuthField component', () => {
  it('should render auth field with accessible label and input', () => {
    render(
      <AuthField
        id="username-field"
        name="username"
        label="Username or Email"
        placeholder="Enter your username"
        value="john_doe"
        onChange={vi.fn()}
        icon={<span data-testid="user-icon">👤</span>}
      />,
    );

    const input = screen.getByRole('textbox', { name: /Username or Email/i });
    const label = screen.getByText('Username or Email');
    const icon = screen.getByTestId('user-icon');

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'username-field');
    expect(input).toHaveAttribute('name', 'username');
    expect(input).toHaveAttribute('placeholder', 'Enter your username');
    expect(input).toHaveValue('john_doe');
    expect(label).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
  });

  it('should trigger onChange when user types', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <AuthField
        id="email-field"
        name="email"
        label="Email"
        placeholder="Enter your email"
        value=""
        onChange={handleChange}
        icon={<span>✉️</span>}
      />,
    );

    const input = screen.getByRole('textbox', { name: /Email/i });

    await user.type(input, 'student@karazin.ua');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should toggle password visibility if type is password and toggle is supported', async () => {
    const user = userEvent.setup();

    const PasswordField = () => {
      const [showPassword, setShowPassword] = useState(false);

      return (
        <AuthField
          id="password-field"
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="Password"
          placeholder="Enter password"
          value="secret123"
          onChange={vi.fn()}
          icon={<span>🔒</span>}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          }
        />
      );
    };

    const { container } = render(<PasswordField />);

    const input = container.querySelector('input');
    const toggleButton = screen.getByRole('button', { name: 'Show password' });

    expect(input).toHaveAttribute('type', 'password');
    expect(toggleButton).toBeInTheDocument();

    await user.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide password' }));

    expect(input).toHaveAttribute('type', 'password');
  });

  it('should be disabled when disabled prop is true', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <AuthField
        id="disabled-field"
        name="disabledInput"
        label="Disabled Input"
        placeholder="Cannot edit"
        value="locked"
        disabled={true}
        onChange={handleChange}
        icon={<span>🔒</span>}
      />,
    );

    const input = screen.getByRole('textbox', { name: /Disabled Input/i });

    expect(input).toBeDisabled();

    await user.type(input, 'typing attempt');

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should pass autoComplete attribute to input', () => {
    const { container } = render(
      <AuthField
        id="autocomplete-field"
        name="currentPassword"
        type="password"
        label="Current Password"
        placeholder="Password"
        value=""
        autoComplete="current-password"
        onChange={vi.fn()}
        icon={<span>🔑</span>}
      />,
    );

    const input = container.querySelector('input');

    expect(input).toHaveAttribute('autocomplete', 'current-password');
  });

  it('should apply custom className when provided', () => {
    const { container } = render(
      <AuthField
        id="custom-class-field"
        name="customClass"
        label="Custom Field"
        placeholder="Custom"
        value=""
        className="test-custom-class"
        onChange={vi.fn()}
        icon={<span>⚙️</span>}
      />,
    );

    const fieldLabel = container.querySelector('label');

    expect(fieldLabel).toHaveClass('test-custom-class');
  });

  it('should render custom rightElement content', () => {
    render(
      <AuthField
        id="custom-right-field"
        name="customRight"
        label="Field with Right Element"
        placeholder="Placeholder"
        value=""
        onChange={vi.fn()}
        icon={<span>🏷️</span>}
        rightElement={<span data-testid="custom-addon">Verified</span>}
      />,
    );

    const addon = screen.getByTestId('custom-addon');

    expect(addon).toBeInTheDocument();
    expect(addon).toHaveTextContent('Verified');
  });
});
