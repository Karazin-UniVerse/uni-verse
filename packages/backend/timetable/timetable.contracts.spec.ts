import { TeachingType } from '@universe/database';
import { TIMETABLE_ASSIGNMENT_TEACHING_TYPE } from '@universe/core/constants/timetable';

describe('timetable contracts match the Prisma schema', () => {
  it('TeachingType enum matches TIMETABLE_ASSIGNMENT_TEACHING_TYPE', () => {
    expect(Object.values(TeachingType).sort()).toEqual(
      Object.values(TIMETABLE_ASSIGNMENT_TEACHING_TYPE).sort(),
    );
  });
});
