import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkMoodleMode } from '@uni-hub/components/auth';
import { useMoodleStore } from './useMoodleStore';

const mockStorage = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

  return {} as Record<string, string>;
});

vi.mock('@uni-hub/utils/browser', () => ({
  isBrowser: true,
}));

vi.mock('@uni-hub/services/api', () => ({
  safeStorage: {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
  },
}));

describe('useMoodleStore', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }

    useMoodleStore.setState(useMoodleStore.getInitialState());
  });

  it('starts with empty assignment filters and closed modals', () => {
    const state = useMoodleStore.getState();

    expect(state.dateFrom).toBe('');
    expect(state.dateTo).toBe('');
    expect(state.sortOrder).toBe('asc');
    expect(state.hideCompleted).toBe(false);
    expect(state.isLinkModalOpen).toBe(false);
    expect(state.isUnlinkModalOpen).toBe(false);
    expect(state.linkModalMode).toBe(LinkMoodleMode.CONNECT);
  });

  it('updates the assignment filters', () => {
    const { setDateFrom, setDateTo, setSortOrder, setHideCompleted } = useMoodleStore.getState();

    setDateFrom('2026-09-01');
    setDateTo('2026-09-30');
    setSortOrder('desc');
    setHideCompleted(true);

    const state = useMoodleStore.getState();

    expect(state.dateFrom).toBe('2026-09-01');
    expect(state.dateTo).toBe('2026-09-30');
    expect(state.sortOrder).toBe('desc');
    expect(state.hideCompleted).toBe(true);
  });

  it('opens the link modal in the requested mode and closes it', () => {
    useMoodleStore.getState().openLinkModal(LinkMoodleMode.CHANGE);

    expect(useMoodleStore.getState().isLinkModalOpen).toBe(true);
    expect(useMoodleStore.getState().linkModalMode).toBe(LinkMoodleMode.CHANGE);

    useMoodleStore.getState().closeLinkModal();

    expect(useMoodleStore.getState().isLinkModalOpen).toBe(false);
  });

  it('opens the link modal in connect mode by default', () => {
    useMoodleStore.getState().openLinkModal();

    expect(useMoodleStore.getState().linkModalMode).toBe(LinkMoodleMode.CONNECT);
  });

  it('opens and closes the unlink modal', () => {
    useMoodleStore.getState().openUnlinkModal();

    expect(useMoodleStore.getState().isUnlinkModalOpen).toBe(true);

    useMoodleStore.getState().closeUnlinkModal();

    expect(useMoodleStore.getState().isUnlinkModalOpen).toBe(false);
  });

  it('marks Moodle as linked, closes the link modal and stores the flag', () => {
    useMoodleStore.setState({ isMoodleLinked: false, isLinkModalOpen: true });

    useMoodleStore.getState().completeLink();

    expect(useMoodleStore.getState().isMoodleLinked).toBe(true);
    expect(useMoodleStore.getState().isLinkModalOpen).toBe(false);
    expect(mockStorage.isMoodleLinked).toBe('true');
  });

  it('marks Moodle as unlinked, closes the unlink modal and stores the flag', () => {
    useMoodleStore.setState({ isMoodleLinked: true, isUnlinkModalOpen: true });

    useMoodleStore.getState().completeUnlink();

    expect(useMoodleStore.getState().isMoodleLinked).toBe(false);
    expect(useMoodleStore.getState().isUnlinkModalOpen).toBe(false);
    expect(mockStorage.isMoodleLinked).toBe('false');
  });

  it('reads the linked flag from storage and treats a missing flag as linked', () => {
    mockStorage.isMoodleLinked = 'false';
    useMoodleStore.getState().syncLinkedFromStorage();

    expect(useMoodleStore.getState().isMoodleLinked).toBe(false);

    delete mockStorage.isMoodleLinked;
    useMoodleStore.getState().syncLinkedFromStorage();

    expect(useMoodleStore.getState().isMoodleLinked).toBe(true);
  });
});
