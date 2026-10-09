import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { fallbackStudentProfile } from '../constants';
import { UserDropdown, getMoodleStatusDetails } from './UserDropdown';

vi.mock('@uni-hub/theme/ThemeSwitcher', () => ({
  ThemeSwitcher: () => null,
}));

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

describe('UserDropdown component', () => {
  it('renders Moodle LMS section when isMoodleIntegrationEnabled is true', () => {
    const html = renderToString(
      React.createElement(UserDropdown, {
        activeStudentProfile: fallbackStudentProfile,
        soundEnabled: false,
        onToggleSound: vi.fn(),
        onClose: vi.fn(),
        onLogout: vi.fn(),
        isMoodleIntegrationEnabled: true,
      }),
    );

    expect(html).toContain('Moodle LMS');
  });

  it('hides Moodle LMS section when isMoodleIntegrationEnabled is false', () => {
    const html = renderToString(
      React.createElement(UserDropdown, {
        activeStudentProfile: fallbackStudentProfile,
        soundEnabled: false,
        onToggleSound: vi.fn(),
        onClose: vi.fn(),
        onLogout: vi.fn(),
        isMoodleIntegrationEnabled: false,
      }),
    );

    expect(html).not.toContain('Moodle LMS');
  });
});
