import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity, OpportunityApplication } from '@core/types/opportunities';
import type { CurrentUser } from '@uni-hub/hooks/useCurrentUser';
import { useApplicantActions } from './useApplicantActions';

const { mockToast, mockOpportunitiesApi } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  mockOpportunitiesApi: {
    apply: vi.fn(),
    withdrawApplication: vi.fn(),
  },
}));

vi.mock('@una', () => ({
  useToast: () => mockToast,
}));

vi.mock('@uni-hub/services/api.opportunities', () => ({
  opportunitiesApi: mockOpportunitiesApi,
}));

const mockCurrentUser: CurrentUser = {
  userId: 'user-applicant-1',
  roles: ['STUDENT'],
  name: 'Volodymyr Student',
  email: 'student@example.com',
};

const mockOpportunity: Opportunity = {
  id: 'opp-101',
  title: 'Frontend Intern',
  description: 'Internship description',
  ownerContactInfo: 'lead@example.com',
  status: 'PUBLISHED',
  lifecycleState: 'ACTIVE',
  paymentType: 'PAID',
  paymentDetails: '300$ / month',
  ownerId: 'owner-1',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

describe('useApplicantActions hook', () => {
  let mockSetApplications: Mock & React.Dispatch<React.SetStateAction<OpportunityApplication[]>>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockSetApplications = vi.fn() as unknown as Mock &
      React.Dispatch<React.SetStateAction<OpportunityApplication[]>>;
  });

  const renderActionsHook = (
    options: {
      currentUser?: CurrentUser;
      selectedOpportunity?: Opportunity | null;
      setApplications?: React.Dispatch<React.SetStateAction<OpportunityApplication[]>>;
    } = {},
  ) => {
    const props = {
      currentUser: options.currentUser ?? mockCurrentUser,
      selectedOpportunity:
        options.selectedOpportunity !== undefined ? options.selectedOpportunity : mockOpportunity,
      setApplications: options.setApplications ?? mockSetApplications,
    };

    return renderHook(() => useApplicantActions(props), {
      wrapper: ({ children }) => React.createElement(LanguageProvider, null, children),
    });
  };

  it('should initialize with default states', () => {
    const { result } = renderActionsHook();

    expect(result.current.isApplyOpen).toBe(false);
    expect(result.current.motivation).toBe('');
    expect(result.current.contactInfo).toBe('');
    expect(result.current.applying).toBe(false);
    expect(result.current.withdrawApplicationId).toBeNull();
    expect(result.current.withdrawing).toBe(false);
  });

  it('should update form state when setters are called', () => {
    const { result } = renderActionsHook();

    act(() => {
      result.current.setIsApplyOpen(true);
      result.current.setMotivation('Strong experience in React');
      result.current.setContactInfo('@telegram_dev');
    });

    expect(result.current.isApplyOpen).toBe(true);
    expect(result.current.motivation).toBe('Strong experience in React');
    expect(result.current.contactInfo).toBe('@telegram_dev');
  });

  it('should submit application successfully via opportunitiesApi.apply and reset form', async () => {
    mockOpportunitiesApi.apply.mockResolvedValueOnce({
      data: { id: 'app-new-1', status: 'SUBMITTED' },
    });

    const { result } = renderActionsHook();

    act(() => {
      result.current.setIsApplyOpen(true);
      result.current.setMotivation('   Motivated to contribute   ');
      result.current.setContactInfo('   @telegram_dev   ');
    });

    const preventDefault = vi.fn();
    const mockEvent = { preventDefault } as unknown as React.SyntheticEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleApplySubmit(mockEvent);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(mockOpportunitiesApi.apply).toHaveBeenCalledWith('opp-101', {
      applicantName: 'Volodymyr Student',
      contactInfo: '@telegram_dev',
      motivation: 'Motivated to contribute',
    });
    expect(result.current.isApplyOpen).toBe(false);
    expect(result.current.motivation).toBe('');
    expect(result.current.contactInfo).toBe('');
    expect(result.current.applying).toBe(false);
    expect(mockToast.success).toHaveBeenCalledWith('Ваш відгук успішно надіслано організатору!');
  });

  it('should fall back to user email when user name is empty during apply', async () => {
    mockOpportunitiesApi.apply.mockResolvedValueOnce({
      data: { id: 'app-new-2', status: 'SUBMITTED' },
    });

    const { result } = renderActionsHook({
      currentUser: {
        userId: 'user-no-name',
        roles: ['STUDENT'],
        name: '',
        email: 'fallback_email@univ.edu',
      },
    });

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleApplySubmit(mockEvent);
    });

    expect(mockOpportunitiesApi.apply).toHaveBeenCalledWith('opp-101', {
      applicantName: 'fallback_email@univ.edu',
      contactInfo: 'fallback_email@univ.edu',
      motivation: '',
    });
  });

  it('should fall back to default applicant name when user name and email are absent', async () => {
    mockOpportunitiesApi.apply.mockResolvedValueOnce({
      data: { id: 'app-new-3', status: 'SUBMITTED' },
    });

    const { result } = renderActionsHook({
      currentUser: {
        userId: 'user-anonymous',
        roles: ['STUDENT'],
      },
    });

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleApplySubmit(mockEvent);
    });

    expect(mockOpportunitiesApi.apply).toHaveBeenCalledWith('opp-101', {
      applicantName: 'Студент',
      contactInfo: '',
      motivation: '',
    });
  });

  it('should do nothing when handleApplySubmit is called without selected opportunity', async () => {
    const { result } = renderActionsHook({ selectedOpportunity: null });
    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleApplySubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockOpportunitiesApi.apply).not.toHaveBeenCalled();
    expect(result.current.applying).toBe(false);
  });

  it('should handle apply error and show error toast', async () => {
    mockOpportunitiesApi.apply.mockRejectedValueOnce(new Error('Network error on apply'));

    const { result } = renderActionsHook();

    act(() => {
      result.current.setIsApplyOpen(true);
      result.current.setMotivation('Valuable input');
    });

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleApplySubmit(mockEvent);
    });

    expect(mockToast.error).toHaveBeenCalledWith('Network error on apply');
    expect(result.current.applying).toBe(false);
    expect(result.current.isApplyOpen).toBe(true);
    expect(result.current.motivation).toBe('Valuable input');
  });

  it('should manage withdraw confirmation flow and call opportunitiesApi.withdrawApplication', async () => {
    mockOpportunitiesApi.withdrawApplication.mockResolvedValueOnce({
      data: { id: 'app-to-withdraw', status: 'WITHDRAWN' },
    });

    const { result } = renderActionsHook();

    act(() => {
      result.current.setWithdrawApplicationId('app-to-withdraw');
    });

    expect(result.current.withdrawApplicationId).toBe('app-to-withdraw');

    await act(async () => {
      await result.current.handleWithdraw();
    });

    expect(mockOpportunitiesApi.withdrawApplication).toHaveBeenCalledWith('app-to-withdraw');
    expect(result.current.withdrawApplicationId).toBeNull();
    expect(result.current.withdrawing).toBe(false);
    expect(mockToast.success).toHaveBeenCalledWith('Відгук відкликано');

    expect(mockSetApplications).toHaveBeenCalledTimes(1);

    const updateCallback = mockSetApplications.mock.calls[0][0];
    const initialList: OpportunityApplication[] = [
      {
        id: 'app-to-withdraw',
        applicantName: 'Volodymyr',
        contactInfo: 'student@example.com',
        status: 'SUBMITTED',
        motivation: null,
        ownerComment: null,
        opportunityId: 'opp-101',
        applicantId: 'user-1',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'app-other',
        applicantName: 'Other',
        contactInfo: 'other@example.com',
        status: 'SUBMITTED',
        motivation: null,
        ownerComment: null,
        opportunityId: 'opp-101',
        applicantId: 'user-2',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const updatedList = updateCallback(initialList);

    expect(updatedList).toEqual([
      {
        id: 'app-to-withdraw',
        applicantName: 'Volodymyr',
        contactInfo: 'student@example.com',
        status: 'WITHDRAWN',
        motivation: null,
        ownerComment: null,
        opportunityId: 'opp-101',
        applicantId: 'user-1',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'app-other',
        applicantName: 'Other',
        contactInfo: 'other@example.com',
        status: 'SUBMITTED',
        motivation: null,
        ownerComment: null,
        opportunityId: 'opp-101',
        applicantId: 'user-2',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
  });

  it('should clear withdrawApplicationId when setWithdrawApplicationId(null) is called', () => {
    const { result } = renderActionsHook();

    act(() => {
      result.current.setWithdrawApplicationId('app-to-withdraw');
    });

    expect(result.current.withdrawApplicationId).toBe('app-to-withdraw');

    act(() => {
      result.current.setWithdrawApplicationId(null);
    });

    expect(result.current.withdrawApplicationId).toBeNull();
  });

  it('should do nothing when handleWithdraw is called without active withdraw application id', async () => {
    const { result } = renderActionsHook();

    await act(async () => {
      await result.current.handleWithdraw();
    });

    expect(mockOpportunitiesApi.withdrawApplication).not.toHaveBeenCalled();
    expect(mockSetApplications).not.toHaveBeenCalled();
    expect(result.current.withdrawing).toBe(false);
  });

  it('should handle withdraw error and show error toast', async () => {
    mockOpportunitiesApi.withdrawApplication.mockRejectedValueOnce(
      new Error('Withdraw failed on server'),
    );

    const { result } = renderActionsHook();

    act(() => {
      result.current.setWithdrawApplicationId('app-to-withdraw');
    });

    await act(async () => {
      await result.current.handleWithdraw();
    });

    expect(mockToast.error).toHaveBeenCalledWith('Withdraw failed on server');
    expect(result.current.withdrawing).toBe(false);
    expect(result.current.withdrawApplicationId).toBeNull();
  });
});
