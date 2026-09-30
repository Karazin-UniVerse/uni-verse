import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AtGuard } from '../../auth/guards/at.guard';
import { MoodleProfileService } from './moodle-profile.service';
import { StudentProfileDto } from './moodle-profile-dto';

@ApiTags('moodle')
@Controller('moodle')
@UseGuards(AtGuard)
@ApiBearerAuth()
export class MoodleProfileController {
  constructor(private readonly profileService: MoodleProfileService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current student profile from Moodle' })
  @ApiResponse({ status: 200, type: StudentProfileDto })
  async getProfile(
    @GetUser('moodleToken') moodleToken: string,
    @GetUser('moodleId') moodleId: string,
    @GetUser('email') email?: string,
  ): Promise<StudentProfileDto> {
    return this.profileService.getProfile(moodleToken, moodleId, email);
  }
}
