import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { endSession } from '@uni-hub/services/api.session';
import { useDashboardErrorHandling } from './useDashboardErrorHandling';

const mockReplace = vi.fn();
const mockToast = {
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: vi.fn() }),
}));

vi.mock('@una', () => ({
  useToast: () => mockToast,
}));

vi.mock('@uni-hub/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    formatMessage: (key: string) => key,
  }),
}));

vi.mock('@uni-hub/services/api.session', () => ({
  endSession: vi.fn(),
}));

const mockStorage: Record<string, string> = {};

vi.mock('@uni-hub/services/api', () => ({
  safeStorage: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
  },
}));

vi.mock('./helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./helpers')>();

  return {
    ...actual,
    isMoodleUnlinked: () => mockStorage.isMoodleLinked === 'false',
  };
});

describe('useDashboardErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete mockStorage.isMoodleLinked;
  });

  it('handles 401 platform error by showing toast, ending session and replacing to /login', () => {
    const platformError = new Error('HTTP error 401: Unauthorized');

    renderHook(() =>
      useDashboardErrorHandling({
        error: null,
        errorUpdatedAt: 0,
        isOfflineData: false,
        platformError,
      }),
    );

    expect(mockToast.error).toHaveBeenCalledWith('dashboard.sessionExpired');
    expect(endSession).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('handles 401 dashboard error by showing toast, ending session and replacing to /login', () => {
    const error = new Error('HTTP error 401: Unauthorized');

    renderHook(() =>
      useDashboardErrorHandling({
        error,
        errorUpdatedAt: 1000,
        isOfflineData: false,
        platformError: null,
      }),
    );

    expect(mockToast.error).toHaveBeenCalledWith('dashboard.sessionExpired');
    expect(endSession).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('shows offline notice toast when non-auth error occurs with offline data', () => {
    const error = new Error('Network failure');

    renderHook(() =>
      useDashboardErrorHandling({
        error,
        errorUpdatedAt: 1000,
        isOfflineData: true,
        platformError: null,
      }),
    );

    expect(mockToast.info).toHaveBeenCalledWith('dashboard.offlineNotice');
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows load error toast when non-auth error occurs without offline data', () => {
    const error = new Error('Internal Server Error');

    renderHook(() =>
      useDashboardErrorHandling({
        error,
        errorUpdatedAt: 1000,
        isOfflineData: false,
        platformError: null,
      }),
    );

    expect(mockToast.error).toHaveBeenCalledWith('dashboard.loadError');
  });

  it('suppresses dashboard error toasts when Moodle is unlinked', () => {
    mockStorage.isMoodleLinked = 'false';
    const error = new Error('Cannot fetch courses');

    renderHook(() =>
      useDashboardErrorHandling({
        error,
        errorUpdatedAt: 1000,
        isOfflineData: false,
        platformError: null,
      }),
    );

    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockToast.info).not.toHaveBeenCalled();
  });

  it('does not re-trigger error toast when errorUpdatedAt does not change', () => {
    const error = new Error('Server Error');

    const { rerender } = renderHook(
      ({ updatedAt }) =>
        useDashboardErrorHandling({
          error,
          errorUpdatedAt: updatedAt,
          isOfflineData: false,
          platformError: null,
        }),
      { initialProps: { updatedAt: 1000 } },
    );

    expect(mockToast.error).toHaveBeenCalledTimes(1);

    rerender({ updatedAt: 1000 });

    expect(mockToast.error).toHaveBeenCalledTimes(1);
  });
});
