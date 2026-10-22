import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withLanguage, withToast } from '@uni-hub/utils/test-utils';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { BADGES } from '@uni-hub/constants/gamification';
import { fireConfetti } from '@uni-hub/utils/confetti';
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

describe('BadgeSystem component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useGamificationStore.setState({
      currentStreak: 0,
      lastActiveDate: null,
      unlockedBadges: [],
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
    expect(
      await screen.findByText(
        `Досягнення: ${BADGES.DEADLINE_SNIPER.title} — ${BADGES.DEADLINE_SNIPER.description}`,
      ),
    ).toBeInTheDocument();
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
      screen.queryByText(new RegExp(BADGES.DEADLINE_SNIPER.title, 'i')),
    ).not.toBeInTheDocument();
  });

  it('should not toast duplicate badges on rerender after unlocking', async () => {
    const triggerCelebrationSpy = vi.spyOn(useGamificationStore.getState(), 'triggerCelebration');

    const { rerender } = renderWithProviders(
      <BadgeSystem grades={[]} submittedBeforeDeadline={true} />,
    );

    expect(triggerCelebrationSpy).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        `Досягнення: ${BADGES.DEADLINE_SNIPER.title} — ${BADGES.DEADLINE_SNIPER.description}`,
      ),
    ).toBeInTheDocument();

    rerender(
      withLanguage(withToast(<BadgeSystem grades={[]} submittedBeforeDeadline={true} />)),
    );

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
    expect(
      await screen.findByText(
        `Досягнення: ${BADGES.SEMESTER_MASTER.title} — ${BADGES.SEMESTER_MASTER.description}`,
      ),
    ).toBeInTheDocument();
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
      screen.queryByText(new RegExp(BADGES.SEMESTER_MASTER.title, 'i')),
    ).not.toBeInTheDocument();
  });

  it('should trigger celebration and toast when NIGHT_OWL is unlocked during night check-in', async () => {
    const triggerCelebrationSpy = vi.spyOn(useGamificationStore.getState(), 'triggerCelebration');

    useGamificationStore.setState({ lastCheckInWasNight: true });

    renderWithProviders(<BadgeSystem grades={[]} />);

    expect(triggerCelebrationSpy).toHaveBeenCalledTimes(1);
    expect(useGamificationStore.getState().unlockedBadges).toContain('NIGHT_OWL');
    expect(
      await screen.findByText(
        `Досягнення: ${BADGES.NIGHT_OWL.title} — ${BADGES.NIGHT_OWL.description}`,
      ),
    ).toBeInTheDocument();
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
    expect(
      await screen.findByText(
        `Досягнення: ${BADGES.DEADLINE_SNIPER.title} — ${BADGES.DEADLINE_SNIPER.description}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Досягнення: ${BADGES.NIGHT_OWL.title} — ${BADGES.NIGHT_OWL.description}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Досягнення: ${BADGES.SEMESTER_MASTER.title} — ${BADGES.SEMESTER_MASTER.description}`,
      ),
    ).toBeInTheDocument();
  });
});
