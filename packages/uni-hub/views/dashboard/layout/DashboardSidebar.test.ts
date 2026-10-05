import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { FeatureToggleProvider } from '@uni-hub/features';
import { NAV_ITEMS, getVisibleNavItems, DashboardSidebar } from './DashboardSidebar';

describe('DashboardSidebar navigation & feature gating', () => {
  it('includes all navigation items when all feature flags are enabled', () => {
    expect(NAV_ITEMS).toHaveLength(6);

    const visible = getVisibleNavItems({
      isMoodleIntegrationEnabled: true,
      isEDeanEnabled: true,
      isOpportunitiesPlatformEnabled: true,
      isFeaturePanelEnabled: true,
    });

    expect(visible.map((item) => item.key)).toEqual([
      'overview',
      'courses',
      'grades',
      'schedule',
      'assignments',
      'opportunities',
    ]);
  });

  it('filters out Moodle and Opportunities items when flags are disabled (prod default)', () => {
    const visible = getVisibleNavItems({
      isMoodleIntegrationEnabled: false,
      isEDeanEnabled: true,
      isOpportunitiesPlatformEnabled: false,
      isFeaturePanelEnabled: false,
    });

    expect(visible.map((item) => item.key)).toEqual(['overview', 'schedule']);
  });

  it('retains only overview if all feature flags are turned off', () => {
    const visible = getVisibleNavItems({
      isMoodleIntegrationEnabled: false,
      isEDeanEnabled: false,
      isOpportunitiesPlatformEnabled: false,
      isFeaturePanelEnabled: false,
    });

    expect(visible.map((item) => item.key)).toEqual(['overview']);
  });

  it('renders correctly with LanguageProvider, ThemeProvider, and FeatureToggleProvider', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(
            FeatureToggleProvider,
            {
              initialFlags: {
                isMoodleIntegrationEnabled: false,
                isEDeanEnabled: true,
                isOpportunitiesPlatformEnabled: true,
              },
            },
            React.createElement(DashboardSidebar, {
              collapsed: false,
              onToggleCollapsed: () => {},
              mobileMenuOpen: false,
              onCloseMobileMenu: () => {},
              activeKey: 'overview',
              onSelectKey: () => {},
              soundEnabled: false,
              onLogout: () => {},
            }),
          ),
        ),
      ),
    );

    // Moodle links should not be present
    expect(html).not.toContain('moodle.universemvp.tech');
    // Overview and Schedule should be rendered
    expect(html).toContain('Картка студента');
    expect(html).toContain('Розклад');
  });
});
