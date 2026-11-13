import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withLanguage, withQueryClient, withToast } from '@uni-hub/utils/test-utils';
import { TeacherSlotPreferences } from './TeacherSlotPreferences';

const api = vi.hoisted(() => ({
  listPreferenceSemesters: vi.fn(),
  getMySlotPreferences: vi.fn(),
  saveMySlotPreferences: vi.fn(),
}));

vi.mock('../../services/api.timetable', () => ({
  timetableApi: api,
}));

const media = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@uni-hub/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.isMobile }));

function renderPreferences() {
  return render(withQueryClient(withToast(withLanguage(<TeacherSlotPreferences />))));
}

describe('TeacherSlotPreferences', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'en');
    vi.clearAllMocks();
    media.isMobile = false;

    api.listPreferenceSemesters.mockResolvedValue({
      data: [{ id: 'semester-1', academicYear: '2026/2027', semester: 1 }],
    });
    api.getMySlotPreferences.mockResolvedValue({ data: [] });
    api.saveMySlotPreferences.mockResolvedValue({
      data: [{ weekday: 1, pair: 1, preference: 'PREFERRED' }],
    });
  });

  it('cycles Neutral -> Preferred -> Undesirable -> Neutral and saves', async () => {
    const user = userEvent.setup();

    renderPreferences();

    await waitFor(() => {
      expect(api.getMySlotPreferences).toHaveBeenCalledWith('semester-1');
    });

    const cell = screen.getByRole('button', { name: /Mon.*1.*Neutral/i });

    await user.click(cell);
    expect(cell).toHaveAccessibleName(/Preferred/i);

    await user.click(cell);
    expect(cell).toHaveAccessibleName(/Undesirable/i);

    await user.click(cell);
    expect(cell).toHaveAccessibleName(/Neutral/i);

    await user.click(cell);
    await user.click(screen.getByRole('button', { name: /Apply preferences/i }));

    expect(api.saveMySlotPreferences).toHaveBeenCalledWith('semester-1', {
      slots: [{ weekday: 1, pair: 1, preference: 'PREFERRED' }],
    });
    expect(await screen.findByText('Preferences saved successfully')).toBeInTheDocument();
  });

  it('locks semester switch while dirty, allows discarding edits, and keeps failed saves', async () => {
    api.listPreferenceSemesters.mockResolvedValue({
      data: [
        { id: 'semester-1', academicYear: '2026/2027', semester: 1 },
        { id: 'semester-2', academicYear: '2026/2027', semester: 2 },
      ],
    });
    api.saveMySlotPreferences.mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();

    renderPreferences();

    await waitFor(() => {
      expect(api.getMySlotPreferences).toHaveBeenCalledWith('semester-1');
    });

    const cell = screen.getByRole('button', { name: /Mon.*1.*Neutral/i });
    const select = screen.getByRole('combobox');

    await user.click(cell);
    expect(select).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Apply preferences/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to load or save preferences',
    );
    expect(cell).toHaveAccessibleName(/Preferred/i);

    await user.click(screen.getByRole('button', { name: /Discard changes/i }));
    expect(cell).toHaveAccessibleName(/Neutral/i);
    expect(select).toBeEnabled();

    await user.selectOptions(select, 'semester-2');
    expect(api.getMySlotPreferences).toHaveBeenCalledWith('semester-2');
  });

  it('lets a phone pick an explicit preference per pair, one day at a time', async () => {
    media.isMobile = true;
    const user = userEvent.setup();

    renderPreferences();
    await waitFor(() => expect(api.getMySlotPreferences).toHaveBeenCalledWith('semester-1'));

    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Tue' }));

    const secondPair = screen.getByRole('radiogroup', { name: 'Tue, 2' });

    expect(within(secondPair).getByRole('radio', { name: 'Neutral' })).toBeChecked();

    await user.click(within(secondPair).getByRole('radio', { name: 'Undesirable' }));
    await user.click(screen.getByRole('button', { name: /Apply preferences/i }));

    expect(api.saveMySlotPreferences).toHaveBeenCalledWith('semester-1', {
      slots: [{ weekday: 2, pair: 2, preference: 'UNDESIRABLE' }],
    });
  });
});
