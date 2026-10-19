import { describe, it, expect } from 'vitest';
import React from 'react';
import { NAV_KEY } from '@uni-hub/views/dashboard/constants';
import type { NavItemConfig } from '@uni-hub/views/dashboard/layout/DashboardSidebar';
import { partitionNavItems, isSecondaryActive } from './MobileBottomNav.helpers';

const createMockNavItem = (key: NavItemConfig['key']): NavItemConfig => ({
  key,
  icon: React.createElement('span', null, key),
  labelKey: 'nav.overview.full',
  shortLabelKey: 'nav.overview',
});

describe('MobileBottomNav.helpers', () => {
  describe('partitionNavItems', () => {
    it('partitions full 6 items into 4 primary and 2 secondary items', () => {
      const items: NavItemConfig[] = [
        createMockNavItem(NAV_KEY.Overview),
        createMockNavItem(NAV_KEY.Courses),
        createMockNavItem(NAV_KEY.Grades),
        createMockNavItem(NAV_KEY.Schedule),
        createMockNavItem(NAV_KEY.Assignments),
        createMockNavItem(NAV_KEY.Opportunities),
      ];

      const { primaryItems, secondaryItems } = partitionNavItems(items);

      expect(primaryItems.map((item) => item.key)).toEqual([
        NAV_KEY.Overview,
        NAV_KEY.Grades,
        NAV_KEY.Schedule,
        NAV_KEY.Assignments,
      ]);
      expect(secondaryItems.map((item) => item.key)).toEqual([
        NAV_KEY.Courses,
        NAV_KEY.Opportunities,
      ]);
    });

    it('fills up to 4 primary items if some preferred primary items are absent', () => {
      const items: NavItemConfig[] = [
        createMockNavItem(NAV_KEY.Overview),
        createMockNavItem(NAV_KEY.Courses),
        createMockNavItem(NAV_KEY.Opportunities),
      ];

      const { primaryItems, secondaryItems } = partitionNavItems(items);

      expect(primaryItems.map((item) => item.key)).toEqual([
        NAV_KEY.Overview,
        NAV_KEY.Courses,
        NAV_KEY.Opportunities,
      ]);
      expect(secondaryItems).toHaveLength(0);
    });

    it('handles ConnectMoodle item gracefully in secondary items', () => {
      const items: NavItemConfig[] = [
        createMockNavItem(NAV_KEY.Overview),
        createMockNavItem(NAV_KEY.Courses),
        createMockNavItem(NAV_KEY.Grades),
        createMockNavItem(NAV_KEY.Schedule),
        createMockNavItem(NAV_KEY.Assignments),
        createMockNavItem(NAV_KEY.Opportunities),
        createMockNavItem(NAV_KEY.ConnectMoodle),
      ];

      const { primaryItems, secondaryItems } = partitionNavItems(items);

      expect(primaryItems).toHaveLength(4);
      expect(secondaryItems.map((item) => item.key)).toEqual([
        NAV_KEY.Courses,
        NAV_KEY.Opportunities,
        NAV_KEY.ConnectMoodle,
      ]);
    });
  });

  describe('isSecondaryActive', () => {
    const secondaryItems: NavItemConfig[] = [
      createMockNavItem(NAV_KEY.Courses),
      createMockNavItem(NAV_KEY.Opportunities),
    ];

    it('returns true when activeKey matches an item in secondaryItems', () => {
      expect(isSecondaryActive(NAV_KEY.Opportunities, secondaryItems)).toBe(true);
      expect(isSecondaryActive(NAV_KEY.Courses, secondaryItems)).toBe(true);
    });

    it('returns false when activeKey is in primaryItems', () => {
      expect(isSecondaryActive(NAV_KEY.Overview, secondaryItems)).toBe(false);
      expect(isSecondaryActive(NAV_KEY.Schedule, secondaryItems)).toBe(false);
    });
  });
});
