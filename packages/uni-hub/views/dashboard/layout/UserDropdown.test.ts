import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { fallbackStudentProfile } from '../constants';
import { UserDropdown, getMoodleStatusDetails } from './UserDropdown';

describe('UserDropdown helpers', () => {
  it('returns linked status details when isMoodleLinked is true', () => {
    const details = getMoodleStatusDetails(true);

    expect(details.isLinked).toBe(true);
    expect(details.statusKey).toBe('header.moodleConnected');
    expect(details.dotColor).toContain('var(--success-color');
  });

  it('returns unlinked status details when isMoodleLinked is false', () => {
    const details = getMoodleStatusDetails(false);

    expect(details.isLinked).toBe(false);
    expect(details.statusKey).toBe('header.moodleNotConnected');
    expect(details.dotColor).toContain('var(--text-secondary');
  });
});

describe('UserDropdown', () => {
  const html = renderToString(
    React.createElement(UserDropdown, {
      activeStudentProfile: fallbackStudentProfile,
      soundEnabled: true,
      onToggleSound: vi.fn(),
      onLogout: vi.fn(),
    }),
  );

  it('renders a collapsed trigger with the student name and an accessible name', () => {
    expect(html).toContain(fallbackStudentProfile.fullName);
    expect(html).toContain('aria-label="Меню профілю користувача"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('keeps the menu content hidden until the dropdown is opened', () => {
    expect(html).not.toContain('Moodle LMS');
  });
});
