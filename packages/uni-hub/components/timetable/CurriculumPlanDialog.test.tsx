import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { readXlsxSheets } from '@uni-hub/utils/xlsx';
import { CurriculumPlanDialog } from './CurriculumPlanDialog';

vi.mock('@uni-hub/utils/xlsx', () => ({ readXlsxSheets: vi.fn() }));

const row = (cells: Record<number, string>): string[] =>
  Array.from({ length: 70 }, (_, col) => cells[col] ?? '');

const WORKING_SHEET = {
  name: '2курс',
  grid: [
    row({ 17: "спеціальності  F3 Комп'ютерні науки" }),
    row({ 17: 'Рік навчання   2' }),
    row({ 0: '№ з/п', 1: 'Освітні компоненти', 67: 'Кафедра' }),
    row({ 27: 'лекції', 29: 'лабораторні', 31: 'практичні', 33: 'семінари', 49: 'лекції' }),
    row({ 0: '1', 1: 'Бази даних', 27: '32', 29: '16', 49: '32' }),
    row({ 0: '2', 1: 'Чисельні методи', 27: '32', 31: '31' }),
    row({ 1: 'Разом' }),
  ],
};

const GROUPS = [{ id: 'group-21', code: 'КС21' }];
const PLANS = [
  {
    id: 'plan-1',
    faculty: 'ННІ КН та ШІ',
    title: 'КН, 1 курс',
    academicYear: '2026/2027',
    semester: 1,
    isDraft: false,
  },
];

const renderDialog = (onCreated = vi.fn()) => {
  render(
    withLanguage(
      <CurriculumPlanDialog
        open
        academicGroups={GROUPS}
        plans={PLANS}
        onClose={vi.fn()}
        onCreated={onCreated}
      />,
    ),
  );

  return onCreated;
};

const uploadCurriculum = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  const input = screen.getByRole('dialog').querySelector<HTMLInputElement>('input[type="file"]');

  expect(input).not.toBeNull();
  await user.upload(input as HTMLInputElement, new File(['xlsx'], 'rnp.xlsx'));
};

describe('CurriculumPlanDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readXlsxSheets).mockResolvedValue([WORKING_SHEET]);
  });

  it('previews the first term of the file and imports it for the chosen group', async () => {
    const created = { ...PLANS[0], id: 'plan-2', title: "F3 Комп'ютерні науки, 2 курс" };
    const importPlan = vi
      .spyOn(timetableApi, 'importCurriculumPlan')
      .mockResolvedValue({ data: created });
    const user = userEvent.setup();
    const onCreated = renderDialog();

    await uploadCurriculum(user);

    const dialog = screen.getByRole('dialog');

    expect(await within(dialog).findByText('Дисциплін: 2, занять: 4')).toBeInTheDocument();
    expect(within(dialog).getByText('Округлено')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Назва плану')).toHaveValue(
      "F3 Комп'ютерні науки, 2 курс",
    );

    await user.click(within(dialog).getByRole('button', { name: 'Створити план' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Оберіть групу');
    expect(importPlan).not.toHaveBeenCalled();

    await user.selectOptions(within(dialog).getByLabelText('Група для всіх занять'), 'group-21');
    await user.click(within(dialog).getByRole('button', { name: 'Створити план' }));

    expect(importPlan).toHaveBeenCalledWith({
      title: "F3 Комп'ютерні науки, 2 курс",
      faculty: 'ННІ КН та ШІ',
      academicYear: '2026/2027',
      semester: 1,
      groupId: 'group-21',
      assignments: [
        { disciplineTitle: 'Бази даних', teachingType: 'LECTURE', academicHours: 32 },
        { disciplineTitle: 'Бази даних', teachingType: 'LABORATORY', academicHours: 16 },
        { disciplineTitle: 'Чисельні методи', teachingType: 'LECTURE', academicHours: 32 },
        { disciplineTitle: 'Чисельні методи', teachingType: 'PRACTICAL', academicHours: 32 },
      ],
    });
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it('switches to the second semester of the same sheet', async () => {
    const user = userEvent.setup();

    renderDialog();
    await uploadCurriculum(user);

    const dialog = screen.getByRole('dialog');

    await user.selectOptions(within(dialog).getByLabelText('Курс і семестр з файлу'), '0:1');

    expect(within(dialog).getByText('Дисциплін: 1, занять: 1')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Семестр')).toHaveValue('2');
  });

  it('creates an empty plan without a file', async () => {
    const importPlan = vi
      .spyOn(timetableApi, 'importCurriculumPlan')
      .mockResolvedValue({ data: PLANS[0] });
    const user = userEvent.setup();

    renderDialog();

    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText('Назва плану'), 'Порожній план');
    await user.click(within(dialog).getByRole('button', { name: 'Створити план' }));

    expect(importPlan).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Порожній план', groupId: undefined, assignments: [] }),
    );
  });

  it('explains when the file has no curriculum sheets', async () => {
    vi.mocked(readXlsxSheets).mockResolvedValue([{ name: 'Графік', grid: [row({ 0: 'Т' })] }]);
    const user = userEvent.setup();

    renderDialog();
    await uploadCurriculum(user);

    expect(
      await screen.findByText('У файлі немає аркушів з навчальним планом'),
    ).toBeInTheDocument();
  });
});
