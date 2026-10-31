import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { fallbackStudentProfile } from '@uni-hub/utils/test-fixtures';
import { UserDropdown, getMoodleStatusDetails, getUserProfileTitle } from './UserDropdown';
import userEvent from '@testing-library/user-event';
import { withAppProviders } from '@uni-hub/utils/test-utils';
import styles from './DashboardShell.module.scss';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from 'sass-embedded';
import { BREAKPOINTS } from '@core/constants/breakpoints';

const dashboardCss = compile(resolve('views/dashboard/layout/DashboardShell.module.scss'), {
  importers: [
    {
      findFileUrl: (url) =>
        url === '@universe/ui/breakpoints.scss'
          ? pathToFileURL(resolve('../ui/breakpoints.scss'))
          : null,
    },
  ],
}).css.replace(/\.([A-Za-z_][\w-]*)/g, (selector, name: string) =>
  styles[name] ? `.${styles[name]}` : selector,
);

describe('UserDropdown helpers', () => {
  it('should return linked status details when isMoodleLinked is true', () => {
    const details = getMoodleStatusDetails(true);

    expect(details.isLinked).toBe(true);
    expect(details.statusKey).toBe('header.moodleConnected');
    expect(details.dotColor).toContain('var(--success-color');
  });

  it('should return unlinked status details when isMoodleLinked is false', () => {
    const details = getMoodleStatusDetails(false);

    expect(details.isLinked).toBe(false);
    expect(details.statusKey).toBe('header.moodleNotConnected');
    expect(details.dotColor).toContain('var(--text-secondary');
  });

  it('should format profile title with group when group exists', () => {
    expect(
      getUserProfileTitle({
        ...fallbackStudentProfile,
        fullName: 'Іван Петренко',
        group: 'CS-21',
      }),
    ).toBe('Іван Петренко (CS-21)');
  });

  it('should format profile title without group when group is empty', () => {
    expect(
      getUserProfileTitle({
        ...fallbackStudentProfile,
        fullName: 'Іван Петренко',
        group: '',
      }),
    ).toBe('Іван Петренко');
  });
});

describe('UserDropdown', () => {
  it.each([
    { label: 'unloaded on mobile', profile: null, width: 375 },
    { label: 'loaded on mobile', profile: fallbackStudentProfile, width: 375 },
    { label: 'unloaded on desktop', profile: null, width: 1024 },
    { label: 'loaded on desktop', profile: fallbackStudentProfile, width: 1024 },
  ])('should keep the profile icon visible when $label', ({ profile, width }) => {
    const originalWidth = window.innerWidth;
    const stylesheet = document.createElement('style');

    stylesheet.textContent = dashboardCss;
    document.head.append(stylesheet);
    window.innerWidth = width;

    try {
      render(
        withAppProviders(
          <UserDropdown
            activeStudentProfile={profile}
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onLogout={vi.fn()}
          />,
        ),
      );

      const trigger = screen.getByRole('button', { name: /меню профілю користувача/i });
      const avatar = trigger.querySelector(`.${styles.avatar}`);

      expect(avatar).toBeVisible();

      if (profile) {
        const name = screen.getByText(profile.fullName);

        if (width < BREAKPOINTS.md) {
          expect(name).not.toBeVisible();
        } else {
          expect(name).toBeVisible();
        }
      }
    } finally {
      stylesheet.remove();
      window.innerWidth = originalWidth;
    }
  });

  it('should keep the menu usable without showing an identity until the profile loads', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      withAppProviders(
        <UserDropdown
          activeStudentProfile={null}
          soundEnabled={true}
          onToggleSound={vi.fn()}
          onLogout={onLogout}
        />,
      ),
    );

    const trigger = screen.getByRole('button', { name: /меню профілю користувача/i });

    expect(trigger).toHaveTextContent('');
    expect(trigger).not.toHaveAttribute('title');
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: /вийти/i }));

    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByText('Барсуков Родіон Сергійович')).not.toBeInTheDocument();
  });

  it('should render a collapsed trigger with the student name and an accessible name', () => {
    render(
      <UserDropdown
        activeStudentProfile={fallbackStudentProfile}
        soundEnabled={true}
        onToggleSound={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /меню профілю користувача/i });

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(fallbackStudentProfile.fullName)).toBeInTheDocument();
  });

  it('should keep the menu content hidden until the dropdown is opened', () => {
    render(
      <UserDropdown
        activeStudentProfile={fallbackStudentProfile}
        soundEnabled={true}
        onToggleSound={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(screen.queryByText('Moodle LMS')).not.toBeInTheDocument();
  });

  it('should render trigger title without group when group is absent and hide group in dropdown', () => {
    render(
      <ThemeProvider>
        <UserDropdown
          activeStudentProfile={fallbackStudentProfile}
          soundEnabled={true}
          onToggleSound={vi.fn()}
          onLogout={vi.fn()}
        />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole('button', { name: /меню профілю користувача/i });

    expect(trigger).toHaveAttribute('title', fallbackStudentProfile.fullName);

    fireEvent.click(trigger);

    expect(screen.getByText(fallbackStudentProfile.email)).toBeInTheDocument();
    expect(screen.queryByText('КС12')).not.toBeInTheDocument();
  });

  it('should render trigger title with group and display group in dropdown when group is present', () => {
    const profileWithGroup = { ...fallbackStudentProfile, group: 'КС-31' };

    render(
      <ThemeProvider>
        <UserDropdown
          activeStudentProfile={profileWithGroup}
          soundEnabled={true}
          onToggleSound={vi.fn()}
          onLogout={vi.fn()}
        />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole('button', { name: /меню профілю користувача/i });

    expect(trigger).toHaveAttribute('title', `${fallbackStudentProfile.fullName} (КС-31)`);

    fireEvent.click(trigger);

    expect(screen.getByText('КС-31')).toBeInTheDocument();
    expect(screen.getByText(fallbackStudentProfile.email)).toBeInTheDocument();
  });

  it('should keep the logout button visible on desktop even when profile is null and Moodle is disabled', () => {
    const stylesheet = document.createElement('style');

    stylesheet.textContent = dashboardCss;
    document.head.append(stylesheet);
    const originalWidth = window.innerWidth;

    window.innerWidth = 1024;

    try {
      const onLogout = vi.fn();

      render(
        withAppProviders(
          <UserDropdown
            activeStudentProfile={null}
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onLogout={onLogout}
            isMoodleIntegrationEnabled={false}
          />,
        ),
      );

      const trigger = screen.getByRole('button', { name: /меню профілю користувача/i });

      fireEvent.click(trigger);

      const logoutButton = screen.getByRole('button', { name: /вийти/i });

      expect(logoutButton).toBeVisible();
    } finally {
      stylesheet.remove();
      window.innerWidth = originalWidth;
    }
  });
});
