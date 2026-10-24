import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { LoadErrorState } from './LoadErrorState';

describe('LoadErrorState', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should render error message and retry button with accessible role', () => {
    render(withLanguage(<LoadErrorState onRetry={vi.fn()} />));

    expect(screen.getByText('Не вдалося завантажити дані')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Спробувати знову' })).toBeInTheDocument();
  });

  it('should trigger onRetry callback when retry button is clicked', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(withLanguage(<LoadErrorState onRetry={handleRetry} />));

    await user.click(screen.getByRole('button', { name: 'Спробувати знову' }));

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
