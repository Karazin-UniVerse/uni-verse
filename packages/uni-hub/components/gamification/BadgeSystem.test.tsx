import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { withLanguage, withToast } from '@uni-hub/utils/test-utils';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { BADGES } from '@uni-hub/constants/gamification';
import { fireConfetti } from '@uni-hub/utils/confetti';
import { uk } from '@uni-hub/i18n/locales/uk';
import type { Grade } from '@core/types/moodle';
import { BadgeSystem } from './BadgeSystem';

vi.mock('@uni-hub/utils/confetti', () => ({
  fireConfetti: vi.fn(),
}));

vi.mock('@uni-hub/utils/soundEffects', () => ({
  playClick: vi.fn(),
  playSuccess: vi.fn(),
}));

const renderWithProviders = (ui: React.ReactElement) => render(withLanguage(withToast(ui)));

const deadlineSniperToast = `Досягнення: ${uk[BADGES.DEADLINE_SNIPER.titleKey]} — ${uk[BADGES.DEADLINE_SNIPER.descriptionKey]}`;
const nightOwlToast = `Досягнення: ${uk[BADGES.NIGHT_OWL.titleKey]} — ${uk[BADGES.NIGHT_OWL.descriptionKey]}`;
const semesterMasterToast = `Досягнення: ${uk[BADGES.SEMESTER_MASTER.titleKey]} — ${uk[BADGES.SEMESTER_MASTER.descriptionKey]}`;

describe('BadgeSystem component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useGamificationStore.setState({
      ...useGamificationStore.getInitialState(),
      activeUserId: 'test-user',
      soundEnabled: true,
      lastCheckInWasNight: false,
    });
  });

  it('should render null and evaluate badge unlocks without crashing', () => {
    renderWithProviders(
      <div data-testid="badge-system-root">
        <BadgeSystem grades={[]} />
      </div>,
    );

    expect(screen.getByTestId('badge-system-root')).toBeEmptyDOMElement();
    expect(screen.queryByText(/Досягнення/i)).not.toBeInTheDocument();
    expect(useGamificationStore.getState().unlockedBadges).toEqual([]);
  });

  it('should trigger celebration and toast when a new badge is unlocked', async () => {
    const triggerCelebrationSpy = vi.spyOn(useGamificationStore.getState(), 'triggerCelebration');

    renderWithProviders(<BadgeSystem grades={[]} submittedBeforeDeadline={true} />);

    expect(triggerCelebrationSpy).toHaveBeenCalledTimes(1);
    expect(fireConfetti).toHaveBeenCalled();
    expect(useGamificationStore.getState().unlockedBadges).toContain('DEADLINE_SNIPER');
    expect(await screen.findByText(deadlineSniperToast)).toBeInTheDocument();
  });

  it('should not toast duplicate badges that were already unlocked', () => {
    const triggerCelebrationSpy = vi.spyOn(useGamificationStore.getState(), 'triggerCelebration');

    useGamificationStore.setState({
      unlockedBadges: ['DEADLINE_SNIPER'],
    });

    renderWithProviders(<BadgeSystem grades={[]} submittedBeforeDeadline={true} />);

    expect(triggerCelebrationSpy).not.toHaveBeenCalled();
    expect(fireConfetti).not.toHaveBeenCalled();
    expect(
      screen.queryByText(new RegExp(uk[BADGES.DEADLINE_SNIPER.titleKey], 'i')),
    ).not.toBeInTheDocument();
  });

  it('should not toast duplicate badges on rerender after unlocking', async () => {
    const triggerCelebrationSpy = vi.spyOn(useGamificationStore.getState(), 'triggerCelebration');

    const { rerender } = renderWithProviders(
      <BadgeSystem grades={[]} submittedBeforeDeadline={true} />,
    );

    expect(triggerCelebrationSpy).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(deadlineSniperToast)).toBeInTheDocument();

    rerender(withLanguage(withToast(<BadgeSystem grades={[]} submittedBeforeDeadline={true} />)));

    expect(triggerCelebrationSpy).toHaveBeenCalledTimes(1);
  });

  it('should trigger celebration and toast when SEMESTER_MASTER is unlocked with qualifying grades', async () => {
    const triggerCelebrationSpy = vi.spyOn(useGamificationStore.getState(), 'triggerCelebration');
    const qualifyingGrades: Grade[] = [
      { grade: '85', courseName: 'Алгоритми' },
      { grade: '90', courseName: 'Математика' },
    ];

    renderWithProviders(<BadgeSystem grades={qualifyingGrades} />);

    expect(triggerCelebrationSpy).toHaveBeenCalledTimes(1);
    expect(useGamificationStore.getState().unlockedBadges).toContain('SEMESTER_MASTER');
    expect(await screen.findByText(semesterMasterToast)).toBeInTheDocument();
  });

  it('should not unlock SEMESTER_MASTER when grades are below threshold', () => {
    const triggerCelebrationSpy = vi.spyOn(useGamificationStore.getState(), 'triggerCelebration');
    const belowThresholdGrades: Grade[] = [
      { grade: '75', courseName: 'Алгоритми' },
      { grade: '90', courseName: 'Математика' },
    ];

    renderWithProviders(<BadgeSystem grades={belowThresholdGrades} />);

    expect(triggerCelebrationSpy).not.toHaveBeenCalled();
    expect(useGamificationStore.getState().unlockedBadges).not.toContain('SEMESTER_MASTER');
    expect(
      screen.queryByText(new RegExp(uk[BADGES.SEMESTER_MASTER.titleKey], 'i')),
    ).not.toBeInTheDocument();
  });

  it('should trigger celebration and toast when NIGHT_OWL is unlocked during night check-in', async () => {
    const triggerCelebrationSpy = vi.spyOn(useGamificationStore.getState(), 'triggerCelebration');

    useGamificationStore.setState({ lastCheckInWasNight: true });

    renderWithProviders(<BadgeSystem grades={[]} />);

    expect(triggerCelebrationSpy).toHaveBeenCalledTimes(1);
    expect(useGamificationStore.getState().unlockedBadges).toContain('NIGHT_OWL');
    expect(await screen.findByText(nightOwlToast)).toBeInTheDocument();
  });

  it('should unlock multiple badges simultaneously when conditions are met', async () => {
    const triggerCelebrationSpy = vi.spyOn(useGamificationStore.getState(), 'triggerCelebration');
    const qualifyingGrades: Grade[] = [{ grade: '95', courseName: 'Фізика' }];

    useGamificationStore.setState({ lastCheckInWasNight: true });

    renderWithProviders(<BadgeSystem grades={qualifyingGrades} submittedBeforeDeadline={true} />);

    expect(triggerCelebrationSpy).toHaveBeenCalledTimes(3);
    expect(useGamificationStore.getState().unlockedBadges).toEqual(
      expect.arrayContaining(['NIGHT_OWL', 'SEMESTER_MASTER', 'DEADLINE_SNIPER']),
    );
    expect(await screen.findByText(deadlineSniperToast)).toBeInTheDocument();
    expect(screen.getByText(nightOwlToast)).toBeInTheDocument();
    expect(screen.getByText(semesterMasterToast)).toBeInTheDocument();
  });

  it('should re-evaluate existing eligible input after account activation', () => {
    useGamificationStore.setState({ activeUserId: null });

    renderWithProviders(<BadgeSystem grades={[]} submittedBeforeDeadline={true} />);

    expect(useGamificationStore.getState().unlockedBadges).toEqual([]);

    act(() => {
      useGamificationStore.getState().setActiveUser('alice');
    });

    expect(useGamificationStore.getState().unlockedBadges).toContain('DEADLINE_SNIPER');
  });

  it('triggers toast with localized title and description on unlock', async () => {
    useGamificationStore.getState().setActiveUser('bob');

    renderWithProviders(<BadgeSystem grades={[]} submittedBeforeDeadline />);

    expect(useGamificationStore.getState().unlockedBadges).toContain('DEADLINE_SNIPER');
    expect(await screen.findByText(deadlineSniperToast)).toBeInTheDocument();
  });
});
