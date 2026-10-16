import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckBox } from './CheckBox';

describe('UNA CheckBox Component', () => {
  it('should render checkbox with label and accessible role', () => {
    render(
      <label htmlFor="terms-agreement">
        I accept the terms
        <CheckBox id="terms-agreement" variant="primary" />
      </label>,
    );

    const checkbox = screen.getByRole('checkbox', { name: /i accept the terms/i });

    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
    expect(checkbox).toHaveAttribute('id', 'terms-agreement');
  });

  it('should toggle state and trigger onChange when clicked by user', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<CheckBox variant="primary" aria-label="Notifications" onChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox', { name: /notifications/i });

    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledTimes(2);
    expect(checkbox).not.toBeChecked();
  });

  it('should respect disabled prop and not trigger onChange when clicked', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CheckBox disabled variant="primary" aria-label="Disabled option" onChange={handleChange} />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /disabled option/i });

    expect(checkbox).toBeDisabled();

    await user.click(checkbox);

    expect(handleChange).not.toHaveBeenCalled();
    expect(checkbox).not.toBeChecked();
  });

  it('should reflect checked prop correctly', () => {
    const { rerender } = render(
      <CheckBox checked variant="primary" readOnly aria-label="Controlled option" />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /controlled option/i });

    expect(checkbox).toBeChecked();

    rerender(
      <CheckBox checked={false} variant="primary" readOnly aria-label="Controlled option" />,
    );

    expect(checkbox).not.toBeChecked();
  });

  it('should support defaultChecked prop', () => {
    render(<CheckBox defaultChecked variant="primary" aria-label="Default checked option" />);

    const checkbox = screen.getByRole('checkbox', { name: /default checked option/i });

    expect(checkbox).toBeChecked();
  });

  it('should support custom className and variant styles', () => {
    const { rerender } = render(
      <CheckBox variant="primary" className="custom-test-checkbox" aria-label="Styling test" />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /styling test/i });

    expect(checkbox).toHaveClass('custom-test-checkbox');

    rerender(
      <CheckBox variant="secondary" className="another-custom-class" aria-label="Styling test" />,
    );

    expect(checkbox).toHaveClass('another-custom-class');
  });

  it('should pass through aria-checked attribute', () => {
    render(<CheckBox aria-checked="mixed" variant="primary" aria-label="Indeterminate option" />);

    const checkbox = screen.getByRole('checkbox', {
      name: /indeterminate option/i,
    });

    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
  });

  it('should pass through standard HTML attributes', () => {
    render(
      <CheckBox
        variant="primary"
        name="agree"
        value="agreed_yes"
        required
        aria-label="Standard attributes"
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /standard attributes/i });

    expect(checkbox).toHaveAttribute('name', 'agree');
    expect(checkbox).toHaveAttribute('value', 'agreed_yes');
    expect(checkbox).toBeRequired();
  });
});
