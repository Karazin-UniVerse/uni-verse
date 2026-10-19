import { NAV_KEY, type NavKey } from '@uni-hub/views/dashboard/constants';
import type { NavItemConfig } from '@uni-hub/views/dashboard/layout/DashboardSidebar';

export const PRIMARY_NAV_KEYS: readonly NavKey[] = [
  NAV_KEY.Overview,
  NAV_KEY.Study,
  NAV_KEY.Schedule,
];

export interface PartitionedNavItems {
  primaryItems: NavItemConfig[];
  secondaryItems: NavItemConfig[];
}

export function partitionNavItems(visibleItems: NavItemConfig[]): PartitionedNavItems {
  const primaryKeysSet = new Set<NavKey>(PRIMARY_NAV_KEYS);
  const primaryCandidates: NavItemConfig[] = [];
  const otherCandidates: NavItemConfig[] = [];

  for (const item of visibleItems) {
    if (primaryKeysSet.has(item.key)) {
      primaryCandidates.push(item);
    } else {
      otherCandidates.push(item);
    }
  }

  const primaryItems: NavItemConfig[] = [...primaryCandidates];
  const secondaryItems: NavItemConfig[] = [];

  for (const item of otherCandidates) {
    if (primaryItems.length < 3) {
      primaryItems.push(item);
    } else {
      secondaryItems.push(item);
    }
  }

  return {
    primaryItems,
    secondaryItems,
  };
}

export function isSecondaryActive(activeKey: NavKey, secondaryItems: NavItemConfig[]): boolean {
  return secondaryItems.some((item) => item.key === activeKey);
}
