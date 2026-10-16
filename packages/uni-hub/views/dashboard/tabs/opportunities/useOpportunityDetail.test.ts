import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@uni-hub/types';
import { useOpportunityDetail } from './useOpportunityDetail';

const { mockToast, mockOpportunitiesApi } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  mockOpportunitiesApi: {
    changeStatus: vi.fn(),
    changeLifecycle: vi.fn(),
  },
}));

vi.mock('@una', () => ({
  useToast: () => mockToast,
}));

vi.mock('@uni-hub/services/api.opportunities', () => ({
  opportunitiesApi: mockOpportunitiesApi,
}));

const mockOpportunity: Opportunity = {
  id: 'opp-1',
  title: 'Research Assistant',
  description: 'AI & Data Science internship',
  ownerContactInfo: 'prof@karazin.ua',
  status: 'DRAFT',
  lifecycleState: 'ACTIVE',
  paymentType: 'PAID',
  paymentDetails: '500$ / month',
  ownerId: 'user-admin-1',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(LanguageProvider, null, children);

describe('useOpportunityDetail hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('universe-lang', 'en');
  });

  it('should initialize with null selectedOpportunity and isOpen false', () => {
    const { result } = renderHook(() => useOpportunityDetail(), { wrapper });

    expect(result.current.selectedOpportunity).toBeNull();
    expect(result.current.isOpen).toBe(false);
  });

  it('should set selectedOpportunity and open detail on open(opportunity)', () => {
    const { result } = renderHook(() => useOpportunityDetail(), { wrapper });

    act(() => {
      result.current.open(mockOpportunity);
    });

    expect(result.current.selectedOpportunity).toEqual(mockOpportunity);
    expect(result.current.isOpen).toBe(true);
  });

  it('should update isOpen state when setIsOpen is called', () => {
    const { result } = renderHook(() => useOpportunityDetail(), { wrapper });

    act(() => {
      result.current.setIsOpen(true);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.setIsOpen(false);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should call opportunitiesApi.changeStatus and update status on handleSendToReview', async () => {
    mockOpportunitiesApi.changeStatus.mockResolvedValueOnce({ success: true });

    const onOpportunityUpdated = vi.fn();
    const { result } = renderHook(() => useOpportunityDetail(onOpportunityUpdated), { wrapper });

    act(() => {
      result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleSendToReview('opp-1');
    });

    expect(mockOpportunitiesApi.changeStatus).toHaveBeenCalledWith('opp-1', 'READY_FOR_REVIEW');
    expect(mockToast.success).toHaveBeenCalledWith('Opportunity sent for moderation!');
    expect(onOpportunityUpdated).toHaveBeenCalledTimes(1);
    expect(result.current.selectedOpportunity?.status).toBe('READY_FOR_REVIEW');
  });

  it('should show error toast when handleSendToReview fails', async () => {
    mockOpportunitiesApi.changeStatus.mockRejectedValueOnce(new Error('Moderation request failed'));

    const onOpportunityUpdated = vi.fn();
    const { result } = renderHook(() => useOpportunityDetail(onOpportunityUpdated), { wrapper });

    act(() => {
      result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleSendToReview('opp-1');
    });

    expect(mockOpportunitiesApi.changeStatus).toHaveBeenCalledWith('opp-1', 'READY_FOR_REVIEW');
    expect(mockToast.error).toHaveBeenCalledWith('Moderation request failed');
    expect(onOpportunityUpdated).not.toHaveBeenCalled();
    expect(result.current.selectedOpportunity?.status).toBe('DRAFT');
  });

  it('should show fallback generic error toast when handleSendToReview fails with non-Error object', async () => {
    mockOpportunitiesApi.changeStatus.mockRejectedValueOnce('Network error');

    const { result } = renderHook(() => useOpportunityDetail(), { wrapper });

    await act(async () => {
      await result.current.handleSendToReview('opp-1');
    });

    expect(mockToast.error).toHaveBeenCalledWith('Error');
  });

  it('should not update selectedOpportunity status when handleSendToReview is called with non-matching id', async () => {
    mockOpportunitiesApi.changeStatus.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useOpportunityDetail(), { wrapper });

    act(() => {
      result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleSendToReview('non-matching-id');
    });

    expect(result.current.selectedOpportunity?.id).toBe('opp-1');
    expect(result.current.selectedOpportunity?.status).toBe('DRAFT');
  });

  it('should call opportunitiesApi.changeLifecycle and update lifecycle on handleLifecycleChange', async () => {
    mockOpportunitiesApi.changeLifecycle.mockResolvedValueOnce({ success: true });

    const onOpportunityUpdated = vi.fn();
    const { result } = renderHook(() => useOpportunityDetail(onOpportunityUpdated), { wrapper });

    act(() => {
      result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleLifecycleChange('opp-1', 'COMPLETED');
    });

    expect(mockOpportunitiesApi.changeLifecycle).toHaveBeenCalledWith('opp-1', 'COMPLETED');
    expect(mockToast.success).toHaveBeenCalledWith('Project state updated');
    expect(onOpportunityUpdated).toHaveBeenCalledTimes(1);
    expect(result.current.selectedOpportunity?.lifecycleState).toBe('COMPLETED');
  });

  it('should show error toast when handleLifecycleChange fails', async () => {
    mockOpportunitiesApi.changeLifecycle.mockRejectedValueOnce(
      new Error('Lifecycle state invalid'),
    );

    const onOpportunityUpdated = vi.fn();
    const { result } = renderHook(() => useOpportunityDetail(onOpportunityUpdated), { wrapper });

    act(() => {
      result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleLifecycleChange('opp-1', 'PAUSED');
    });

    expect(mockOpportunitiesApi.changeLifecycle).toHaveBeenCalledWith('opp-1', 'PAUSED');
    expect(mockToast.error).toHaveBeenCalledWith('Lifecycle state invalid');
    expect(onOpportunityUpdated).not.toHaveBeenCalled();
    expect(result.current.selectedOpportunity?.lifecycleState).toBe('ACTIVE');
  });

  it('should show fallback generic error toast when handleLifecycleChange fails with non-Error object', async () => {
    mockOpportunitiesApi.changeLifecycle.mockRejectedValueOnce({ statusCode: 500 });

    const { result } = renderHook(() => useOpportunityDetail(), { wrapper });

    await act(async () => {
      await result.current.handleLifecycleChange('opp-1', 'CANCELLED');
    });

    expect(mockToast.error).toHaveBeenCalledWith('Error');
  });

  it('should not update selectedOpportunity lifecycle when handleLifecycleChange is called with non-matching id', async () => {
    mockOpportunitiesApi.changeLifecycle.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useOpportunityDetail(), { wrapper });

    act(() => {
      result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleLifecycleChange('non-matching-id', 'PAUSED');
    });

    expect(result.current.selectedOpportunity?.id).toBe('opp-1');
    expect(result.current.selectedOpportunity?.lifecycleState).toBe('ACTIVE');
  });

  it('should safely execute actions when onOpportunityUpdated callback is omitted', async () => {
    mockOpportunitiesApi.changeStatus.mockResolvedValueOnce({ success: true });
    mockOpportunitiesApi.changeLifecycle.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useOpportunityDetail(), { wrapper });

    act(() => {
      result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleSendToReview('opp-1');
      await result.current.handleLifecycleChange('opp-1', 'PAUSED');
    });

    expect(result.current.selectedOpportunity?.status).toBe('READY_FOR_REVIEW');
    expect(result.current.selectedOpportunity?.lifecycleState).toBe('PAUSED');
  });
});
