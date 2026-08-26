import { Module } from '@nestjs/common';
import { MoodleClientService } from './moodle-client/moodle.client.service';
import { MoodleController } from './moodle.controller';
import { UserService } from '../user/user.service';
import { MoodleCoursesService } from './moodle-courses/moodle-courses.service';
import { MoodleGradesService } from './moodle-grades/moodle-grades.service';
import { MoodleAssignmentsService } from './moodle-assignments/moodle-assignments.service';
import { MoodleAssignmentsController } from './moodle-assignments/moodle-assignments.controller';
import { MoodleEventsService } from './moodle-events/moodle-events.service';
import { MoodleEventsController } from './moodle-events/moodle-events.controller';
import { MoodleNotificationsService } from './moodle-notifications/moodle-notifications.service';
import { MoodleNotificationsController } from './moodle-notifications/moodle-notifications.controller';
import { MoodleFilesService } from './moodle-files/moodle-files.service';
import { MoodleFilesController } from './moodle-files/moodle-files.controller';
import { MoodleStatisticsService } from './moodle-statistics/moodle-statistics.service';
import { MoodleStatisticsController } from './moodle-statistics/moodle-statistics.controller';
import { MoodleCourseContentsService } from './moodle-course-contents/moodle-course-contents.service';
import { MoodleCourseContentsController } from './moodle-course-contents/moodle-course-contents.controller';

@Module({
  controllers: [
    MoodleController,
    MoodleAssignmentsController,
    MoodleEventsController,
    MoodleNotificationsController,
    MoodleFilesController,
    MoodleStatisticsController,
    MoodleCourseContentsController,
  ],
  providers: [
    MoodleClientService,
    UserService,
    MoodleCoursesService,
    MoodleGradesService,
    MoodleAssignmentsService,
    MoodleEventsService,
    MoodleNotificationsService,
    MoodleFilesService,
    MoodleStatisticsService,
    MoodleCourseContentsService,
  ],
  exports: [
    MoodleClientService,
    MoodleCoursesService,
    MoodleGradesService,
    MoodleAssignmentsService,
    MoodleEventsService,
    MoodleNotificationsService,
    MoodleFilesService,
    MoodleStatisticsService,
    MoodleCourseContentsService,
  ],
})
export class MoodleModule {}
