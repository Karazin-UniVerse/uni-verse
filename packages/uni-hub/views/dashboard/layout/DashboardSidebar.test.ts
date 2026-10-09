import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { ThemeProvider } from '@uni-hub/theme/ThemeContext';
import { FeatureToggleProvider } from '@uni-hub/features';
import { NAV_KEY } from '../constants';
import type { FeatureFlags } from '@core/constants/features';
import { NAV_ITEMS, getVisibleNavItems, DashboardSidebar } from './DashboardSidebar';

const allEnabledFlags: FeatureFlags = {
  isMoodleIntegrationEnabled: true,
  isEDeanEnabled: true,
  isOpportunitiesPlatformEnabled: true,
  isFeaturePanelEnabled: true,
};

describe('DashboardSidebar helpers', () => {
  it('returns standard NAV_ITEMS when isMoodleLinked is true', () => {
    const items = getVisibleNavItems(allEnabledFlags, true);

    expect(items).toEqual(NAV_ITEMS);
    expect(items.some((item) => item.key === NAV_KEY.ConnectMoodle)).toBe(false);
  });

  it('includes connectMoodle item when isMoodleLinked is false', () => {
    const items = getVisibleNavItems(allEnabledFlags, false);

    expect(items.length).toBe(NAV_ITEMS.length + 1);
    expect(items.some((item) => item.key === NAV_KEY.ConnectMoodle)).toBe(true);

    const connectItem = items.find((item) => item.key === NAV_KEY.ConnectMoodle);

    expect(connectItem?.labelKey).toBe('nav.connectMoodle');
  });
});

describe('DashboardSidebar navigation & feature gating', () => {
  it('includes all navigation items when all feature flags are enabled', () => {
    expect(NAV_ITEMS).toHaveLength(4);

    const visible = getVisibleNavItems(allEnabledFlags, true);

    expect(visible.map((item) => item.key)).toEqual([
      NAV_KEY.Overview,
      NAV_KEY.Study,
      NAV_KEY.Schedule,
      NAV_KEY.Opportunities,
    ]);
  });

  it('filters out Moodle and Opportunities items when flags are disabled (prod default)', () => {
    const visible = getVisibleNavItems(
      {
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: true,
        isOpportunitiesPlatformEnabled: false,
        isFeaturePanelEnabled: false,
      },
      true,
    );

    expect(visible.map((item) => item.key)).toEqual([NAV_KEY.Overview, NAV_KEY.Schedule]);
  });

  it('retains only overview if all feature flags are turned off', () => {
    const visible = getVisibleNavItems(
      {
        isMoodleIntegrationEnabled: false,
        isEDeanEnabled: false,
        isOpportunitiesPlatformEnabled: false,
        isFeaturePanelEnabled: false,
      },
      true,
    );

    expect(visible.map((item) => item.key)).toEqual([NAV_KEY.Overview]);
  });

  it('renders correctly with LanguageProvider, ThemeProvider, and FeatureToggleProvider', () => {
    const originalEdean = process.env.NEXT_PUBLIC_FEATURE_EDEAN;

    process.env.NEXT_PUBLIC_FEATURE_EDEAN = 'true';

    try {
      const html = renderToStaticMarkup(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(
              FeatureToggleProvider,
              null,
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
      expect(html).toContain('Стіна');
      expect(html).toContain('Розклад');
    } finally {
      if (originalEdean !== undefined) {
        process.env.NEXT_PUBLIC_FEATURE_EDEAN = originalEdean;
      } else {
        delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
      }
    }
  });
});
