import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
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
@UseGuards(AtGuard)
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
