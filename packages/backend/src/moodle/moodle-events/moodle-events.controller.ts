import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AtGuard } from '../../auth/guards/at.guard';
import { MoodleEventsService } from './moodle-events.service';
import { CalendarEventDto } from './moodle-events-dto';

@ApiTags('moodle')
@Controller('moodle')
@UseGuards(AtGuard)
@ApiBearerAuth()
export class MoodleEventsController {
  constructor(private readonly eventsService: MoodleEventsService) {}

  @Get('events')
  @ApiOperation({ summary: 'Get upcoming calendar events' })
  @ApiResponse({ status: 200, type: [CalendarEventDto] })
  async getEvents(
    @GetUser('moodleToken') moodleToken: string,
    @GetUser('moodleId') moodleId: string,
  ): Promise<CalendarEventDto[]> {
    return this.eventsService.getUpcomingEvents(moodleToken, moodleId);
  }
}
