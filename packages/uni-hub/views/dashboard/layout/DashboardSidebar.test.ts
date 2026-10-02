import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, getVisibleNavItems } from './DashboardSidebar';

describe('DashboardSidebar helpers', () => {
  it('returns standard NAV_ITEMS when isMoodleLinked is true', () => {
    const items = getVisibleNavItems(true);

    expect(items).toEqual(NAV_ITEMS);
    expect(items.some((item) => item.key === 'connectMoodle')).toBe(false);
  });

  it('includes connectMoodle item when isMoodleLinked is false', () => {
    const items = getVisibleNavItems(false);

    expect(items.length).toBe(NAV_ITEMS.length + 1);
    expect(items.some((item) => item.key === 'connectMoodle')).toBe(true);

    const connectItem = items.find((item) => item.key === 'connectMoodle');

    expect(connectItem?.labelKey).toBe('nav.connectMoodle.full');
    expect(connectItem?.shortLabelKey).toBe('nav.connectMoodle');
  });
});
