import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Empty } from './Empty';

describe('UNA Empty Component', () => {
  it('should render default description when none is provided', () => {
    render(<Empty />);

    expect(screen.getByText('Нет данных')).toBeInTheDocument();
  });

  it('should render custom description text', () => {
    render(<Empty description="Список курсів порожній" />);

    expect(screen.getByText('Список курсів порожній')).toBeInTheDocument();
  });

  it('should render custom icon when provided', () => {
    render(<Empty icon={<span data-testid="custom-icon">Custom Icon</span>} />);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
