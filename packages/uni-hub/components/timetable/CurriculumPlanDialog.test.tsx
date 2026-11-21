import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { CurriculumPlanDialog } from './CurriculumPlanDialog';

const PLANS = [
  {
    id: 'plan-1',
    faculty: 'ННІ КН та ШІ',
    title: 'КН, 1 курс',
    academicYear: '2026/2027',
    semester: 1,
    studySemester: null,
    isDraft: false,
  },
];

const renderDialog = (onCreated = vi.fn()) => {
  render(
    withLanguage(
      <CurriculumPlanDialog open plans={PLANS} onClose={vi.fn()} onCreated={onCreated} />,
    ),
  );

  return onCreated;
};

describe('CurriculumPlanDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a curriculum plan and notifies the caller', async () => {
    const created = { ...PLANS[0], id: 'plan-2', title: 'КН, 2 курс', studySemester: 3 };
    const createPlan = vi
      .spyOn(timetableApi, 'createCurriculumPlan')
      .mockResolvedValue({ data: created });
    const user = userEvent.setup();
    const onCreated = renderDialog();
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText('Назва плану'), 'КН, 2 курс');
    await user.selectOptions(within(dialog).getByLabelText(/^Семестр навчання/), '3');
    await user.click(within(dialog).getByRole('button', { name: 'Створити план' }));

    expect(createPlan).toHaveBeenCalledWith({
      title: 'КН, 2 курс',
      faculty: 'ННІ КН та ШІ',
      academicYear: '2026/2027',
      semester: 1,
      studySemester: 3,
    });
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it('keeps semester in step with the chosen study semester', async () => {
    const user = userEvent.setup();

    renderDialog();

    const dialog = screen.getByRole('dialog');

    await user.selectOptions(within(dialog).getByLabelText(/^Семестр навчання/), '4');

    expect(within(dialog).getByLabelText('Семестр')).toHaveValue('2');
    expect(within(dialog).getByLabelText('Семестр')).toBeDisabled();

    await user.selectOptions(within(dialog).getByLabelText(/^Семестр навчання/), '5');

    expect(within(dialog).getByLabelText('Семестр')).toHaveValue('1');

    await user.selectOptions(within(dialog).getByLabelText(/^Семестр навчання/), '');

    expect(within(dialog).getByLabelText('Семестр')).toBeEnabled();
  });

  it('validates required fields before submitting', async () => {
    const createPlan = vi.spyOn(timetableApi, 'createCurriculumPlan');
    const user = userEvent.setup();

    renderDialog();

    const dialog = screen.getByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Створити план' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('2026/2027');
    expect(createPlan).not.toHaveBeenCalled();
  });

  it('shows an error alert when plan creation fails', async () => {
    vi.spyOn(timetableApi, 'createCurriculumPlan').mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();

    renderDialog();

    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText('Назва плану'), 'Порожній план');
    await user.click(within(dialog).getByRole('button', { name: 'Створити план' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Не вдалося створити план');
  });
});
