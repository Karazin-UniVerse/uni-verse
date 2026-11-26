import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { MoodleCredentialsGuard } from '../guards/moodle-credentials.guard';
import { MoodleProfileService } from './moodle-profile.service';
import { StudentProfileDto } from './moodle-profile-dto';

interface IProfileService {
  getProfile(
    moodleToken: string,
    moodleId: string,
    userEmail?: string,
  ): Promise<StudentProfileDto>;
}

interface ProfileResponse extends Promise<StudentProfileDto> {}

@ApiTags('moodle')
@Controller('moodle')
@UseGuards(MoodleCredentialsGuard)
@ApiBearerAuth()
export class MoodleProfileController {
  constructor(
    @Inject(MoodleProfileService)
    private readonly profileService: IProfileService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current student profile from Moodle' })
  @ApiResponse({ status: 200, type: StudentProfileDto })
  getProfile(
    @GetUser('moodleToken') moodleToken: string,
    @GetUser('moodleId') moodleId: string,
    @GetUser('email') email?: string,
  ): ProfileResponse {
    return this.profileService.getProfile(moodleToken, moodleId, email);
  }
}
