import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardRefresh } from './useDashboardRefresh';

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@una', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
  }),
}));

vi.mock('@uni-hub/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    formatMessage: (key: string) => key,
  }),
}));

describe('useDashboardRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('refetches only platform data when enabled is false and shows success toast', async () => {
    const refetchDashboard = vi.fn().mockResolvedValue({ isError: false });
    const refetchPlatform = vi.fn().mockResolvedValue({ isError: false });

    const { result } = renderHook(() =>
      useDashboardRefresh({
        enabled: false,
        refetchDashboard,
        refetchPlatform,
      }),
    );

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.manualSyncTime).toBeNull();

    await act(async () => {
      await result.current.refresh();
    });

    expect(refetchPlatform).toHaveBeenCalledTimes(1);
    expect(refetchDashboard).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith('dashboard.syncSuccess');
    expect(result.current.manualSyncTime).toBeGreaterThan(0);
    expect(result.current.isRefreshing).toBe(false);
    expect(localStorage.getItem('universe_last_sync_time')).toBe(
      String(result.current.manualSyncTime),
    );
  });

  it('handles platform error when enabled is false and shows error toast', async () => {
    const refetchDashboard = vi.fn().mockResolvedValue({ isError: false });
    const refetchPlatform = vi.fn().mockResolvedValue({ isError: true });

    const { result } = renderHook(() =>
      useDashboardRefresh({
        enabled: false,
        refetchDashboard,
        refetchPlatform,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(refetchPlatform).toHaveBeenCalledTimes(1);
    expect(refetchDashboard).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith('dashboard.loadError');
    expect(result.current.manualSyncTime).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
  });

  it('refetches both dashboard and platform when enabled is true and shows success toast', async () => {
    const refetchDashboard = vi.fn().mockResolvedValue({ isError: false });
    const refetchPlatform = vi.fn().mockResolvedValue({ isError: false });

    const { result } = renderHook(() =>
      useDashboardRefresh({
        enabled: true,
        refetchDashboard,
        refetchPlatform,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(refetchDashboard).toHaveBeenCalledTimes(1);
    expect(refetchPlatform).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith('dashboard.syncSuccess');
    expect(result.current.manualSyncTime).toBeGreaterThan(0);
    expect(result.current.isRefreshing).toBe(false);
  });

  it('handles dashboard refetch failure when enabled is true and shows error toast', async () => {
    const refetchDashboard = vi.fn().mockResolvedValue({ isError: true });
    const refetchPlatform = vi.fn().mockResolvedValue({ isError: false });

    const { result } = renderHook(() =>
      useDashboardRefresh({
        enabled: true,
        refetchDashboard,
        refetchPlatform,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(refetchDashboard).toHaveBeenCalledTimes(1);
    expect(refetchPlatform).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith('dashboard.loadError');
    expect(result.current.manualSyncTime).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
  });

  it('handles localStorage exceptions gracefully in private browsing mode', async () => {
    const refetchDashboard = vi.fn().mockResolvedValue({ isError: false });
    const refetchPlatform = vi.fn().mockResolvedValue({ isError: false });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() =>
      useDashboardRefresh({
        enabled: false,
        refetchDashboard,
        refetchPlatform,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('dashboard.syncSuccess');
    expect(result.current.manualSyncTime).toBeGreaterThan(0);
  });
});
