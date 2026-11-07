import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { QUERY_STALE_TIME_MS } from '@uni-hub/constants/query';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useOpportunitiesStore } from '@uni-hub/store/useOpportunitiesStore';
import { createQueryClientWrapper } from '@uni-hub/utils/test-utils';
import { OPPORTUNITY_SUB_TAB } from '../constants';
import { buildOpportunity } from '../test-utils';
import { useOpportunitiesData } from './useOpportunitiesData';

describe('useOpportunitiesData catalog synchronization', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    useOpportunitiesStore.getState().reset();
    focusManager.setFocused(true);
    queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: QUERY_STALE_TIME_MS, retry: false } },
    });
    vi.spyOn(opportunitiesApi, 'getMyOpportunities').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    focusManager.setFocused(undefined);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should pick up an externally published opportunity without manual refresh', async () => {
    const opportunity = buildOpportunity('published');
    const getCatalog = vi
      .spyOn(opportunitiesApi, 'getOpportunities')
      .mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useOpportunitiesData(false), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.catalog.loading).toBe(false);
    getCatalog.mockResolvedValue({ data: [opportunity] });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.catalog.items).toEqual([opportunity]);
    expect(result.current.catalog.loading).toBe(false);
  });

  it('should refresh immediately when reopening a recently cached catalog', async () => {
    const opportunity = buildOpportunity('published');
    const getCatalog = vi
      .spyOn(opportunitiesApi, 'getOpportunities')
      .mockResolvedValue({ data: [] });
    const firstVisit = renderHook(() => useOpportunitiesData(false), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(firstVisit.result.current.catalog.loading).toBe(false);
    firstVisit.unmount();
    getCatalog.mockResolvedValue({ data: [opportunity] });

    const nextVisit = renderHook(() => useOpportunitiesData(false), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(nextVisit.result.current.catalog.items).toEqual([opportunity]);
  });

  it('should stop polling outside the catalog and refresh on returning to it', async () => {
    const opportunity = buildOpportunity('published');
    const getCatalog = vi
      .spyOn(opportunitiesApi, 'getOpportunities')
      .mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useOpportunitiesData(false), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.catalog.loading).toBe(false);
    getCatalog.mockResolvedValue({ data: [opportunity] });

    act(() =>
      useOpportunitiesStore.getState().setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    act(() => useOpportunitiesStore.getState().setActiveSubTab(OPPORTUNITY_SUB_TAB.Catalog));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(result.current.catalog.items).toEqual([opportunity]);

    act(() =>
      useOpportunitiesStore.getState().setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(getCatalog).toHaveBeenCalledTimes(2);
  });

  it('should not poll while the browser window is hidden', async () => {
    const getCatalog = vi
      .spyOn(opportunitiesApi, 'getOpportunities')
      .mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useOpportunitiesData(false), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.catalog.loading).toBe(false);
    focusManager.setFocused(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(getCatalog).toHaveBeenCalledTimes(1);
  });

  it('should refresh the catalog when the browser window becomes visible again', async () => {
    const opportunity = buildOpportunity('published');
    const getCatalog = vi
      .spyOn(opportunitiesApi, 'getOpportunities')
      .mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useOpportunitiesData(false), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.catalog.loading).toBe(false);

    act(() => focusManager.setFocused(false));
    getCatalog.mockResolvedValue({ data: [opportunity] });
    expect(result.current.catalog.items).toEqual([]);
    expect(getCatalog).toHaveBeenCalledTimes(1);

    act(() => focusManager.setFocused(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(result.current.catalog.items).toEqual([opportunity]);
    expect(getCatalog).toHaveBeenCalledTimes(2);
  });

  it('should keep cached cards when a polling request fails and recover on the next poll', async () => {
    const opportunity = buildOpportunity('published');
    const getCatalog = vi
      .spyOn(opportunitiesApi, 'getOpportunities')
      .mockResolvedValue({ data: [opportunity] });
    const { result } = renderHook(() => useOpportunitiesData(false), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.catalog.items).toEqual([opportunity]);
    getCatalog.mockRejectedValueOnce(new Error('Catalog temporarily unavailable'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(result.current.catalog.items).toEqual([opportunity]);
    expect(result.current.catalog.isError).toBe(false);
    expect(result.current.catalog.loading).toBe(false);
    getCatalog.mockResolvedValue({ data: [] });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.catalog.items).toEqual([]);
  });
});
