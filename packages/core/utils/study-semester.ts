import {
  ELECTIVE_RESERVED_SLOT,
  ELECTIVE_RESERVED_STUDY_SEMESTERS,
  SEMESTERS_PER_YEAR,
} from '../constants/timetable.ts';

type ReservedSlotParams = {
  studySemester: number | undefined;
  weekday: number;
  firstPair: number;
  lastPair: number;
};

/** Whether a class would occupy the slot kept free for the students' elective in this semester. */
export function isReservedSlot({
  studySemester,
  weekday,
  firstPair,
  lastPair,
}: ReservedSlotParams): boolean {
  return (
    studySemester !== undefined &&
    studySemester >= ELECTIVE_RESERVED_STUDY_SEMESTERS.FIRST &&
    studySemester <= ELECTIVE_RESERVED_STUDY_SEMESTERS.LAST &&
    weekday === ELECTIVE_RESERVED_SLOT.WEEKDAY &&
    firstPair <= ELECTIVE_RESERVED_SLOT.PAIR &&
    lastPair >= ELECTIVE_RESERVED_SLOT.PAIR
  );
}

/** The semester within the academic year (1 or 2) that a study semester falls into. */
export function getSemesterOfYear(studySemester: number): number {
  return ((studySemester - 1) % SEMESTERS_PER_YEAR) + 1;
}
