import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { MoodleEvent } from '@universe/core/types/moodle';

export class CalendarEventDto implements MoodleEvent {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Test event' })
  name: string;

  @ApiPropertyOptional({ example: 'Description' })
  description?: string;

  @ApiProperty({ example: 1672531200 })
  timestart: number;

  @ApiPropertyOptional({ example: 3600 })
  timeduration?: number;

  @ApiProperty({ example: 'eventtype' })
  eventtype: string;

  @ApiPropertyOptional({ example: 'Course Name' })
  courseName?: string;

  @ApiPropertyOptional({ example: 'https://moodle.example/calendar/view.php' })
  url?: string;

  @ApiPropertyOptional({ example: 'Monday, 1 January, 10:00 AM' })
  formattedtime?: string;
}
