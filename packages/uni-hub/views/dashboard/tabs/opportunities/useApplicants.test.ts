import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityApplication } from '@uni-hub/types';
import { useApplicants } from './useApplicants';

const { mockToast, mockOpportunitiesApi } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  mockOpportunitiesApi: {
    getOpportunityApplications: vi.fn(),
    updateApplicationStatus: vi.fn(),
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
  title: 'Frontend Developer',
  description: 'React, TypeScript project for students',
  ownerContactInfo: 'hr@frontend.ua',
  status: 'PUBLISHED',
  lifecycleState: 'ACTIVE',
  paymentType: 'PAID',
  paymentDetails: '400$ / month',
  ownerId: 'user-1',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

const mockApplications: OpportunityApplication[] = [
  {
    id: 'app-1',
    applicantName: 'Олена Коваль',
    contactInfo: 'olena@karazin.ua',
    motivation: 'React experience',
    status: 'SUBMITTED',
    opportunityId: 'opp-1',
    applicantId: 'user-1',
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'app-2',
    applicantName: 'Іван Петренко',
    contactInfo: 'ivan@karazin.ua',
    motivation: 'Backend experience',
    status: 'UNDER_REVIEW',
    opportunityId: 'opp-1',
    applicantId: 'user-2',
    createdAt: '2026-10-11T12:00:00.000Z',
    updatedAt: '2026-10-11T12:00:00.000Z',
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(LanguageProvider, null, children);

describe('useApplicants hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should initialize with closed modal, empty applications, and loading false', () => {
    const { result } = renderHook(() => useApplicants(), { wrapper });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.applications).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch applications successfully on open(opportunity)', async () => {
    mockOpportunitiesApi.getOpportunityApplications.mockResolvedValueOnce({
      data: mockApplications,
    });

    const { result } = renderHook(() => useApplicants(), { wrapper });

    await act(async () => {
      await result.current.open(mockOpportunity);
    });

    expect(mockOpportunitiesApi.getOpportunityApplications).toHaveBeenCalledWith('opp-1');
    expect(result.current.isOpen).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.applications).toEqual(mockApplications);
  });

  it('should handle error gracefully on open(opportunity) and set empty applications', async () => {
    mockOpportunitiesApi.getOpportunityApplications.mockRejectedValueOnce(new Error('API failure'));

    const { result } = renderHook(() => useApplicants(), { wrapper });

    await act(async () => {
      await result.current.open(mockOpportunity);
    });

    expect(mockOpportunitiesApi.getOpportunityApplications).toHaveBeenCalledWith('opp-1');
    expect(result.current.isOpen).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.applications).toEqual([]);
  });

  it('should update application status successfully on handleUpdateStatus', async () => {
    mockOpportunitiesApi.getOpportunityApplications.mockResolvedValueOnce({
      data: mockApplications,
    });
    mockOpportunitiesApi.updateApplicationStatus.mockResolvedValueOnce({
      data: { ...mockApplications[0], status: 'ACCEPTED' },
    });

    const { result } = renderHook(() => useApplicants(), { wrapper });

    await act(async () => {
      await result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleUpdateStatus('app-1', 'ACCEPTED');
    });

    expect(mockOpportunitiesApi.updateApplicationStatus).toHaveBeenCalledWith('app-1', 'ACCEPTED');
    expect(result.current.applications[0].status).toBe('ACCEPTED');
    expect(result.current.applications[1].status).toBe('UNDER_REVIEW');
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('should show error toast on updateApplicationStatus failure', async () => {
    mockOpportunitiesApi.getOpportunityApplications.mockResolvedValueOnce({
      data: mockApplications,
    });
    mockOpportunitiesApi.updateApplicationStatus.mockRejectedValueOnce(
      new Error('Failed to update application status'),
    );

    const { result } = renderHook(() => useApplicants(), { wrapper });

    await act(async () => {
      await result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleUpdateStatus('app-1', 'REJECTED');
    });

    expect(mockOpportunitiesApi.updateApplicationStatus).toHaveBeenCalledWith('app-1', 'REJECTED');
    expect(mockToast.error).toHaveBeenCalledWith('Failed to update application status');
    expect(result.current.applications[0].status).toBe('SUBMITTED');
  });

  it('should show fallback error toast when updateApplicationStatus fails with non-Error object', async () => {
    mockOpportunitiesApi.getOpportunityApplications.mockResolvedValueOnce({
      data: mockApplications,
    });
    mockOpportunitiesApi.updateApplicationStatus.mockRejectedValueOnce({});

    const { result } = renderHook(() => useApplicants(), { wrapper });

    await act(async () => {
      await result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleUpdateStatus('app-1', 'ACCEPTED');
    });

    expect(mockToast.error).toHaveBeenCalledWith('Помилка оновлення статусу');
    expect(result.current.applications[0].status).toBe('SUBMITTED');
  });

  it('should leave applications unchanged when handleUpdateStatus is called with non-matching applicationId', async () => {
    mockOpportunitiesApi.getOpportunityApplications.mockResolvedValueOnce({
      data: mockApplications,
    });
    mockOpportunitiesApi.updateApplicationStatus.mockResolvedValueOnce({
      data: { ...mockApplications[0], id: 'non-existing', status: 'ACCEPTED' },
    });

    const { result } = renderHook(() => useApplicants(), { wrapper });

    await act(async () => {
      await result.current.open(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleUpdateStatus('non-existing', 'ACCEPTED');
    });

    expect(result.current.applications).toEqual(mockApplications);
  });

  it('should allow controlling isOpen state directly via setIsOpen', () => {
    const { result } = renderHook(() => useApplicants(), { wrapper });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.setIsOpen(true);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.setIsOpen(false);
    });

    expect(result.current.isOpen).toBe(false);
  });
});
