import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnlinkMoodleModal } from './UnlinkMoodleModal';

vi.mock('@una', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@una');

  return {
    ...actual,
    Modal: ({
      open,
      title,
      children,
    }: {
      open: boolean;
      title?: string;
      children?: React.ReactNode;
    }) =>
      open ? (
        <div role="dialog" aria-label={title}>
          {title ? <h2>{title}</h2> : null}
          {children}
        </div>
      ) : null,
    useToast: () => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }),
  };
});

describe('UnlinkMoodleModal component', () => {
  it('should render confirmation prompt and actions when open', () => {
    render(<UnlinkMoodleModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: "Від'єднання акаунта Moodle" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Від'єднати" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Скасувати' })).toBeInTheDocument();
  });

  it('should render nothing visible when closed', () => {
    render(<UnlinkMoodleModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
