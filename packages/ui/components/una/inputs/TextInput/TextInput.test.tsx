import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TextInput } from './TextInput';

describe('UNA TextInput Component', () => {
  it('should render text input with accessible role and label', () => {
    render(<TextInput aria-label="Username" />);

    const input = screen.getByRole('textbox', { name: /username/i });

    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('should render text input associated with an external label element', () => {
    render(
      <div>
        <label htmlFor="user-email">Email Address</label>
        <TextInput id="user-email" />
      </div>,
    );

    const input = screen.getByRole('textbox', { name: /email address/i });

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'user-email');
  });

  it('should accept user typing and trigger onChange', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<TextInput onChange={handleChange} aria-label="User Input" />);

    const input = screen.getByRole('textbox', { name: /user input/i });

    await user.type(input, 'Hello Universe');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('Hello Universe');
  });

  it('should display placeholder text', () => {
    render(<TextInput placeholder="Enter your full name" />);

    const input = screen.getByPlaceholderText('Enter your full name');

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Enter your full name');
  });

  it('should display error message and set aria-invalid when in error state', () => {
    render(
      <div>
        <TextInput aria-invalid="true" aria-errormessage="error-msg" aria-label="Password" />
        <span id="error-msg" role="alert">
          Password is too short
        </span>
      </div>,
    );

    const input = screen.getByRole('textbox', { name: /password/i });
    const errorMessage = screen.getByRole('alert');

    expect(input).toBeInvalid();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent('Password is too short');
  });

  it('should be disabled when disabled prop is true', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<TextInput disabled onChange={handleChange} aria-label="Disabled field" />);

    const input = screen.getByRole('textbox', { name: /disabled field/i });

    expect(input).toBeDisabled();
    await user.type(input, 'Cannot type');
    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('should render start/end icons or adornments if supported', () => {
    render(
      <div data-testid="input-group">
        <span data-testid="start-icon" aria-hidden="true">
          🔍
        </span>
        <TextInput aria-label="Search items" />
        <span data-testid="end-icon" aria-hidden="true">
          ✕
        </span>
      </div>,
    );

    expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search items/i })).toBeInTheDocument();
    expect(screen.getByTestId('end-icon')).toBeInTheDocument();
  });

  it('should apply variant, size, and isTransparent classes correctly', () => {
    const { container, rerender } = render(
      <TextInput variant="secondary" size="large" isTransparent className="custom-input-class" />,
    );

    const input = container.querySelector('input');

    expect(input).toBeInTheDocument();
    expect(input?.className).toContain('secondary');
    expect(input?.className).toContain('large');
    expect(input?.className).toContain('is-transparent');
    expect(input?.className).toContain('custom-input-class');

    rerender(<TextInput variant="primary" size="small" isTransparent={false} />);
    expect(input?.className).toContain('primary');
    expect(input?.className).toContain('small');
    expect(input?.className).not.toContain('is-transparent');
  });

  it('should forward ref to the underlying native input element', () => {
    const ref = createRef<HTMLInputElement>();

    render(<TextInput ref={ref} aria-label="Referenced Input" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.tagName).toBe('INPUT');
  });

  it('should support various native input types', () => {
    const { rerender } = render(<TextInput type="password" data-testid="native-input" />);

    expect(screen.getByTestId('native-input')).toHaveAttribute('type', 'password');

    rerender(<TextInput type="number" data-testid="native-input" />);
    expect(screen.getByTestId('native-input')).toHaveAttribute('type', 'number');

    rerender(<TextInput type="email" data-testid="native-input" />);
    expect(screen.getByTestId('native-input')).toHaveAttribute('type', 'email');
  });

  it('should handle controlled value updates correctly', () => {
    const { rerender } = render(
      <TextInput value="First" onChange={() => {}} aria-label="Controlled Input" />,
    );

    const input = screen.getByRole('textbox', { name: /controlled input/i });

    expect(input).toHaveValue('First');

    rerender(<TextInput value="Second" onChange={() => {}} aria-label="Controlled Input" />);
    expect(input).toHaveValue('Second');
  });

  it('should prevent text modification when readOnly is set', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TextInput
        readOnly
        value="Read only text"
        onChange={handleChange}
        aria-label="Readonly Input"
      />,
    );

    const input = screen.getByRole('textbox', { name: /readonly input/i });

    expect(input).toHaveAttribute('readonly');
    await user.type(input, 'edit attempt');
    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('Read only text');
  });

  it('should handle onFocus and onBlur events', async () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    const user = userEvent.setup();

    render(<TextInput onFocus={handleFocus} onBlur={handleBlur} aria-label="Focus Input" />);

    const input = screen.getByRole('textbox', { name: /focus input/i });

    await user.click(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});
