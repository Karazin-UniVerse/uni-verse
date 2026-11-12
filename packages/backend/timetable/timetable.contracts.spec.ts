import { SlotPreference, TeachingType } from '@universe/database';
import {
  SLOT_PREFERENCE,
  TIMETABLE_ASSIGNMENT_TEACHING_TYPE,
} from '@universe/core/constants/timetable';

describe('timetable contracts match the Prisma schema', () => {
  it('TeachingType enum matches TIMETABLE_ASSIGNMENT_TEACHING_TYPE', () => {
    expect(Object.values(TeachingType).sort()).toEqual(
      Object.values(TIMETABLE_ASSIGNMENT_TEACHING_TYPE).sort(),
    );
  });

  it('SlotPreference enum matches SLOT_PREFERENCE', () => {
    expect(Object.values(SlotPreference).sort()).toEqual(
      Object.values(SLOT_PREFERENCE).sort(),
    );
  });
});
