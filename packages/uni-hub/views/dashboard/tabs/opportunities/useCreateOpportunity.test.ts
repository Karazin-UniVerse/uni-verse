import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import { useCreateOpportunity, type UseCreateOpportunityProps } from './useCreateOpportunity';
import type { CreateOpportunityFormData } from './types';

const { mockToast, mockOpportunitiesApi } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  mockOpportunitiesApi: {
    createOpportunity: vi.fn(),
    updateOpportunity: vi.fn(),
  },
}));

vi.mock('@una', () => ({
  useToast: () => mockToast,
}));

vi.mock('@uni-hub/services/api.opportunities', () => ({
  opportunitiesApi: mockOpportunitiesApi,
}));

const mockOpportunity: Opportunity = {
  id: 'opp-42',
  title: 'Fullstack Research Assistant',
  description: 'Work on distributed systems and cloud applications.',
  ownerContactInfo: 'prof@karazin.ua',
  status: 'PUBLISHED',
  lifecycleState: 'ACTIVE',
  paymentType: 'PAID',
  paymentDetails: '500$ / month',
  ownerId: 'prof-1',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

const INITIAL_FORM_DATA: CreateOpportunityFormData = {
  title: '',
  description: '',
  ownerContactInfo: '',
  paymentType: 'UNPAID',
  paymentDetails: '',
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(LanguageProvider, null, children);

describe('useCreateOpportunity hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('universe-lang', 'uk');
  });

  const renderCreateHook = (props: UseCreateOpportunityProps = {}) =>
    renderHook(() => useCreateOpportunity(props), { wrapper });

  const createMockEvent = () =>
    ({
      preventDefault: vi.fn(),
    }) as unknown as React.SyntheticEvent<HTMLFormElement>;

  it('should initialize with closed modal, empty form data, and creating false', () => {
    const { result } = renderCreateHook();

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isEdit).toBe(false);
    expect(result.current.creating).toBe(false);
    expect(result.current.formData).toEqual(INITIAL_FORM_DATA);
  });

  it('should populate form data and set editingOpportunityId on openEdit', () => {
    const { result } = renderCreateHook();

    act(() => {
      result.current.openEdit(mockOpportunity);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isEdit).toBe(true);
    expect(result.current.formData).toEqual({
      title: 'Fullstack Research Assistant',
      description: 'Work on distributed systems and cloud applications.',
      ownerContactInfo: 'prof@karazin.ua',
      paymentType: 'PAID',
      paymentDetails: '500$ / month',
    });
  });

  it('should handle fallback values on openEdit when optional fields are empty or undefined', () => {
    const { result } = renderCreateHook();

    const minimalOpportunity: Opportunity = {
      ...mockOpportunity,
      ownerContactInfo: '',
      paymentDetails: null,
    };

    act(() => {
      result.current.openEdit(minimalOpportunity);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isEdit).toBe(true);
    expect(result.current.formData.ownerContactInfo).toBe('');
    expect(result.current.formData.paymentDetails).toBe('');
  });

  it('should reset form data and close modal on close()', () => {
    const { result } = renderCreateHook();

    act(() => {
      result.current.openEdit(mockOpportunity);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isEdit).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isEdit).toBe(false);
    expect(result.current.formData).toEqual(INITIAL_FORM_DATA);
  });

  it('should reset editingOpportunityId and restore initial form data on openCreate()', () => {
    const { result } = renderCreateHook();

    act(() => {
      result.current.openEdit(mockOpportunity);
    });

    expect(result.current.isEdit).toBe(true);

    act(() => {
      result.current.openCreate();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isEdit).toBe(false);
    expect(result.current.formData).toEqual(INITIAL_FORM_DATA);
  });

  it('should allow controlling isOpen state directly via setIsOpen', () => {
    const { result } = renderCreateHook();

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

  it('should allow updating form data directly via setFormData', () => {
    const { result } = renderCreateHook();

    const customData: CreateOpportunityFormData = {
      title: 'Lab Assistant',
      description: 'Assist in lab measurements',
      ownerContactInfo: 'lab@karazin.ua',
      paymentType: 'UNPAID',
      paymentDetails: '',
    };

    act(() => {
      result.current.setFormData(customData);
    });

    expect(result.current.formData).toEqual(customData);
  });

  it('should create opportunity successfully on handleSubmit in create mode', async () => {
    const onCreated = vi.fn();
    const mockEvent = createMockEvent();

    mockOpportunitiesApi.createOpportunity.mockResolvedValueOnce({
      data: mockOpportunity,
    });

    const { result } = renderCreateHook({ onCreated });

    act(() => {
      result.current.openCreate();
      result.current.setFormData({
        title: '  New Research Grant  ',
        description: '  Deep learning research  ',
        ownerContactInfo: '  ai-lab@karazin.ua  ',
        paymentType: 'PAID',
        paymentDetails: '  1000$  ',
      });
    });

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockOpportunitiesApi.createOpportunity).toHaveBeenCalledWith({
      title: 'New Research Grant',
      description: 'Deep learning research',
      ownerContactInfo: 'ai-lab@karazin.ua',
      paymentType: 'PAID',
      paymentDetails: '1000$',
    });
    expect(mockToast.success).toHaveBeenCalledWith('Можливість успішно створена як чернетка!');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.creating).toBe(false);
    expect(result.current.formData).toEqual(INITIAL_FORM_DATA);
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('should set paymentDetails to undefined in create mode when paymentDetails is blank', async () => {
    const mockEvent = createMockEvent();

    mockOpportunitiesApi.createOpportunity.mockResolvedValueOnce({
      data: mockOpportunity,
    });

    const { result } = renderCreateHook();

    act(() => {
      result.current.openCreate();
      result.current.setFormData({
        title: 'Open Source Contributor',
        description: 'Contribute to university projects',
        ownerContactInfo: 'os@karazin.ua',
        paymentType: 'UNPAID',
        paymentDetails: '   ',
      });
    });

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockOpportunitiesApi.createOpportunity).toHaveBeenCalledWith({
      title: 'Open Source Contributor',
      description: 'Contribute to university projects',
      ownerContactInfo: 'os@karazin.ua',
      paymentType: 'UNPAID',
      paymentDetails: undefined,
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should update opportunity successfully on handleSubmit in edit mode', async () => {
    const onUpdated = vi.fn();
    const mockEvent = createMockEvent();

    mockOpportunitiesApi.updateOpportunity.mockResolvedValueOnce({
      data: mockOpportunity,
    });

    const { result } = renderCreateHook({ onUpdated });

    act(() => {
      result.current.openEdit(mockOpportunity);
      result.current.setFormData({
        title: '  Updated Assistant Role  ',
        description: '  Updated description text  ',
        ownerContactInfo: '  updated@karazin.ua  ',
        paymentType: 'PAID',
        paymentDetails: '  600$ / month  ',
      });
    });

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockOpportunitiesApi.updateOpportunity).toHaveBeenCalledWith('opp-42', {
      title: 'Updated Assistant Role',
      description: 'Updated description text',
      ownerContactInfo: 'updated@karazin.ua',
      paymentType: 'PAID',
      paymentDetails: '600$ / month',
    });
    expect(mockToast.success).toHaveBeenCalledWith('Зміни успішно збережено!');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.creating).toBe(false);
    expect(result.current.isEdit).toBe(false);
    expect(result.current.formData).toEqual(INITIAL_FORM_DATA);
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it('should set paymentDetails to null in edit mode when paymentType is UNPAID', async () => {
    const mockEvent = createMockEvent();

    mockOpportunitiesApi.updateOpportunity.mockResolvedValueOnce({
      data: mockOpportunity,
    });

    const { result } = renderCreateHook();

    act(() => {
      result.current.openEdit(mockOpportunity);
      result.current.setFormData({
        title: 'Volunteer Coordinator',
        description: 'Coordinate student volunteers',
        ownerContactInfo: 'volunteer@karazin.ua',
        paymentType: 'UNPAID',
        paymentDetails: 'Some detail that should be ignored for unpaid',
      });
    });

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockOpportunitiesApi.updateOpportunity).toHaveBeenCalledWith('opp-42', {
      title: 'Volunteer Coordinator',
      description: 'Coordinate student volunteers',
      ownerContactInfo: 'volunteer@karazin.ua',
      paymentType: 'UNPAID',
      paymentDetails: null,
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should show error toast when creation fails', async () => {
    const onCreated = vi.fn();
    const mockEvent = createMockEvent();

    mockOpportunitiesApi.createOpportunity.mockRejectedValueOnce(
      new Error('Creation failed due to server error'),
    );

    const { result } = renderCreateHook({ onCreated });

    act(() => {
      result.current.openCreate();
      result.current.setFormData({
        title: 'New Position',
        description: 'Position details',
        ownerContactInfo: 'contact@karazin.ua',
        paymentType: 'UNPAID',
        paymentDetails: '',
      });
    });

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockToast.error).toHaveBeenCalledWith('Creation failed due to server error');
    expect(result.current.creating).toBe(false);
    expect(result.current.isOpen).toBe(true);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('should show error toast when update fails', async () => {
    const onUpdated = vi.fn();
    const mockEvent = createMockEvent();

    mockOpportunitiesApi.updateOpportunity.mockRejectedValueOnce(
      new Error('Update failed due to validation error'),
    );

    const { result } = renderCreateHook({ onUpdated });

    act(() => {
      result.current.openEdit(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockToast.error).toHaveBeenCalledWith('Update failed due to validation error');
    expect(result.current.creating).toBe(false);
    expect(result.current.isOpen).toBe(true);
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('should show fallback error toast when creation fails with non-Error object', async () => {
    const mockEvent = createMockEvent();

    mockOpportunitiesApi.createOpportunity.mockRejectedValueOnce({});

    const { result } = renderCreateHook();

    act(() => {
      result.current.openCreate();
    });

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockToast.error).toHaveBeenCalledWith('Помилка створення можливості');
    expect(result.current.creating).toBe(false);
  });

  it('should show fallback error toast when update fails with non-Error object', async () => {
    const mockEvent = createMockEvent();

    mockOpportunitiesApi.updateOpportunity.mockRejectedValueOnce({});

    const { result } = renderCreateHook();

    act(() => {
      result.current.openEdit(mockOpportunity);
    });

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockToast.error).toHaveBeenCalledWith('Помилка оновлення можливості');
    expect(result.current.creating).toBe(false);
  });
});
