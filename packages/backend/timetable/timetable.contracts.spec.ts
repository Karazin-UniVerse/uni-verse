import {
  RescheduleScope,
  RescheduleRequestStatus,
  SlotPreference,
  TeachingType,
} from '@universe/database';
import {
  SLOT_PREFERENCE,
  RESCHEDULE_SCOPE,
  RESCHEDULE_REQUEST_STATUS,
  TIMETABLE_ASSIGNMENT_TEACHING_TYPE,
} from '@universe/core/constants/timetable';

describe('timetable contracts match the Prisma schema', () => {
  it('rescheduling scope and request status match the database enums', () => {
    expect(Object.values(RescheduleScope).sort()).toEqual(
      Object.values(RESCHEDULE_SCOPE).sort(),
    );
    expect(Object.values(RescheduleRequestStatus).sort()).toEqual(
      Object.values(RESCHEDULE_REQUEST_STATUS).sort(),
    );
  });
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
