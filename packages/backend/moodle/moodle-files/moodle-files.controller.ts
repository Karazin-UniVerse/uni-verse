import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { MoodleCredentialsGuard } from '../guards/moodle-credentials.guard';
import { MoodleFilesService } from './moodle-files.service';
import { DownloadFileQueryDto, UploadFileDto } from './moodle-files-dto';

@ApiTags('moodle')
@Controller('moodle/files')
@UseGuards(MoodleCredentialsGuard)
@ApiBearerAuth()
export class MoodleFilesController {
  constructor(private readonly filesService: MoodleFilesService) {}

  @Get('download')
  @ApiOperation({ summary: 'Download a Moodle attachment securely' })
  @ApiQuery({ name: 'url', type: String, required: true })
  @ApiResponse({
    status: 200,
    type: Object,
    description: 'Attachment file bytes',
  })
  async downloadFile(
    @GetUser('moodleToken') moodleToken: string,
    @Query() query: DownloadFileQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.filesService.downloadFile(moodleToken, query.url);
    const asciiFilename =
      file.filename.replace(/[^\x20-\x7E]/g, '_') || 'attachment';

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(file.buffer);
  }

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
