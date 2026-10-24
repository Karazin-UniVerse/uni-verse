import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withAppProviders } from '@uni-hub/utils/test-utils';
import { UnlinkMoodleModal } from './UnlinkMoodleModal';

describe('UnlinkMoodleModal component', () => {
  it('should render confirmation prompt and actions when open', () => {
    render(
      withAppProviders(<UnlinkMoodleModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />),
    );

    expect(screen.getByRole('dialog', { name: "Від'єднання акаунта Moodle" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Від'єднати" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Скасувати' })).toBeInTheDocument();
  });

  it('should render nothing visible when closed', () => {
    render(
      withAppProviders(<UnlinkMoodleModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} />),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
