import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalendarEventDto {
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
}
