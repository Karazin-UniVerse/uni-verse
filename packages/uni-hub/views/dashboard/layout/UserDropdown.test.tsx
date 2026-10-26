import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { fallbackStudentProfile } from '../constants';
import { UserDropdown, getMoodleStatusDetails } from './UserDropdown';

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
});

describe('UserDropdown', () => {
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
