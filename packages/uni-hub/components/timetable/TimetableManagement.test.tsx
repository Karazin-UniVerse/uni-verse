import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage, withQueryClient, createTestQueryClient } from '@uni-hub/utils/test-utils';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { TimetableManagement } from './TimetableManagement';

describe('TimetableManagement component', () => {
  it.each(['save', 'generate'])(
    'persists removal before %s and retries failures',
    async (action) => {
      const remove = vi
        .spyOn(timetableApi, 'deleteTeachingAssignment')
        .mockRejectedValueOnce(new Error('Archive failed'))
        .mockResolvedValue({ data: { count: 1 } });
      const generate = vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
        data: {
          versionId: 'version-1',
          candidates: [],
          diagnostics: { statesExplored: 0, timeMs: 0 },
        },
      });
      const user = userEvent.setup();

      renderComponent({
        initialPlanId: 'plan-cs-2026',
        initialWorkload: [
          {
            id: 'assignment-1',
            disciplineTitle: 'Чисельні методи',
            teachingType: 'PRACTICE',
            academicHours: 32,
            groupId: 'group-2',
            isSaturdayOnly: false,
            hasLateSlotAuthorization: false,
          },
        ],
      });
      await user.click(screen.getByRole('button', { name: /видалити/i }));
      expect(remove).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Навчальний план')).toBeDisabled();

      const buttonName = action === 'save' ? /зберегти навантаження/i : /згенерувати розклад/i;

      await user.click(screen.getByRole('button', { name: buttonName }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Archive failed');
      expect(generate).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Навчальний план')).toBeDisabled();
      await user.click(screen.getByRole('button', { name: buttonName }));
      expect(remove).toHaveBeenCalledTimes(2);
      expect(remove).toHaveBeenLastCalledWith('assignment-1');
      expect(screen.getByLabelText('Навчальний план')).not.toBeDisabled();
      expect(generate).toHaveBeenCalledTimes(action === 'generate' ? 1 : 0);
    },
  );

  it('does not send a deletion for a temporary row', async () => {
    const remove = vi.spyOn(timetableApi, 'deleteTeachingAssignment');
    const user = userEvent.setup();

    renderComponent({
      initialPlanId: 'plan-cs-2026',
      initialWorkload: [
        {
          id: 'row-new',
          disciplineTitle: 'Temporary',
          teachingType: 'LECTURE',
          academicHours: 32,
          isSaturdayOnly: false,
          hasLateSlotAuthorization: false,
        },
      ],
    });
    await user.click(screen.getByRole('button', { name: /видалити/i }));
    await user.click(screen.getByRole('button', { name: /зберегти навантаження/i }));
    expect(remove).not.toHaveBeenCalled();
  });

  it('does not carry saved rows into another empty plan', async () => {
    vi.spyOn(timetableApi, 'listCurriculumPlans').mockResolvedValue({
      data: [
        {
          id: 'plan-cs-2026',
          faculty: 'CS',
          title: 'First',
          academicYear: '2026/2027',
          semester: 1,
          isDraft: true,
        },
        {
          id: 'plan-other',
          faculty: 'CS',
          title: 'Second',
          academicYear: '2026/2027',
          semester: 2,
          isDraft: true,
        },
      ],
    });
    vi.spyOn(timetableApi, 'listTeachingAssignments').mockImplementation(async (id) => ({
      data:
        id === 'plan-other'
          ? []
          : [
              {
                id: 'assignment-1',
                curriculumPlanId: id,
                disciplineTitle: 'Old plan row',
                teachingType: 'LECTURE',
                academicHours: 32,
                isSaturdayOnly: false,
                hasLateSlotAuthorization: false,
              },
            ],
    }));
    const user = userEvent.setup();

    renderComponent();
    await screen.findByDisplayValue('Old plan row');
    await user.selectOptions(screen.getByLabelText('Навчальний план'), 'plan-other');
    expect(screen.queryByDisplayValue('Old plan row')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /видалити/i })).not.toBeInTheDocument();
  });
  it.each([false, true])(
    'adjusts the selected draft slot and preserves conflicts (failure: %s)',
    async (fails) => {
      const event = {
        id: 'event-1',
        teachingAssignmentId: 'assignment-1',
        disciplineTitle: 'Algorithms',
        teachingType: 'LECTURE' as const,
        groupIds: ['group-1'],
        date: '2026-11-09',
        pair: 1,
      };

      vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
        data: {
          versionId: 'fallback',
          candidates: [{ versionId: 'selected-version', events: [event], penaltyScore: 0 }],
          diagnostics: { statesExplored: 1, timeMs: 1 },
        },
      });
      const adjust = vi.spyOn(timetableApi, 'adjustDraftSlot');

      if (fails) {
        adjust.mockRejectedValue(new Error('Teacher conflict (HTTP 409)'));
      } else {
        adjust.mockResolvedValue({
          data: {
            id: 'selected-version',
            status: 'DRAFT',
            penaltyScore: 0,
            events: [{ ...event, date: '2026-11-10', pair: 3 }],
          },
        });
      }

      const user = userEvent.setup();

      renderComponent();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Згенерувати розклад/i })).toBeEnabled(),
      );
      await user.click(screen.getByRole('button', { name: /Згенерувати розклад/i }));
      await user.click(screen.getByRole('button', { name: 'Змінити слот' }));

      const dialog = screen.getByRole('dialog');

      await user.selectOptions(within(dialog).getByLabelText('День тижня'), '2');
      await user.selectOptions(within(dialog).getByLabelText('Пара'), '3');
      await user.click(within(dialog).getByRole('button', { name: 'Зберегти' }));

      expect(adjust).toHaveBeenCalledWith('selected-version', {
        teachingAssignmentId: 'assignment-1',
        fromWeekday: 1,
        fromPair: 1,
        toWeekday: 2,
        toPair: 3,
      });

      if (fails) {
        expect(await screen.findByRole('alert')).toHaveTextContent('Teacher conflict');
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      } else {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        const rows = screen.getAllByRole('row');
        const row = rows.find((candidate) => within(candidate).queryByText('#3'));

        expect(row).toHaveTextContent('Algorithms');
      }
    },
  );
  it('should retain moved and unmoved metadata when persisted IDs replace solver IDs', async () => {
    const events = [
      {
        id: 'solver-practice',
        teachingAssignmentId: 'assignment-1',
        disciplineTitle: 'Algorithms',
        teachingType: 'PRACTICAL' as const,
        teacherId: 'teacher-1',
        groupIds: ['group-1'],
        date: '2026-11-09',
        pair: 1,
      },
      {
        id: 'solver-lab',
        teachingAssignmentId: 'assignment-2',
        disciplineTitle: 'Physics',
        teachingType: 'LABORATORY' as const,
        teacherId: 'teacher-10',
        groupIds: ['group-2'],
        date: '2026-11-09',
        pair: 2,
      },
    ];

    vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
      data: {
        versionId: 'fallback',
        candidates: [{ versionId: 'selected-version', events, penaltyScore: 0 }],
        diagnostics: { statesExplored: 1, timeMs: 1 },
      },
    });
    const adjust = vi.spyOn(timetableApi, 'adjustDraftSlot').mockResolvedValue({
      data: {
        id: 'selected-version',
        status: 'DRAFT',
        penaltyScore: 0,
        events: [
          { ...events[0], id: 'persisted-practice', date: '2026-11-10', pair: 3 },
          { ...events[1], id: 'persisted-lab' },
        ],
      },
    });
    const user = userEvent.setup();

    renderComponent();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Згенерувати розклад/i })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: /Згенерувати розклад/i }));
    await user.click(screen.getAllByRole('button', { name: 'Змінити слот' })[0]);

    const dialog = screen.getByRole('dialog');

    await user.selectOptions(within(dialog).getByLabelText('День тижня'), '2');
    await user.selectOptions(within(dialog).getByLabelText('Пара'), '3');
    await user.click(within(dialog).getByRole('button', { name: 'Зберегти' }));

    const movedRow = screen.getByText('Algorithms').closest('tr')!;
    const unmovedRow = screen.getByText('Physics').closest('tr')!;

    expect(movedRow).toHaveTextContent('КС11');
    expect(movedRow).toHaveTextContent('teacher-1');
    expect(movedRow).toHaveTextContent('ПР');
    expect(unmovedRow).toHaveTextContent('КС12');
    expect(unmovedRow).toHaveTextContent('teacher-10');
    expect(unmovedRow).toHaveTextContent('ЛР');
    await user.click(within(movedRow).getByRole('button', { name: 'Змінити слот' }));
    await user.selectOptions(within(screen.getByRole('dialog')).getByLabelText('Пара'), '4');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Зберегти' }));
    expect(adjust).toHaveBeenLastCalledWith('selected-version', {
      teachingAssignmentId: 'assignment-1',
      fromWeekday: 2,
      fromPair: 3,
      toWeekday: 2,
      toPair: 4,
    });
  });

  it('blocks an adjustment that overlaps another class for the same group', async () => {
    const event = {
      id: 'event-1',
      teachingAssignmentId: 'assignment-1',
      disciplineTitle: 'Algorithms',
      teachingType: 'LECTURE' as const,
      groupIds: ['group-1'],
      date: '2026-11-09',
      pair: 1,
    };

    vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
      data: {
        versionId: 'version-1',
        candidates: [
          {
            events: [
              event,
              {
                ...event,
                id: 'event-2',
                teachingAssignmentId: 'assignment-2',
                disciplineTitle: 'Databases',
                pair: 2,
              },
            ],
            penaltyScore: 0,
          },
        ],
        diagnostics: { statesExplored: 1, timeMs: 1 },
      },
    });
    const adjust = vi.spyOn(timetableApi, 'adjustDraftSlot');
    const user = userEvent.setup();

    renderComponent();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Згенерувати розклад/i })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: /Згенерувати розклад/i }));
    await user.click(screen.getAllByRole('button', { name: 'Змінити слот' })[0]);

    const dialog = screen.getByRole('dialog');

    await user.selectOptions(within(dialog).getByLabelText('Пара'), '2');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Слот конфліктує');
    expect(within(dialog).getByRole('button', { name: 'Зберегти' })).toBeDisabled();
    expect(adjust).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    vi.spyOn(timetableApi, 'getSemesterCalendar').mockResolvedValue({
      data: {
        id: 'calendar-1',
        academicYear: '2026/2027',
        semester: 1,
        startDate: '2026-09-07',
        teachingWeeks: 16,
      },
    });
    vi.clearAllMocks();
    vi.spyOn(timetableApi, 'listTeachingAssignments').mockResolvedValue({ data: [] });
    vi.spyOn(timetableApi, 'listAcademicGroups').mockResolvedValue({ data: [] });
    vi.spyOn(timetableApi, 'listSemesterSlotPreferences').mockResolvedValue({ data: [] });
    vi.spyOn(timetableApi, 'listCurriculumPlans').mockResolvedValue({
      data: [
        {
          id: 'plan-cs-2026',
          faculty: 'ННІ КН та ШІ',
          title: 'Комп’ютерні науки',
          academicYear: '2026/2027',
          semester: 1,
          isDraft: false,
        },
      ],
    });
    vi.spyOn(timetableApi, 'listTeachers').mockResolvedValue({
      data: [
        { id: 'teacher-1', name: 'Подоляка О.М.' },
        { id: 'teacher-10', name: 'Буткевич М.В.' },
      ],
    });
  });

  const renderComponent = (props = {}) => {
    const client = createTestQueryClient();

    client.setQueryData(['timetable', 'semesterCalendar', '2026/2027', 1], {
      id: 'calendar-1',
      academicYear: '2026/2027',
      semester: 1,
      startDate: '2026-09-07',
      teachingWeeks: 16,
    });

    return render(withQueryClient(withLanguage(<TimetableManagement {...props} />), client));
  };

  it('offers existing plans and teachers as choices instead of free text ids', async () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { level: 2, name: /керування розкладом/i }),
    ).toBeInTheDocument();

    const planSelect = await screen.findByLabelText('Навчальний план');

    expect(planSelect.tagName).toBe('SELECT');
    expect(
      await screen.findByRole('option', { name: /Комп’ютерні науки \(2026\/2027/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'Буткевич М.В.' }).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Викладач')[0].tagName).toBe('SELECT');
  });

  it('disables generate and save until a plan is available', async () => {
    vi.spyOn(timetableApi, 'listCurriculumPlans').mockResolvedValue({ data: [] });

    renderComponent();

    expect(await screen.findByRole('option', { name: /планів не знайдено/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /згенерувати розклад/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /зберегти навантаження/i })).toBeDisabled();
  });

  it('renders workload table headers and initial workload rows', async () => {
    renderComponent();

    expect(screen.getAllByLabelText('Дисципліна')).toHaveLength(3);

    const collapse = screen.getByRole('button', {
      name: 'Згорнути дисципліну Алгоритми та структури даних',
    });

    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(collapse);
    expect(
      screen.getByRole('button', { name: 'Розгорнути дисципліну Алгоритми та структури даних' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByText('Тип')).toHaveLength(1);
    expect(screen.getAllByText('Група / Потік')).toHaveLength(1);
    expect(screen.getAllByText('Підгрупа')).toHaveLength(1);
    expect(screen.getAllByText('Години')).toHaveLength(1);
    expect(screen.getAllByText('Викладач')).toHaveLength(1);
    expect(screen.getAllByText('Лише субота')).toHaveLength(1);
    expect(screen.getAllByText('Пізні пари')).toHaveLength(1);
    expect(screen.getByDisplayValue('Паралельні та розподілені обчислення')).toBeInTheDocument();
  });

  it('adds a workload row inside an existing discipline group', async () => {
    const user = userEvent.setup();

    renderComponent();

    await user.click(
      screen.getByRole('button', {
        name: 'Додати навантаження до дисципліни Алгоритми та структури даних',
      }),
    );

    expect(screen.getAllByPlaceholderText('Дисципліна')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: /видалити/i })).toHaveLength(4);
  });

  it('allows adding and removing workload rows', async () => {
    const user = userEvent.setup();

    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Додати дисципліну' }));

    const inputs = screen.getAllByPlaceholderText('Дисципліна');

    expect(inputs.length).toBe(4);

    const deleteBtns = screen.getAllByRole('button', { name: /видалити/i });

    await user.click(deleteBtns[0]);

    const updatedInputs = screen.getAllByPlaceholderText('Дисципліна');

    expect(updatedInputs.length).toBe(3);
  });

  it('triggers generateTimetableDraft, displays diagnostics and candidate options', async () => {
    const generateSpy = vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
      data: {
        versionId: 'ver-draft-101',
        candidates: [
          { events: [], penaltyScore: 0 },
          { events: [], penaltyScore: 30 },
        ],
        diagnostics: {
          statesExplored: 88,
          timeMs: 15,
        },
      },
    });
    const user = userEvent.setup();

    renderComponent();

    const generateBtn = screen.getByRole('button', { name: /згенерувати розклад/i });

    await waitFor(() => expect(generateBtn).toBeEnabled());
    await user.click(generateBtn);

    expect(generateSpy).toHaveBeenCalledWith('plan-cs-2026', {
      maxCandidates: 3,
      timeoutMs: 5000,
    });

    expect(screen.getByText(/діагностика генерації/i)).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('15 ms')).toBeInTheDocument();
    expect(screen.getByText(/варіант #1/i)).toBeInTheDocument();
    expect(screen.getByText(/варіант #2/i)).toBeInTheDocument();
    expect(screen.getByText(/розклад без штрафів/i)).toBeInTheDocument();
  });

  it('displays preference violation details for relaxed candidates only', async () => {
    vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
      data: {
        versionId: 'ver-draft-pref',
        candidates: [
          { events: [], penaltyScore: 0, preferenceViolations: [] },
          {
            events: [],
            penaltyScore: 0,
            preferenceViolations: [
              {
                teacherId: 'teacher-1',
                date: '2026-09-07',
                pair: 2,
                eventId: 'evt-viol-1',
              },
            ],
          },
        ],
        diagnostics: { statesExplored: 10, timeMs: 5 },
      },
    });
    const user = userEvent.setup();

    renderComponent();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /згенерувати розклад/i })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: /згенерувати розклад/i }));

    expect(await screen.findByText('Порушення побажань викладача (1)')).toBeInTheDocument();
    expect(screen.getByText(/2026-09-07, пара #2/)).toBeInTheDocument();
    expect(screen.getAllByText(/розклад без штрафів/i)).toHaveLength(1);
  });

  it('triggers publishTimetableVersion when approving candidate and shows success banner', async () => {
    vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
      data: {
        versionId: 'ver-draft-101',
        candidates: [{ events: [], penaltyScore: 0 }],
        diagnostics: { statesExplored: 10, timeMs: 5 },
      },
    });

    const publishSpy = vi.spyOn(timetableApi, 'publishTimetableVersion').mockResolvedValue({
      data: {
        id: 'ver-draft-101',
        curriculumPlanId: 'plan-cs-2026',
        status: 'PUBLISHED',
        versionNumber: 1,
        events: [],
      },
    });
    const user = userEvent.setup();

    renderComponent();

    const generateBtn = screen.getByRole('button', { name: /згенерувати розклад/i });

    await waitFor(() => expect(generateBtn).toBeEnabled());
    await user.click(generateBtn);

    const publishBtn = screen.getByRole('button', { name: /затвердити та опублікувати/i });

    await user.click(publishBtn);

    expect(publishSpy).toHaveBeenCalledWith('ver-draft-101');
    expect(screen.getByText(/розклад успішно опубліковано/i)).toBeInTheDocument();
  });

  it('publishes selected candidate versionId when another candidate is chosen', async () => {
    vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
      data: {
        versionId: 'ver-cand-1',
        candidates: [
          { versionId: 'ver-cand-1', candidateIndex: 0, events: [], penaltyScore: 0 },
          { versionId: 'ver-cand-2', candidateIndex: 1, events: [], penaltyScore: 10 },
        ],
        diagnostics: { statesExplored: 20, timeMs: 8 },
      },
    });

    const publishSpy = vi.spyOn(timetableApi, 'publishTimetableVersion').mockResolvedValue({
      data: {
        id: 'ver-cand-2',
        curriculumPlanId: 'plan-cs-2026',
        status: 'PUBLISHED',
        versionNumber: 2,
        events: [],
      },
    });
    const user = userEvent.setup();

    renderComponent();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /згенерувати розклад/i })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: /згенерувати розклад/i }));
    await user.click(await screen.findByText(/варіант #2/i));
    await user.click(screen.getByRole('button', { name: /затвердити та опублікувати/i }));

    expect(publishSpy).toHaveBeenCalledWith('ver-cand-2');
  });

  it('loads assignments from listTeachingAssignments and persists edited workload via updateTeachingAssignment', async () => {
    vi.spyOn(timetableApi, 'listTeachingAssignments').mockResolvedValue({
      data: [
        {
          id: 'assign-loaded-1',
          curriculumPlanId: 'plan-cs-2026',
          disciplineTitle: 'Комп’ютерні мережі',
          teachingType: 'LECTURE',
          academicHours: 32,
          teacherId: 'teacher-10',
          groupId: 'group-1',
          isSaturdayOnly: false,
          hasLateSlotAuthorization: false,
        },
      ],
    });
    const updateSpy = vi.spyOn(timetableApi, 'updateTeachingAssignment').mockResolvedValue({
      data: {
        id: 'assign-loaded-1',
        curriculumPlanId: 'plan-cs-2026',
        disciplineTitle: 'Кібербезпека',
        teachingType: 'LECTURE',
        academicHours: 32,
        teacherId: 'teacher-10',
        groupId: 'group-1',
        isSaturdayOnly: false,
        hasLateSlotAuthorization: false,
      },
    });
    const createSpy = vi.spyOn(timetableApi, 'createTeachingAssignment');
    const user = userEvent.setup();

    renderComponent();

    const loadedInput = await screen.findByDisplayValue('Комп’ютерні мережі');

    await user.clear(loadedInput);
    await user.type(loadedInput, 'Кібербезпека');

    await user.click(screen.getByRole('button', { name: /зберегти навантаження/i }));

    expect(updateSpy).toHaveBeenCalledWith(
      'assign-loaded-1',
      expect.objectContaining({
        curriculumPlanId: 'plan-cs-2026',
        disciplineTitle: 'Кібербезпека',
        teacherId: 'teacher-10',
      }),
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('deduplicates stream-1 in groupOrStreamOptions when API returns stream-1 in groups list', async () => {
    vi.spyOn(timetableApi, 'listAcademicGroups').mockResolvedValue({
      data: [
        { id: 'group-ks11', code: 'КС11', subgroups: [] },
        { id: 'stream-1', code: 'Потік 1', subgroups: [] },
      ],
    });

    renderComponent();

    await screen.findAllByRole('option', { name: 'КС11' });

    const firstSelect = screen.getAllByLabelText('Група / Потік')[0];
    const streamOptions = Array.from(firstSelect.querySelectorAll('option')).filter(
      (opt) => (opt as HTMLOptionElement).value === 'stream-1',
    );

    expect(streamOptions).toHaveLength(1);
  });

  it('displays error message and does not create fake candidates on draft generation failure', async () => {
    vi.spyOn(timetableApi, 'generateTimetableDraft').mockRejectedValue(
      new Error('Generation failed'),
    );
    const user = userEvent.setup();

    renderComponent();

    const generateBtn = screen.getByRole('button', { name: /згенерувати розклад/i });

    await waitFor(() => expect(generateBtn).toBeEnabled());
    await user.click(generateBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/не вдалося згенерувати розклад/i);
    expect(screen.queryByText(/діагностика генерації/i)).not.toBeInTheDocument();
  });

  it('displays error message and does not mark published when publishing fails', async () => {
    vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
      data: {
        versionId: 'ver-draft-101',
        candidates: [{ events: [], penaltyScore: 0 }],
        diagnostics: { statesExplored: 10, timeMs: 5 },
      },
    });
    vi.spyOn(timetableApi, 'publishTimetableVersion').mockRejectedValue(
      new Error('Publishing failed'),
    );
    const user = userEvent.setup();

    renderComponent();

    const generateBtn = screen.getByRole('button', { name: /згенерувати розклад/i });

    await waitFor(() => expect(generateBtn).toBeEnabled());
    await user.click(generateBtn);

    const publishBtn = screen.getByRole('button', { name: /затвердити та опублікувати/i });

    await user.click(publishBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/не вдалося опублікувати розклад/i);
    expect(screen.queryByText(/розклад успішно опубліковано/i)).not.toBeInTheDocument();
  });

  it('fetches available academic groups on mount', async () => {
    const listGroupsSpy = vi.spyOn(timetableApi, 'listAcademicGroups').mockResolvedValue({
      data: [
        {
          id: 'group-cs-11',
          code: 'КС11',
          subgroups: [
            { id: 'sub-cs-11-1', name: 'Підгрупа 1', academicGroupId: 'group-cs-11' },
            { id: 'sub-cs-11-2', name: 'Підгрупа 2', academicGroupId: 'group-cs-11' },
          ],
        },
      ],
    });

    renderComponent();

    expect(listGroupsSpy).toHaveBeenCalled();
    expect(await screen.findAllByRole('option', { name: 'КС11' })).not.toHaveLength(0);
  });

  it('allows selecting group and subgroup and passes them to createTeachingAssignment', async () => {
    vi.spyOn(timetableApi, 'listAcademicGroups').mockResolvedValue({
      data: [
        {
          id: 'group-cs-11',
          code: 'КС11',
          subgroups: [
            { id: 'sub-cs-11-1', name: 'Підгрупа 1', academicGroupId: 'group-cs-11' },
            { id: 'sub-cs-11-2', name: 'Підгрупа 2', academicGroupId: 'group-cs-11' },
          ],
        },
        {
          id: 'group-cs-12',
          code: 'КС12',
          subgroups: [
            { id: 'sub-cs-12-1', name: 'Підгрупа 1', academicGroupId: 'group-cs-12' },
            { id: 'sub-cs-12-2', name: 'Підгрупа 2', academicGroupId: 'group-cs-12' },
          ],
        },
      ],
    });
    const createSpy = vi.spyOn(timetableApi, 'createTeachingAssignment').mockResolvedValue({
      data: {
        id: 'assign-1',
        curriculumPlanId: 'plan-cs-2026',
        disciplineTitle: 'Паралельні та розподілені обчислення',
        teachingType: 'LECTURE',
        academicHours: 32,
        teacherId: 'teacher-1',
        groupId: 'group-cs-12',
        subgroupId: 'sub-cs-12-1',
        isSaturdayOnly: false,
        hasLateSlotAuthorization: false,
      },
    });
    const user = userEvent.setup();

    renderComponent();

    await waitFor(() =>
      expect(screen.getAllByRole('option', { name: 'КС12' })[0]).toHaveValue('group-cs-12'),
    );
    const groupSelects = screen.getAllByLabelText('Група / Потік');
    const subgroupSelects = screen.getAllByLabelText('Підгрупа');

    await user.selectOptions(groupSelects[0], 'group-cs-12');
    await user.selectOptions(subgroupSelects[0], '1');

    await user.click(screen.getByRole('button', { name: /зберегти навантаження/i }));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'group-cs-12',
        subgroupId: 'sub-cs-12-1',
      }),
    );
  });

  it('allows selecting stream, disables subgroup select, and sends streamId', async () => {
    const createSpy = vi.spyOn(timetableApi, 'createTeachingAssignment').mockResolvedValue({
      data: {
        id: 'assign-stream-1',
        curriculumPlanId: 'plan-cs-2026',
        disciplineTitle: 'Паралельні та розподілені обчислення',
        teachingType: 'LECTURE',
        academicHours: 32,
        teacherId: 'teacher-1',
        streamId: 'stream-1',
        isSaturdayOnly: false,
        hasLateSlotAuthorization: false,
      },
    });
    const user = userEvent.setup();

    renderComponent();

    const groupSelects = screen.getAllByLabelText('Група / Потік');
    const subgroupSelects = screen.getAllByLabelText('Підгрупа');

    await user.selectOptions(groupSelects[0], 'stream-1');

    expect(subgroupSelects[0]).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /зберегти навантаження/i }));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        streamId: 'stream-1',
        groupId: undefined,
        subgroupId: undefined,
      }),
    );
  });

  it('renders weekly schedule preview grid for the selected candidate and supports durationMs fallback', async () => {
    vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
      data: {
        versionId: 'ver-cand-1',
        candidates: [
          {
            versionId: 'ver-cand-1',
            candidateIndex: 0,
            penaltyScore: 0,
            events: [
              {
                id: 'ev-1',
                teachingAssignmentId: 'assign-1',
                disciplineTitle: 'Архітектура хмарних систем',
                teachingType: 'LECTURE',
                teacherId: 'teacher-cloud',
                groupIds: ['group-1'],
                streamId: 'stream-cs',
                date: '2026-09-07',
                pair: 1,
                isSaturdayOnly: true,
              },
            ],
          },
          {
            versionId: 'ver-cand-2',
            candidateIndex: 1,
            penaltyScore: 10,
            events: [
              {
                id: 'ev-2',
                teachingAssignmentId: 'assign-2',
                disciplineTitle: 'Безпека мереж',
                teachingType: 'LABORATORY',
                teacherId: 'teacher-sec',
                groupIds: ['group-2'],
                subgroupId: 'subgroup-3',
                date: '2026-09-08',
                pair: 2,
              },
            ],
          },
        ],
        diagnostics: {
          statesExplored: 42,
          durationMs: 27,
        } as unknown as { statesExplored: number; timeMs: number },
      },
    });
    const user = userEvent.setup();

    renderComponent();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /згенерувати розклад/i })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: /згенерувати розклад/i }));

    expect(screen.getByText('27 ms')).toBeInTheDocument();
    expect(screen.getByText(/тижневий розклад обраного варіанта/i)).toBeInTheDocument();
    expect(screen.getByText('Пн')).toBeInTheDocument();
    expect(screen.getByText('08:30–09:50')).toBeInTheDocument();
    expect(screen.getByText('Архітектура хмарних систем')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: /тижневий розклад/i })).getByText('teacher-cloud'),
    ).toBeInTheDocument();
    expect(screen.getByText('Потік: stream-cs')).toBeInTheDocument();

    await user.click(screen.getByText(/варіант #2/i));

    expect(screen.getByText('Безпека мереж')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: /тижневий розклад/i })).getByText('teacher-sec'),
    ).toBeInTheDocument();
  });
  it('creates a curriculum plan from the dialog and switches to it', async () => {
    vi.spyOn(timetableApi, 'importCurriculumPlan').mockResolvedValue({
      data: {
        id: 'plan-new',
        faculty: 'ННІ КН та ШІ',
        title: 'Новий план',
        academicYear: '2026/2027',
        semester: 2,
        isDraft: true,
      },
    });
    const listAssignments = vi.spyOn(timetableApi, 'listTeachingAssignments');
    const user = userEvent.setup();

    renderComponent();
    await waitFor(() => expect(screen.getByRole('button', { name: /Додати план/i })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /Додати план/i }));

    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText('Назва плану'), 'Новий план');
    await user.click(within(dialog).getByRole('button', { name: 'Створити план' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Навчальний план')).toHaveValue('plan-new');
    await waitFor(() => expect(listAssignments).toHaveBeenLastCalledWith('plan-new'));
  });

  it("tints the preview with the chosen teacher's slots and flags undesirable placements", async () => {
    vi.spyOn(timetableApi, 'listSemesterSlotPreferences').mockResolvedValue({
      data: [
        {
          teacherId: 'teacher-1',
          semesterCalendarId: 'calendar-1',
          weekday: 1,
          pair: 1,
          preference: 'UNDESIRABLE',
        },
        {
          teacherId: 'teacher-1',
          semesterCalendarId: 'calendar-1',
          weekday: 1,
          pair: 2,
          preference: 'PREFERRED',
        },
      ],
    });
    vi.spyOn(timetableApi, 'generateTimetableDraft').mockResolvedValue({
      data: {
        versionId: 'version-1',
        candidates: [
          {
            versionId: 'version-1',
            penaltyScore: 0,
            events: [
              {
                id: 'ev-1',
                teachingAssignmentId: 'assign-1',
                disciplineTitle: 'Чисельні методи',
                teachingType: 'LECTURE',
                teacherId: 'teacher-1',
                groupIds: ['group-1'],
                date: '2026-09-07',
                pair: 1,
              },
            ],
          },
        ],
        diagnostics: { statesExplored: 1, timeMs: 1 },
      },
    });
    const user = userEvent.setup();

    renderComponent();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /згенерувати розклад/i })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: /згенерувати розклад/i }));

    expect(await screen.findByText('Небажаний слот')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Подоляка О.М.' }));

    const grid = screen.getByRole('region', { name: /тижневий розклад/i });
    const mondayCells = within(grid)
      .getAllByRole('row')
      .slice(1, 3)
      .map((row) => row.querySelectorAll('td')[0]);

    expect(mondayCells[0]?.className).toContain('undesirable');
    expect(mondayCells[1]?.className).toContain('preferred');
    expect(screen.getByText('Бажаний час')).toBeInTheDocument();
  });
});
