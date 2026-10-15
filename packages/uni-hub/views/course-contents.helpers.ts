import type { CourseSection } from '@core/types/moodle';

export function selectVisibleSections(sections: CourseSection[]): CourseSection[] {
  return sections.filter((section) => section.name && section.modules.length > 0);
}
