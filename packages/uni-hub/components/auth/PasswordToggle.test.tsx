import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PasswordToggle } from './PasswordToggle';

describe('PasswordToggle', () => {
  it('renders with eye icon when show is false and calls onToggle on click', () => {
    const onToggle = vi.fn();

    render(<PasswordToggle label="Показати пароль" show={false} onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: 'Показати пароль' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Показати пароль');

    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders with eye-off icon when show is true', () => {
    render(<PasswordToggle label="Приховати пароль" show={true} onToggle={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Приховати пароль' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Приховати пароль');
  });
});
