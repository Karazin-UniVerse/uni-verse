import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { ScheduleToolbar } from './ScheduleToolbar';
import type { ScheduleToolbarProps } from './ScheduleView.types';

describe('ScheduleToolbar', () => {
  const defaultProps: ScheduleToolbarProps = {
    viewMode: 'week',
    onViewModeChange: vi.fn(),
    onExportICS: vi.fn(),
  };

  const renderToolbar = (props: Partial<ScheduleToolbarProps> = {}) => {
    return render(
      withLanguage(<ScheduleToolbar {...defaultProps} {...props} />),
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('universe-lang', 'uk');
    window.dispatchEvent(new Event('language-change'));
  });

  afterEach(() => {
    localStorage.removeItem('universe-lang');
    window.dispatchEvent(new Event('language-change'));
  });

  it('should render view switch radiogroup with month, week, day options', () => {
    renderToolbar();

    const radiogroup = screen.getByRole('radiogroup', { name: 'Режим розкладу' });
    const radios = screen.getAllByRole('radio');
    const monthRadio = screen.getByRole('radio', { name: 'Місяць' });
    const weekRadio = screen.getByRole('radio', { name: 'Тиждень' });
    const dayRadio = screen.getByRole('radio', { name: 'День' });
    const exportButton = screen.getByRole('button', { name: /експорт у ical/i });

    expect(radiogroup).toBeInTheDocument();
    expect(radios).toHaveLength(3);
    expect(monthRadio).toHaveAttribute('value', 'month');
    expect(weekRadio).toHaveAttribute('value', 'week');
    expect(dayRadio).toHaveAttribute('value', 'day');
    expect(exportButton).toBeInTheDocument();
  });

  it('should indicate currently active view mode via checked radio button', () => {
    const { rerender } = renderToolbar({ viewMode: 'week' });
    const monthRadio = screen.getByRole('radio', { name: 'Місяць' });
    const weekRadio = screen.getByRole('radio', { name: 'Тиждень' });
    const dayRadio = screen.getByRole('radio', { name: 'День' });

    expect(weekRadio).toBeChecked();
    expect(monthRadio).not.toBeChecked();
    expect(dayRadio).not.toBeChecked();

    rerender(
      withLanguage(<ScheduleToolbar {...defaultProps} viewMode="month" />),
    );

    expect(screen.getByRole('radio', { name: 'Місяць' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Тиждень' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'День' })).not.toBeChecked();

    rerender(
      withLanguage(<ScheduleToolbar {...defaultProps} viewMode="day" />),
    );

    expect(screen.getByRole('radio', { name: 'День' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Місяць' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Тиждень' })).not.toBeChecked();
  });

  it('should call onViewModeChange when another view mode radio is selected', async () => {
    const handleViewModeChange = vi.fn();
    const user = userEvent.setup();

    renderToolbar({ viewMode: 'week', onViewModeChange: handleViewModeChange });

    const monthRadio = screen.getByRole('radio', { name: 'Місяць' });
    const dayRadio = screen.getByRole('radio', { name: 'День' });

    await user.click(monthRadio);

    expect(handleViewModeChange).toHaveBeenCalledTimes(1);
    expect(handleViewModeChange).toHaveBeenCalledWith('month');

    await user.click(dayRadio);

    expect(handleViewModeChange).toHaveBeenCalledTimes(2);
    expect(handleViewModeChange).toHaveBeenLastCalledWith('day');
  });

  it('should call onExportICS when export button is clicked', async () => {
    const handleExportICS = vi.fn();
    const user = userEvent.setup();

    renderToolbar({ onExportICS: handleExportICS });

    const exportButton = screen.getByRole('button', { name: /експорт у ical/i });

    await user.click(exportButton);

    expect(handleExportICS).toHaveBeenCalledTimes(1);
  });
});
