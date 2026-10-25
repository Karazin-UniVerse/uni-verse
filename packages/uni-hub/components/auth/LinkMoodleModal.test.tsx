import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withAppProviders } from '@uni-hub/utils/test-utils';
import { LinkMoodleModal } from './LinkMoodleModal';
import { LinkMoodleMode } from './helpers';

describe('LinkMoodleModal component', () => {
  it('should render default connect mode correctly when open', () => {
    render(
      withAppProviders(
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
      withAppProviders(
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
      withAppProviders(<LinkMoodleModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} />),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
