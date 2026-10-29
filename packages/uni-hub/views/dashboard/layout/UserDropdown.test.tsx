import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { fallbackStudentProfile } from '@uni-hub/utils/test-fixtures';
import { UserDropdown, getMoodleStatusDetails, getUserProfileTitle } from './UserDropdown';
import userEvent from '@testing-library/user-event';
import { withAppProviders } from '@uni-hub/utils/test-utils';

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
});
