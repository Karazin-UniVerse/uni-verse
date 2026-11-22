import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { MoodleCredentialsGuard } from '../guards/moodle-credentials.guard';
import { MoodleFilesService } from './moodle-files.service';
import { UploadFileDto } from './moodle-files-dto';

@ApiTags('moodle')
@Controller('moodle/files')
@UseGuards(MoodleCredentialsGuard)
@ApiBearerAuth()
export class MoodleFilesController {
  constructor(private readonly filesService: MoodleFilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload file to draft area' })
  @ApiBody({ type: UploadFileDto })
  @ApiResponse({ status: 201, type: Object })
  async uploadFile(
    @GetUser('moodleToken') moodleToken: string,
    @Body() dto: UploadFileDto,
  ): Promise<unknown> {
    return this.filesService.uploadFile(
      moodleToken,
      dto.filename,
      dto.filebase64,
    );
  }
}
