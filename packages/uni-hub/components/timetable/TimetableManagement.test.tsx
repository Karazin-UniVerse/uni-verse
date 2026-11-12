import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { timetableApi } from '@uni-hub/services/api.timetable';
import { TimetableManagement } from './TimetableManagement';

describe('TimetableManagement component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(timetableApi, 'listTeachingAssignments').mockResolvedValue({ data: [] });
  });

  const renderComponent = (props = {}) => render(withLanguage(<TimetableManagement {...props} />));

  it('renders plan ID, workload table headers, and initial workload rows', () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { level: 2, name: /керування розкладом/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('plan-cs-2026')).toBeInTheDocument();
    expect(screen.getByText('Дисципліна')).toBeInTheDocument();
    expect(screen.getByText('Тип')).toBeInTheDocument();
    expect(screen.getByText('Години')).toBeInTheDocument();
    expect(screen.getByText('Викладач')).toBeInTheDocument();
    expect(screen.getByText('Лише субота')).toBeInTheDocument();
    expect(screen.getByText('Пізні пари')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Паралельні та розподілені обчислення')).toBeInTheDocument();
  });

  it('allows adding and removing workload rows', async () => {
    const user = userEvent.setup();

    renderComponent();

    const addBtn = screen.getByRole('button', { name: /додати навантаження/i });

    await user.click(addBtn);

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

    await user.click(screen.getByRole('button', { name: /згенерувати розклад/i }));
    await user.click(screen.getByText(/варіант #2/i));
    await user.click(screen.getByRole('button', { name: /затвердити та опублікувати/i }));

    expect(publishSpy).toHaveBeenCalledWith('ver-cand-2');
  });

  it('loads assignments from listTeachingAssignments and persists edited workload via createTeachingAssignment', async () => {
    vi.spyOn(timetableApi, 'listTeachingAssignments').mockResolvedValue({
      data: [
        {
          id: 'assign-loaded-1',
          curriculumPlanId: 'plan-cs-2026',
          disciplineTitle: 'Комп’ютерні мережі',
          teachingType: 'LECTURE',
          academicHours: 32,
          teacherId: 'teacher-10',
          isSaturdayOnly: false,
          hasLateSlotAuthorization: false,
        },
      ],
    });
    const createSpy = vi.spyOn(timetableApi, 'createTeachingAssignment').mockResolvedValue({
      data: {
        id: 'assign-created-2',
        curriculumPlanId: 'plan-cs-2026',
        disciplineTitle: 'Кібербезпека',
        teachingType: 'LECTURE',
        academicHours: 32,
        teacherId: 'teacher-10',
        isSaturdayOnly: false,
        hasLateSlotAuthorization: false,
      },
    });
    const user = userEvent.setup();

    renderComponent();

    const loadedInput = await screen.findByDisplayValue('Комп’ютерні мережі');

    await user.clear(loadedInput);
    await user.type(loadedInput, 'Кібербезпека');

    await user.click(screen.getByRole('button', { name: /зберегти навантаження/i }));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        curriculumPlanId: 'plan-cs-2026',
        disciplineTitle: 'Кібербезпека',
        teacherId: 'teacher-10',
      }),
    );
  });

  it('displays error message and does not create fake candidates on draft generation failure', async () => {
    vi.spyOn(timetableApi, 'generateTimetableDraft').mockRejectedValue(
      new Error('Generation failed'),
    );
    const user = userEvent.setup();

    renderComponent();

    const generateBtn = screen.getByRole('button', { name: /згенерувати розклад/i });

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

    await user.click(generateBtn);

    const publishBtn = screen.getByRole('button', { name: /затвердити та опублікувати/i });

    await user.click(publishBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/не вдалося опублікувати розклад/i);
    expect(screen.queryByText(/розклад успішно опубліковано/i)).not.toBeInTheDocument();
  });
});
