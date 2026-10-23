import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthField } from './AuthField';

describe('AuthField component', () => {
  it('should render text input with label, placeholder, and icon', () => {
    const handleChange = vi.fn();

    render(
      <AuthField
        id="test-username"
        name="username"
        label="Ім'я користувача"
        placeholder="Введіть логін"
        value="student1"
        onChange={handleChange}
        icon={<span data-testid="test-icon">👤</span>}
      />,
    );

    expect(screen.getByLabelText("Ім'я користувача")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Введіть логін')).toHaveValue('student1');
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('should render rightElement in standard text mode', () => {
    render(
      <AuthField
        id="test-field"
        name="field"
        label="Поле"
        placeholder="Значення"
        value=""
        onChange={vi.fn()}
        icon={<span>*</span>}
        rightElement={<button type="button">Дія</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Дія' })).toBeInTheDocument();
  });

  it('should render PasswordInput and toggle visibility when type="password"', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <AuthField
        id="test-password"
        name="password"
        type="password"
        label="Пароль"
        placeholder="Введіть пароль"
        value="secret123"
        onChange={handleChange}
        icon={<span data-testid="lock-icon">🔒</span>}
      />,
    );

    const input = screen.getByLabelText('Пароль', { selector: 'input' });
    const toggle = screen.getByRole('button', { name: /показати пароль/i });

    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autoComplete', 'current-password');
    expect(input).toHaveValue('secret123');
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();

    await user.click(toggle);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /сховати пароль/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /сховати пароль/i }));

    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /показати пароль/i })).toBeInTheDocument();
  });
});
