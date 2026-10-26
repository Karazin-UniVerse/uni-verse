import type { SyntheticEvent } from 'react';
import { act, renderHook, screen, type RenderHookResult } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppProvidersWrapper } from '@uni-hub/utils/test-utils';
import { buildOpportunity } from '../test-utils';
import { useApplyToOpportunity } from './useApplyToOpportunity';

const { apply } = vi.hoisted(() => ({ apply: vi.fn() }));

vi.mock('@uni-hub/services/api.opportunities', () => ({
  opportunitiesApi: { apply },
}));

describe('useApplyToOpportunity alternative contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('universe-lang', 'uk');
  });

  const renderApplicationHook = (): RenderHookResult<
    ReturnType<typeof useApplyToOpportunity>,
    void
  > =>
    renderHook(
      () =>
        useApplyToOpportunity({
          currentUser: {
            userId: 'candidate',
            name: 'Student',
            email: 'student@example.com',
            roles: [],
          },
          opportunity: buildOpportunity('opportunity-1'),
        }),
      { wrapper: createAppProvidersWrapper() },
    );

  function createSubmitEvent(): SyntheticEvent<HTMLFormElement> {
    const form = document.createElement('form');

    return {
      nativeEvent: new Event('submit'),
      currentTarget: form,
      target: form,
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      eventPhase: 2,
      isTrusted: false,
      timeStamp: 0,
      type: 'submit',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      isDefaultPrevented: (): boolean => false,
      isPropagationStopped: (): boolean => false,
      persist: vi.fn(),
    };
  }

  it.each([
    { contact: '', expected: '' },
    { contact: '   ', expected: '' },
    { contact: '  @student_dev  ', expected: '@student_dev' },
  ])(
    'should submit with alternative contact $contact without copying profile email',
    async ({ contact, expected }) => {
      apply.mockResolvedValueOnce({ id: 'application-1' });
      const { result } = renderApplicationHook();

      act(() => {
        result.current.setIsApplyOpen(true);
        result.current.setMotivation('  I want to join.  ');
        result.current.setContactInfo(contact);
      });
      await act(async () => result.current.handleApplySubmit(createSubmitEvent()));

      expect(apply).toHaveBeenCalledWith('opportunity-1', {
        applicantName: 'Student',
        motivation: 'I want to join.',
        contactInfo: expected,
      });
      expect(result.current.isApplyOpen).toBe(false);
      expect(result.current.contactInfo).toBe('');
      expect(screen.getByText('Ваш відгук успішно надіслано організатору!')).toBeInTheDocument();
    },
  );

  it('should reject a malformed nonempty contact without submitting', async () => {
    const { result } = renderApplicationHook();

    act(() => result.current.setContactInfo('invalid-contact'));
    await act(async () => result.current.handleApplySubmit(createSubmitEvent()));

    expect(apply).not.toHaveBeenCalled();
    expect(
      screen.getByText('Вкажіть коректний Telegram (@username або посилання) або номер телефону'),
    ).toBeInTheDocument();
  });

  it('should preserve form data and show an error when submission fails', async () => {
    apply.mockRejectedValueOnce(new Error('Network unavailable'));
    const { result } = renderApplicationHook();

    act(() => {
      result.current.setIsApplyOpen(true);
      result.current.setMotivation('I want to join.');
    });
    await act(async () => result.current.handleApplySubmit(createSubmitEvent()));

    expect(screen.getByText('Network unavailable')).toBeInTheDocument();
    expect(result.current.isApplyOpen).toBe(true);
    expect(result.current.motivation).toBe('I want to join.');
    expect(result.current.applying).toBe(false);
  });
});
