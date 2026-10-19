import { describe, it, expect } from 'vitest';
import React from 'react';
import { NAV_KEY } from '@uni-hub/views/dashboard/constants';
import type { NavItemConfig } from '@uni-hub/views/dashboard/layout/DashboardSidebar';
import { partitionNavItems, isSecondaryActive } from './MobileBottomNav.helpers';

const createMockNavItem = (key: NavItemConfig['key']): NavItemConfig => ({
  key,
  icon: React.createElement('span', null, key),
  labelKey: 'nav.overview',
  shortLabelKey: 'nav.overview',
});

describe('MobileBottomNav.helpers', () => {
  describe('partitionNavItems', () => {
    it('partitions full nav items into 3 primary and remaining secondary items', () => {
      const items: NavItemConfig[] = [
        createMockNavItem(NAV_KEY.Overview),
        createMockNavItem(NAV_KEY.Study),
        createMockNavItem(NAV_KEY.Schedule),
        createMockNavItem(NAV_KEY.Opportunities),
      ];

      const { primaryItems, secondaryItems } = partitionNavItems(items);

      expect(primaryItems.map((item) => item.key)).toEqual([
        NAV_KEY.Overview,
        NAV_KEY.Study,
        NAV_KEY.Schedule,
      ]);
      expect(secondaryItems.map((item) => item.key)).toEqual([NAV_KEY.Opportunities]);
    });

    it('fills up to 3 primary items if some preferred primary items are absent', () => {
      const items: NavItemConfig[] = [
        createMockNavItem(NAV_KEY.Overview),
        createMockNavItem(NAV_KEY.Opportunities),
      ];

      const { primaryItems, secondaryItems } = partitionNavItems(items);

      expect(primaryItems.map((item) => item.key)).toEqual([
        NAV_KEY.Overview,
        NAV_KEY.Opportunities,
      ]);
      expect(secondaryItems).toHaveLength(0);
    });

    it('handles ConnectMoodle item gracefully in secondary items', () => {
      const items: NavItemConfig[] = [
        createMockNavItem(NAV_KEY.Overview),
        createMockNavItem(NAV_KEY.Study),
        createMockNavItem(NAV_KEY.Schedule),
        createMockNavItem(NAV_KEY.Opportunities),
        createMockNavItem(NAV_KEY.ConnectMoodle),
      ];

      const { primaryItems, secondaryItems } = partitionNavItems(items);

      expect(primaryItems).toHaveLength(3);
      expect(secondaryItems.map((item) => item.key)).toEqual([
        NAV_KEY.Opportunities,
        NAV_KEY.ConnectMoodle,
      ]);
    });
  });

  describe('isSecondaryActive', () => {
    const secondaryItems: NavItemConfig[] = [
      createMockNavItem(NAV_KEY.Opportunities),
      createMockNavItem(NAV_KEY.ConnectMoodle),
    ];

    it('returns true when activeKey matches an item in secondaryItems', () => {
      expect(isSecondaryActive(NAV_KEY.Opportunities, secondaryItems)).toBe(true);
      expect(isSecondaryActive(NAV_KEY.ConnectMoodle, secondaryItems)).toBe(true);
    });

    it('returns false when activeKey is in primaryItems', () => {
      expect(isSecondaryActive(NAV_KEY.Overview, secondaryItems)).toBe(false);
      expect(isSecondaryActive(NAV_KEY.Schedule, secondaryItems)).toBe(false);
    });
  });
});
