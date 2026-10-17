import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { StreakBadge } from './StreakBadge';

const LanguageSetter: React.FC<{ lang: 'uk' | 'en' }> = ({ lang }) => {
  const { setLanguage } = useLanguage();

  React.useEffect(() => {
    setLanguage(lang);
  }, [lang, setLanguage]);

  return <StreakBadge />;
};

describe('StreakBadge', () => {
  beforeEach(() => {
    useGamificationStore.setState({
      currentStreak: 0,
      lastActiveDate: null,
      unlockedBadges: [],
    });
  });

  it('should render streak badge with current count and flame icon', () => {
    useGamificationStore.setState({ currentStreak: 5 });

    const { container } = render(
      <LanguageProvider>
        <StreakBadge />
      </LanguageProvider>,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should display correct Ukrainian plural forms (день, дні, днів)', () => {
    // 1 день
    useGamificationStore.setState({ currentStreak: 1 });
    const { rerender } = render(
      <LanguageProvider>
        <LanguageSetter lang="uk" />
      </LanguageProvider>,
    );

    expect(screen.getByText('день')).toBeInTheDocument();

    // 3 дні
    act(() => {
      useGamificationStore.setState({ currentStreak: 3 });
    });
    rerender(
      <LanguageProvider>
        <LanguageSetter lang="uk" />
      </LanguageProvider>,
    );
    expect(screen.getByText('дні')).toBeInTheDocument();

    // 5 днів
    act(() => {
      useGamificationStore.setState({ currentStreak: 5 });
    });
    rerender(
      <LanguageProvider>
        <LanguageSetter lang="uk" />
      </LanguageProvider>,
    );
    expect(screen.getByText('днів')).toBeInTheDocument();

    // 12 днів
    act(() => {
      useGamificationStore.setState({ currentStreak: 12 });
    });
    rerender(
      <LanguageProvider>
        <LanguageSetter lang="uk" />
      </LanguageProvider>,
    );
    expect(screen.getByText('днів')).toBeInTheDocument();

    // 21 день
    act(() => {
      useGamificationStore.setState({ currentStreak: 21 });
    });
    rerender(
      <LanguageProvider>
        <LanguageSetter lang="uk" />
      </LanguageProvider>,
    );
    expect(screen.getByText('день')).toBeInTheDocument();
  });

  it('should display correct English plural forms (day, days)', () => {
    useGamificationStore.setState({ currentStreak: 1 });
    const { rerender } = render(
      <LanguageProvider>
        <LanguageSetter lang="en" />
      </LanguageProvider>,
    );

    expect(screen.getByText('day')).toBeInTheDocument();

    act(() => {
      useGamificationStore.setState({ currentStreak: 7 });
    });
    rerender(
      <LanguageProvider>
        <LanguageSetter lang="en" />
      </LanguageProvider>,
    );
    expect(screen.getByText('days')).toBeInTheDocument();
  });

  it('should update rendered count when streak in store changes', () => {
    useGamificationStore.setState({ currentStreak: 3 });
    render(
      <LanguageProvider>
        <StreakBadge />
      </LanguageProvider>,
    );

    expect(screen.getByText('3')).toBeInTheDocument();

    act(() => {
      useGamificationStore.setState({ currentStreak: 10 });
    });

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should set accessible title attribute with streak count and plural label', () => {
    useGamificationStore.setState({ currentStreak: 4 });
    const { container } = render(
      <LanguageProvider>
        <LanguageSetter lang="uk" />
      </LanguageProvider>,
    );

    const badge = container.querySelector('[title]');

    expect(badge).toHaveAttribute('title', 'Стрік: 4 дні');
  });
});
