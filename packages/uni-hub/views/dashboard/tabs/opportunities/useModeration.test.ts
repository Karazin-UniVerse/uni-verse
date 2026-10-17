import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import { useModeration } from './useModeration';

const { mockToast, mockOpportunitiesApi } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  mockOpportunitiesApi: {
    moderate: vi.fn(),
  },
}));

vi.mock('@una', () => ({
  useToast: () => mockToast,
}));

vi.mock('@uni-hub/services/api.opportunities', () => ({
  opportunitiesApi: mockOpportunitiesApi,
}));

const mockOpportunities: Opportunity[] = [
  {
    id: 'opp-1',
    title: 'Frontend Intern',
    description: 'React, TypeScript project for students',
    ownerContactInfo: 'hr@frontend.ua',
    status: 'READY_FOR_REVIEW',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '400$ / month',
    ownerId: 'user-1',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'opp-2',
    title: 'Backend Intern',
    description: 'Node.js, PostgreSQL project',
    ownerContactInfo: 'hr@backend.ua',
    status: 'READY_FOR_REVIEW',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '500$ / month',
    ownerId: 'user-2',
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(LanguageProvider, null, children);

describe('useModeration hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should initialize with closed reject modal and submitting false', () => {
    const mockSetQueue = vi.fn();

    const { result } = renderHook(() => useModeration(mockSetQueue), { wrapper });

    expect(result.current.rejectModal).toEqual({
      open: false,
      id: null,
      comment: '',
    });
    expect(result.current.submitting).toBe(false);
  });

  it('should open, update comment, and close reject modal', () => {
    const mockSetQueue = vi.fn();

    const { result } = renderHook(() => useModeration(mockSetQueue), { wrapper });

    act(() => {
      result.current.openRejectModal('opp-1');
    });

    expect(result.current.rejectModal).toEqual({
      open: true,
      id: 'opp-1',
      comment: '',
    });

    act(() => {
      result.current.changeRejectComment('Please add contact details');
    });

    expect(result.current.rejectModal).toEqual({
      open: true,
      id: 'opp-1',
      comment: 'Please add contact details',
    });

    act(() => {
      result.current.closeRejectModal();
    });

    expect(result.current.rejectModal).toEqual({
      open: false,
      id: null,
      comment: '',
    });
  });

  it('should call opportunitiesApi.moderate and remove item from queue on handleModerate approve', async () => {
    const mockSetQueue = vi.fn();
    const mockOnModerated = vi.fn();

    mockOpportunitiesApi.moderate.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useModeration(mockSetQueue, mockOnModerated), {
      wrapper,
    });

    let success: boolean | undefined;

    await act(async () => {
      success = await result.current.handleModerate('opp-1', 'APPROVE');
    });

    expect(success).toBe(true);
    expect(mockOpportunitiesApi.moderate).toHaveBeenCalledWith('opp-1', 'APPROVE', undefined);
    expect(mockSetQueue).toHaveBeenCalledTimes(1);

    const filterFn = mockSetQueue.mock.calls[0][0];
    const filtered = filterFn(mockOpportunities);

    expect(filtered).toEqual([mockOpportunities[1]]);
    expect(mockToast.success).toHaveBeenCalledTimes(1);
    expect(mockOnModerated).toHaveBeenCalledTimes(1);
  });

  it('should call opportunitiesApi.moderate and succeed without onModerated callback', async () => {
    const mockSetQueue = vi.fn();

    mockOpportunitiesApi.moderate.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useModeration(mockSetQueue), { wrapper });

    let success: boolean | undefined;

    await act(async () => {
      success = await result.current.handleModerate('opp-1', 'APPROVE');
    });

    expect(success).toBe(true);
    expect(mockOpportunitiesApi.moderate).toHaveBeenCalledWith('opp-1', 'APPROVE', undefined);
    expect(mockSetQueue).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledTimes(1);
  });

  it('should show error toast when handleModerate fails', async () => {
    const mockSetQueue = vi.fn();
    const mockOnModerated = vi.fn();

    mockOpportunitiesApi.moderate.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useModeration(mockSetQueue, mockOnModerated), {
      wrapper,
    });

    let success: boolean | undefined;

    await act(async () => {
      success = await result.current.handleModerate('opp-1', 'APPROVE');
    });

    expect(success).toBe(false);
    expect(mockOpportunitiesApi.moderate).toHaveBeenCalledWith('opp-1', 'APPROVE', undefined);
    expect(mockSetQueue).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith('Network error');
    expect(mockOnModerated).not.toHaveBeenCalled();
  });

  it('should show fallback error toast when handleModerate fails with non-error object', async () => {
    const mockSetQueue = vi.fn();

    mockOpportunitiesApi.moderate.mockRejectedValueOnce('Unexpected failure');

    const { result } = renderHook(() => useModeration(mockSetQueue), { wrapper });

    let success: boolean | undefined;

    await act(async () => {
      success = await result.current.handleModerate('opp-1', 'APPROVE');
    });

    expect(success).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith(expect.any(String));
  });

  it('should confirm reject/changes, call moderate, close modal, and notify callback on handleRejectConfirm', async () => {
    const mockSetQueue = vi.fn();
    const mockOnModerated = vi.fn();

    mockOpportunitiesApi.moderate.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useModeration(mockSetQueue, mockOnModerated), {
      wrapper,
    });

    act(() => {
      result.current.openRejectModal('opp-1');
      result.current.changeRejectComment('Needs revision');
    });

    await act(async () => {
      await result.current.handleRejectConfirm('opp-1', 'REQUIRE_CHANGES', 'Needs revision');
    });

    expect(mockOpportunitiesApi.moderate).toHaveBeenCalledWith(
      'opp-1',
      'REQUIRE_CHANGES',
      'Needs revision',
    );
    expect(mockSetQueue).toHaveBeenCalledTimes(1);
    expect(mockToast.success).toHaveBeenCalledTimes(1);
    expect(mockOnModerated).toHaveBeenCalledTimes(1);
    expect(result.current.rejectModal).toEqual({
      open: false,
      id: null,
      comment: '',
    });
    expect(result.current.submitting).toBe(false);
  });

  it('should handle reject action and close modal on handleRejectConfirm', async () => {
    const mockSetQueue = vi.fn();
    const mockOnModerated = vi.fn();

    mockOpportunitiesApi.moderate.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useModeration(mockSetQueue, mockOnModerated), {
      wrapper,
    });

    act(() => {
      result.current.openRejectModal('opp-2');
      result.current.changeRejectComment('Violates policies');
    });

    await act(async () => {
      await result.current.handleRejectConfirm('opp-2', 'REJECT', 'Violates policies');
    });

    expect(mockOpportunitiesApi.moderate).toHaveBeenCalledWith(
      'opp-2',
      'REJECT',
      'Violates policies',
    );
    expect(result.current.rejectModal).toEqual({
      open: false,
      id: null,
      comment: '',
    });
    expect(result.current.submitting).toBe(false);
  });

  it('should show error toast on handleRejectConfirm failure', async () => {
    const mockSetQueue = vi.fn();
    const mockOnModerated = vi.fn();

    mockOpportunitiesApi.moderate.mockRejectedValueOnce(new Error('Moderation rejected'));

    const { result } = renderHook(() => useModeration(mockSetQueue, mockOnModerated), {
      wrapper,
    });

    act(() => {
      result.current.openRejectModal('opp-1');
      result.current.changeRejectComment('Not suitable');
    });

    await act(async () => {
      await result.current.handleRejectConfirm('opp-1', 'REJECT', 'Not suitable');
    });

    expect(mockToast.error).toHaveBeenCalledWith('Moderation rejected');
    expect(mockOnModerated).not.toHaveBeenCalled();
    expect(result.current.rejectModal).toEqual({
      open: true,
      id: 'opp-1',
      comment: 'Not suitable',
    });
    expect(result.current.submitting).toBe(false);
  });
});
