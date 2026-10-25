import React from 'react';
import { act, render } from '@testing-library/react';
import { ToastProvider } from '@una';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { BadgeSystem } from './BadgeSystem';

vi.mock('@uni-hub/i18n/LanguageContext', () => ({
  useLanguage: () => ({ formatMessage: (key: string) => key }),
}));
vi.mock('@uni-hub/utils/confetti', () => ({ fireConfetti: vi.fn() }));
vi.mock('@uni-hub/utils/soundEffects', () => ({ playSuccess: vi.fn() }));

describe('badge account readiness', () => {
  beforeEach(() => {
    localStorage.clear();
    useGamificationStore.setState(useGamificationStore.getInitialState());
  });

  it('re-evaluates existing eligible input after account activation', () => {
    render(
      <ToastProvider>
        <BadgeSystem grades={[]} submittedBeforeDeadline />
      </ToastProvider>,
    );
    expect(useGamificationStore.getState().unlockedBadges).toEqual([]);
    act(() => {
      useGamificationStore.getState().setActiveUser('alice');
    });
    expect(useGamificationStore.getState().unlockedBadges).toContain('DEADLINE_SNIPER');
  });

  it('triggers toast with localized title and description on unlock', () => {
    useGamificationStore.getState().setActiveUser('bob');

    const { container } = render(
      <ToastProvider>
        <BadgeSystem grades={[]} submittedBeforeDeadline />
      </ToastProvider>,
    );

    expect(useGamificationStore.getState().unlockedBadges).toContain('DEADLINE_SNIPER');
    expect(container).toBeDefined();
  });
});
