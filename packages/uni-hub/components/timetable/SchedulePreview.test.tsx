import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { SchedulePreview } from './SchedulePreview';
import type { PreviewEvent } from './SchedulePreview.types';

const events: PreviewEvent[] = [
  {
    id: 'event-1',
    teachingAssignmentId: 'assignment-1',
    disciplineTitle: 'Алгоритми',
    teachingType: 'LECTURE',
    teacherId: 'teacher-1',
    groupIds: ['group-1'],
    date: '2026-11-09',
    pair: 1,
  },
  {
    id: 'event-2',
    teachingAssignmentId: 'assignment-2',
    disciplineTitle: 'Бази даних',
    teachingType: 'LABORATORY',
    teacherId: 'teacher-2',
    groupIds: ['group-1'],
    date: '2026-11-10',
    pair: 2,
  },
];

const renderPreview = (onAdjust?: (event: PreviewEvent, weekday: number) => void) =>
  render(withLanguage(<SchedulePreview events={events} academicGroups={[]} onAdjust={onAdjust} />));

describe('SchedulePreview', () => {
  it('shows the whole week in the grid view', () => {
    renderPreview();

    expect(screen.getByText('Алгоритми')).toBeInTheDocument();
    expect(screen.getByText('Бази даних')).toBeInTheDocument();
  });

  it('switches to the day view and shows one day at a time', async () => {
    const user = userEvent.setup();

    renderPreview();
    await user.click(screen.getByRole('radio', { name: 'За днями' }));

    expect(screen.getByText('Алгоритми')).toBeInTheDocument();
    expect(screen.queryByText('Бази даних')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /вівторок, занять: 1/i }));

    expect(screen.getByText('Бази даних')).toBeInTheDocument();
    expect(screen.queryByText('Алгоритми')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /середа, занять: 0/i }));

    expect(screen.getByText('На цей день занять немає')).toBeInTheDocument();
  });

  it('reports the weekday of the card chosen for adjustment', async () => {
    const onAdjust = vi.fn();
    const user = userEvent.setup();

    renderPreview(onAdjust);
    await user.click(screen.getAllByRole('button', { name: 'Змінити слот' })[1]);

    expect(onAdjust).toHaveBeenCalledWith(events[1], 2);
  });
});
