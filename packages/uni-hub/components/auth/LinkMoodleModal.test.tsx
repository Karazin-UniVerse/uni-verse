import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withQueryClient } from '@uni-hub/utils/with-query-client';
import { LinkMoodleModal } from './LinkMoodleModal';
import { LinkMoodleMode } from './helpers';

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
        <dialog open aria-label={title}>
          {title ? <h2>{title}</h2> : null}
          {children}
        </dialog>
      ) : null,
    useToast: () => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }),
  };
});

describe('LinkMoodleModal component', () => {
  it('should render default connect mode correctly when open', () => {
    render(
      withQueryClient(
        <LinkMoodleModal
          open={true}
          mode={LinkMoodleMode.CONNECT}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      ),
    );

    expect(screen.getByRole('dialog', { name: "Прив'язка акаунта Moodle" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /прив’язати moodle/i })).toBeInTheDocument();
  });

  it('should render change mode correctly when open with mode="change"', () => {
    render(
      withQueryClient(
        <LinkMoodleModal
          open={true}
          mode={LinkMoodleMode.CHANGE}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />,
      ),
    );

    expect(screen.getByRole('dialog', { name: 'Зміна акаунта Moodle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /змінити акаунт/i })).toBeInTheDocument();
    expect(screen.getByText(/Введіть нові облікові дані Moodle/i)).toBeInTheDocument();
  });

  it('should render nothing visible when closed', () => {
    render(
      withQueryClient(<LinkMoodleModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} />),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
