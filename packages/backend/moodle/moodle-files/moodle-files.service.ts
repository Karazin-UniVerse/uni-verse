import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import type { MoodleUploadedFile } from '../../types/FileUpload';

@Injectable()
export class MoodleFilesService {
  constructor(private readonly moodleClient: MoodleClientService) {}

  async uploadFile(
    moodleToken: string,
    filename: string,
    filebase64: string,
  ): Promise<MoodleUploadedFile[]> {
    if (!moodleToken) {
      throw new BadRequestException('Token is not provided');
    }

    const base64Data = filebase64.includes(',')
      ? filebase64.split(',')[1]
      : filebase64;
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer]);

    const formData = new FormData();

    formData.append('token', moodleToken);
    formData.append('file_1', blob, filename);

    const response = await this.moodleClient.fetch('/webservice/upload.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Upload failed: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as
      MoodleUploadedFile[] | { exception: string; message: string };

    if (!Array.isArray(data) && 'exception' in data) {
      throw new BadRequestException(data.message);
    }

    return data;
  }
}
