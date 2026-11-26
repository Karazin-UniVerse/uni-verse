import { act, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppProvidersWrapper, createTestQueryClient } from '@uni-hub/utils/test-utils';
import { useWithdrawApplication } from './useWithdrawApplication';

const { withdrawApplication } = vi.hoisted(() => ({ withdrawApplication: vi.fn() }));

vi.mock('@uni-hub/services/api.opportunities', () => ({
  opportunitiesApi: { withdrawApplication },
}));

describe('useWithdrawApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should show a localized toast when the re-apply limit is reached', async () => {
    withdrawApplication.mockRejectedValueOnce(
      new Error('opportunities.errors.reapplyLimitReached (HTTP 400)'),
    );
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useWithdrawApplication(), {
      wrapper: createAppProvidersWrapper(queryClient),
    });

    act(() => result.current.setWithdrawApplicationId('app-1'));
    await act(async () => result.current.handleWithdraw());

    expect(
      screen.getByText(
        'Ви вже подавали відгук на цю можливість повторно максимальну кількість разів (3).',
      ),
    ).toBeInTheDocument();
    expect(result.current.withdrawApplicationId).toBeNull();
    expect(invalidateQueries).toHaveBeenCalled();
  });
});
