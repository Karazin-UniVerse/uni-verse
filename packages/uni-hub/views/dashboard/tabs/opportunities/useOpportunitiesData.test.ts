import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import { OPPORTUNITY_SUB_TAB } from './constants';
import { useOpportunitiesData } from './useOpportunitiesData';

const { mockOpportunitiesApi } = vi.hoisted(() => ({
  mockOpportunitiesApi: {
    getOpportunities: vi.fn(),
    getMyOpportunities: vi.fn(),
    getMyApplications: vi.fn(),
  },
}));

vi.mock('@uni-hub/services/api.opportunities', () => ({
  opportunitiesApi: mockOpportunitiesApi,
}));

const mockCatalog: Opportunity[] = [
  {
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
  },
];

const mockMyOpportunities: Opportunity[] = [
  {
    id: 'opp-2',
    title: 'Backend Developer',
    description: 'NestJS, PostgreSQL project',
    ownerContactInfo: 'lead@backend.ua',
    status: 'DRAFT',
    lifecycleState: 'ACTIVE',
    paymentType: 'UNPAID',
    paymentDetails: null,
    ownerId: 'user-me',
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
  },
];

const mockMyApplications: OpportunityApplication[] = [
  {
    id: 'app-1',
    applicantName: 'Олена Коваль',
    contactInfo: 'olena@karazin.ua',
    motivation: 'React experience',
    status: 'SUBMITTED',
    opportunityId: 'opp-1',
    applicantId: 'user-me',
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
  },
];

const mockModerationQueue: Opportunity[] = [
  {
    id: 'opp-3',
    title: 'AI Research Assistant',
    description: 'PyTorch deep learning tasks',
    ownerContactInfo: 'prof@karazin.ua',
    status: 'READY_FOR_REVIEW',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '500$ / month',
    ownerId: 'user-prof',
    createdAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(LanguageProvider, null, children);

describe('useOpportunitiesData hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should load only the active catalog list on mount', async () => {
    mockOpportunitiesApi.getOpportunities.mockResolvedValueOnce({ data: mockCatalog });

    const { result } = renderHook(() => useOpportunitiesData(false), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
    });

    expect(mockOpportunitiesApi.getOpportunities).toHaveBeenCalledWith();
    expect(result.current.catalog.items).toEqual(mockCatalog);
    expect(result.current.myOpportunities.items).toEqual([]);
    expect(result.current.myApplications.items).toEqual([]);
    expect(result.current.activeSubTab).toBe(OPPORTUNITY_SUB_TAB.Catalog);
  });

  it('should not load moderation queue on mount when isModerator is false', async () => {
    mockOpportunitiesApi.getOpportunities.mockResolvedValueOnce({ data: mockCatalog });

    const { result } = renderHook(() => useOpportunitiesData(false), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
    });

    expect(mockOpportunitiesApi.getOpportunities).toHaveBeenCalledTimes(1);
    expect(mockOpportunitiesApi.getOpportunities).not.toHaveBeenCalledWith({
      status: 'READY_FOR_REVIEW',
    });
    expect(result.current.moderationQueue.items).toEqual([]);
  });

  it('should load moderation queue on mount when isModerator is true', async () => {
    mockOpportunitiesApi.getOpportunities.mockImplementation((params) => {
      if (params?.status === 'READY_FOR_REVIEW') {
        return Promise.resolve({ data: mockModerationQueue });
      }

      return Promise.resolve({ data: mockCatalog });
    });

    const { result } = renderHook(() => useOpportunitiesData(true), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
      expect(result.current.moderationQueue.loading).toBe(false);
    });

    expect(mockOpportunitiesApi.getOpportunities).toHaveBeenCalledWith({
      status: 'READY_FOR_REVIEW',
    });
    expect(result.current.moderationQueue.items).toEqual(mockModerationQueue);
  });

  it('should change active sub-tab via setActiveSubTab', async () => {
    mockOpportunitiesApi.getOpportunities.mockImplementation((params) => {
      if (params?.status === 'READY_FOR_REVIEW') {
        return Promise.resolve({ data: mockModerationQueue });
      }

      return Promise.resolve({ data: mockCatalog });
    });
    mockOpportunitiesApi.getMyOpportunities.mockResolvedValue({ data: mockMyOpportunities });
    mockOpportunitiesApi.getMyApplications.mockResolvedValue({ data: mockMyApplications });

    const { result } = renderHook(() => useOpportunitiesData(false), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
    });

    expect(result.current.activeSubTab).toBe(OPPORTUNITY_SUB_TAB.Catalog);

    act(() => {
      result.current.setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities);
    });

    await waitFor(() => {
      expect(result.current.myOpportunities.loading).toBe(false);
    });

    expect(result.current.activeSubTab).toBe(OPPORTUNITY_SUB_TAB.MyOpportunities);
    expect(mockOpportunitiesApi.getMyOpportunities).toHaveBeenCalledTimes(1);
    expect(result.current.myOpportunities.items).toEqual(mockMyOpportunities);

    act(() => {
      result.current.setActiveSubTab(OPPORTUNITY_SUB_TAB.MyApplications);
    });

    await waitFor(() => {
      expect(result.current.myApplications.loading).toBe(false);
    });

    expect(result.current.activeSubTab).toBe(OPPORTUNITY_SUB_TAB.MyApplications);
    expect(mockOpportunitiesApi.getMyApplications).toHaveBeenCalledTimes(1);
    expect(result.current.myApplications.items).toEqual(mockMyApplications);

    act(() => {
      result.current.setActiveSubTab(OPPORTUNITY_SUB_TAB.Moderation);
    });

    await waitFor(() => {
      expect(result.current.moderationQueue.loading).toBe(false);
    });

    expect(result.current.activeSubTab).toBe(OPPORTUNITY_SUB_TAB.Moderation);
    expect(mockOpportunitiesApi.getOpportunities).toHaveBeenCalledWith({
      status: 'READY_FOR_REVIEW',
    });
    expect(result.current.moderationQueue.items).toEqual(mockModerationQueue);
  });

  it('should refetch active list when refetchActiveList is called', async () => {
    mockOpportunitiesApi.getOpportunities.mockResolvedValue({ data: mockCatalog });
    mockOpportunitiesApi.getMyOpportunities.mockResolvedValue({ data: mockMyOpportunities });

    const { result } = renderHook(() => useOpportunitiesData(false), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
    });

    expect(mockOpportunitiesApi.getOpportunities).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetchActiveList();
    });

    expect(mockOpportunitiesApi.getOpportunities).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.setActiveSubTab(OPPORTUNITY_SUB_TAB.MyOpportunities);
    });

    await waitFor(() => {
      expect(result.current.myOpportunities.loading).toBe(false);
    });

    expect(mockOpportunitiesApi.getMyOpportunities).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetchActiveList();
    });

    expect(mockOpportunitiesApi.getMyOpportunities).toHaveBeenCalledTimes(2);
  });

  it('should refetch all opportunity lists when refetchOpportunities is called', async () => {
    mockOpportunitiesApi.getOpportunities.mockResolvedValue({ data: mockCatalog });
    mockOpportunitiesApi.getMyOpportunities.mockResolvedValue({ data: mockMyOpportunities });

    const { result } = renderHook(() => useOpportunitiesData(false), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
    });

    expect(mockOpportunitiesApi.getOpportunities).toHaveBeenCalledTimes(1);
    expect(mockOpportunitiesApi.getMyOpportunities).toHaveBeenCalledTimes(0);

    await act(async () => {
      await result.current.refetchOpportunities();
    });

    expect(mockOpportunitiesApi.getOpportunities).toHaveBeenCalledTimes(2);
    expect(mockOpportunitiesApi.getMyOpportunities).toHaveBeenCalledTimes(1);
    expect(result.current.catalog.items).toEqual(mockCatalog);
    expect(result.current.myOpportunities.items).toEqual(mockMyOpportunities);
  });

  it('should update search state when setSearch is called', async () => {
    mockOpportunitiesApi.getOpportunities.mockResolvedValueOnce({ data: mockCatalog });

    const { result } = renderHook(() => useOpportunitiesData(false), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
    });

    expect(result.current.search).toBe('');

    act(() => {
      result.current.setSearch('React Developer');
    });

    expect(result.current.search).toBe('React Developer');
  });

  it('should update paymentFilter state when setPaymentFilter is called', async () => {
    mockOpportunitiesApi.getOpportunities.mockResolvedValueOnce({ data: mockCatalog });

    const { result } = renderHook(() => useOpportunitiesData(false), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
    });

    expect(result.current.paymentFilter).toBe('');

    act(() => {
      result.current.setPaymentFilter('PAID');
    });

    expect(result.current.paymentFilter).toBe('PAID');

    act(() => {
      result.current.setPaymentFilter('UNPAID');
    });

    expect(result.current.paymentFilter).toBe('UNPAID');
  });

  it('should fallback to empty list when API request fails', async () => {
    mockOpportunitiesApi.getOpportunities.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useOpportunitiesData(false), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
    });

    expect(result.current.catalog.items).toEqual([]);
  });

  it('should allow updating items directly via setItems', async () => {
    mockOpportunitiesApi.getOpportunities.mockResolvedValueOnce({ data: mockCatalog });

    const { result } = renderHook(() => useOpportunitiesData(false), { wrapper });

    await waitFor(() => {
      expect(result.current.catalog.loading).toBe(false);
    });

    expect(result.current.catalog.items).toEqual(mockCatalog);

    act(() => {
      result.current.catalog.setItems([]);
    });

    expect(result.current.catalog.items).toEqual([]);
  });
});
