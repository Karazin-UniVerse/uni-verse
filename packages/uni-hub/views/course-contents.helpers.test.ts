import { describe, expect, it } from 'vitest';
import type { CourseSection } from '@core/types/moodle';
import { selectVisibleSections } from './course-contents.helpers';

function buildSection(id: number, name: string, moduleCount: number): CourseSection {
  return {
    id,
    name,
    summary: '',
    modules: Array.from({ length: moduleCount }, (_, index) => ({
      id: id * 100 + index,
      name: `Module ${index}`,
      modname: 'resource',
    })),
  };
}

describe('selectVisibleSections', () => {
  it('keeps only sections that have a name and at least one module', () => {
    const visible = buildSection(1, 'Week 1', 2);

    expect(
      selectVisibleSections([buildSection(2, '', 3), buildSection(3, 'Empty week', 0), visible]),
    ).toEqual([visible]);
  });

  it('returns an empty list for no sections', () => {
    expect(selectVisibleSections([])).toEqual([]);
  });
});
