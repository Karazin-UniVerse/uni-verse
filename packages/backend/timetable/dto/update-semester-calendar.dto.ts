import { PartialType } from '@nestjs/swagger';
import type { UpdateSemesterCalendarRequest } from '@universe/core/types/timetable';
import { CreateSemesterCalendarDto } from './create-semester-calendar.dto';

export class UpdateSemesterCalendarDto
  extends PartialType(CreateSemesterCalendarDto, {
    skipNullProperties: false,
  })
  implements UpdateSemesterCalendarRequest {}
