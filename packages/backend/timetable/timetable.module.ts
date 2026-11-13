import { Module } from '@nestjs/common';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { TimetableReschedulingService } from './timetable-rescheduling.service';
import { TimetableRescheduleRequestsService } from './timetable-reschedule-requests.service';
import { TimetableRescheduleRequestsController } from './timetable-reschedule-requests.controller';

@Module({
  controllers: [TimetableController, TimetableRescheduleRequestsController],
  providers: [
    TimetableService,
    TimetableReschedulingService,
    TimetableRescheduleRequestsService,
  ],
  exports: [TimetableService],
})
export class TimetableModule {}
