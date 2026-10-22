import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PasswordAuthField } from './PasswordAuthField';

describe('PasswordAuthField', () => {
  it('renders password input and toggles visibility on button click in uncontrolled mode', () => {
    const onChange = vi.fn();

    render(
      <PasswordAuthField
        id="test-pwd"
        name="testPwd"
        label="Пароль"
        placeholder="Введіть пароль"
        value="secret123"
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Пароль', { selector: 'input' });
    const toggleButton = screen.getByRole('button', { name: 'Показати пароль' });

    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('value', 'secret123');

    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: /сховати пароль|приховати пароль|hide password/i }),
    ).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('respects controlled showPassword and calls onTogglePassword', () => {
    const onTogglePassword = vi.fn();

    const { rerender } = render(
      <PasswordAuthField
        id="test-pwd"
        name="testPwd"
        label="Пароль"
        placeholder="Введіть пароль"
        value="secret123"
        onChange={vi.fn()}
        showPassword={false}
        onTogglePassword={onTogglePassword}
      />,
    );

    const input = screen.getByLabelText('Пароль', { selector: 'input' });
    const toggleButton = screen.getByRole('button', { name: 'Показати пароль' });

    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(onTogglePassword).toHaveBeenCalledTimes(1);

    rerender(
      <PasswordAuthField
        id="test-pwd"
        name="testPwd"
        label="Пароль"
        placeholder="Введіть пароль"
        value="secret123"
        onChange={vi.fn()}
        showPassword={true}
        onTogglePassword={onTogglePassword}
      />,
    );

    expect(input).toHaveAttribute('type', 'text');
  });
});
