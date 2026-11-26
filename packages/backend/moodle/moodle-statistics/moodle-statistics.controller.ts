import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { MoodleCredentialsGuard } from '../guards/moodle-credentials.guard';
import { MoodleStatisticsService } from './moodle-statistics.service';
import { StatisticsDto } from './moodle-statistics-dto';

@ApiTags('moodle')
@Controller('moodle')
@UseGuards(MoodleCredentialsGuard)
@ApiBearerAuth()
export class MoodleStatisticsController {
  constructor(private readonly statisticsService: MoodleStatisticsService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get user moodle statistics' })
  @ApiResponse({ status: 200, type: StatisticsDto })
  async getStatistics(
    @GetUser('moodleToken') moodleToken: string,
    @GetUser('moodleId') moodleId: string,
  ): Promise<StatisticsDto> {
    return this.statisticsService.getStatistics(moodleToken, moodleId);
  }
}
