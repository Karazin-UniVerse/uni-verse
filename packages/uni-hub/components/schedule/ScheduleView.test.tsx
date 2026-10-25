import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BREAKPOINTS } from '@core/constants/breakpoints';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { DUMMY_EVENTS, exportToICS } from './helpers';
import { ScheduleView } from './ScheduleView';

vi.mock('../../hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock('./helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./helpers')>();

  return {
    ...actual,
    exportToICS: vi.fn(),
  };
});

describe('ScheduleView component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMediaQuery).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderScheduleView = () =>
    render(
      withLanguage(<ScheduleView />),
    );

  it('should render schedule view in default month mode on desktop', () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);

    renderScheduleView();

    const monthRadio = screen.getByRole('radio', { name: /^(місяць|month)$/i });
    const weekRadio = screen.getByRole('radio', { name: /^(тиждень|week)$/i });
    const dayRadio = screen.getByRole('radio', { name: /^(день|day)$/i });

    expect(useMediaQuery).toHaveBeenCalledWith('less', BREAKPOINTS.md);
    expect(monthRadio).toBeChecked();
    expect(weekRadio).not.toBeChecked();
    expect(dayRadio).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній місяць|previous month/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /наступний місяць|next month/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній день|previous day/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній тиждень|previous week/i }),
    ).not.toBeInTheDocument();
  });

  it('should switch to week view when week mode is selected in toolbar', async () => {
    const user = userEvent.setup();

    renderScheduleView();

    const weekRadio = screen.getByRole('radio', { name: /^(тиждень|week)$/i });

    await user.click(weekRadio);

    expect(weekRadio).toBeChecked();
    expect(screen.getByRole('radio', { name: /^(місяць|month)$/i })).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній тиждень|previous week/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /наступний тиждень|next week/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній місяць|previous month/i }),
    ).not.toBeInTheDocument();
  });

  it('should switch to day view when day mode is selected in toolbar', async () => {
    const user = userEvent.setup();

    renderScheduleView();

    const dayRadio = screen.getByRole('radio', { name: /^(день|day)$/i });

    await user.click(dayRadio);

    expect(dayRadio).toBeChecked();
    expect(screen.getByRole('radio', { name: /^(місяць|month)$/i })).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній день|previous day/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /наступний день|next day/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній місяць|previous month/i }),
    ).not.toBeInTheDocument();
  });

  it('should default to day view when viewport is mobile (breakpoint md)', () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);

    renderScheduleView();

    const dayRadio = screen.getByRole('radio', { name: /^(день|day)$/i });
    const monthRadio = screen.getByRole('radio', { name: /^(місяць|month)$/i });

    expect(useMediaQuery).toHaveBeenCalledWith('less', BREAKPOINTS.md);
    expect(dayRadio).toBeChecked();
    expect(monthRadio).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній день|previous day/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /наступний день|next day/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /попередній місяць|previous month/i }),
    ).not.toBeInTheDocument();
  });

  it('should trigger exportToICS when export button is clicked', async () => {
    const user = userEvent.setup();

    renderScheduleView();

    const exportButton = screen.getByRole('button', { name: /експорт|export/i });

    await user.click(exportButton);

    expect(exportToICS).toHaveBeenCalledTimes(1);
    expect(exportToICS).toHaveBeenCalledWith(DUMMY_EVENTS);
  });

  it('should switch to day view when a day cell is clicked in month view', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 4, 10));

    const user = userEvent.setup();

    renderScheduleView();

    const dayCells = screen.getAllByRole('button', { name: /15/ });

    await user.click(dayCells[0]);

    expect(screen.getByRole('radio', { name: /^(день|day)$/i })).toBeChecked();
    expect(
      screen.getByRole('button', { name: /попередній день|previous day/i }),
    ).toBeInTheDocument();
  });
});
