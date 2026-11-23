import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  RequestTimeoutException,
} from '@nestjs/common';
import { MoodleClientService } from '../moodle-client/moodle.client.service';
import type { MoodleUploadedFile } from '../../types/FileUpload';

export interface MoodleDownloadedFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const DOWNLOAD_TIMEOUT_MS = 15000;
const ALLOWED_PLUGINFILE_PREFIXES = [
  '/webservice/pluginfile.php/',
  '/pluginfile.php/',
];

function extractSafeFilename(pathname: string): string {
  const rawSegment = pathname.split('/').findLast(Boolean) ?? '';

  if (!rawSegment) {
    return 'attachment';
  }

  let decoded = rawSegment;

  try {
    decoded = decodeURIComponent(rawSegment);
  } catch {
    decoded = rawSegment;
  }

  const sanitized = decoded.replace(/[\\/\r\n"\0]/g, '_').trim();

  return sanitized || 'attachment';
}

function isMoodleJsonError(contentType: string, buffer: Buffer): string | null {
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    const parsed = JSON.parse(buffer.toString('utf8')) as unknown;

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'exception' in parsed
    ) {
      const message = (parsed as { message?: unknown }).message;

      return typeof message === 'string' ? message : 'Download failed';
    }
  } catch {
    // Non-JSON payload labeled as JSON: treat as binary download
  }

  return null;
}

@Injectable()
export class MoodleFilesService {
  constructor(private readonly moodleClient: MoodleClientService) {}

  private resolveDownloadTarget(
    rawUrl: string,
    moodleToken: string,
  ): { path: string; filename: string } {
    const moodleOrigin = new URL(this.moodleClient.getBaseUrl()).origin;

    let parsed: URL;

    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid file URL');
    }

    if (
      parsed.protocol !== 'https:' ||
      parsed.origin !== moodleOrigin ||
      parsed.username !== '' ||
      parsed.password !== ''
    ) {
      throw new BadRequestException('File URL origin is not allowed');
    }

    let decodedPathname: string;

    try {
      decodedPathname = decodeURIComponent(parsed.pathname);
    } catch {
      throw new BadRequestException('Invalid file URL');
    }

    const hasTraversalSegment = decodedPathname.split(/[\\/]/).includes('..');
    const isAllowedPath =
      !hasTraversalSegment &&
      ALLOWED_PLUGINFILE_PREFIXES.some(
        (prefix) =>
          parsed.pathname.startsWith(prefix) &&
          decodedPathname.startsWith(prefix),
      );

    if (!isAllowedPath) {
      throw new BadRequestException('File URL path is not allowed');
    }

    const searchParams = new URLSearchParams(parsed.search);

    searchParams.delete('token');
    searchParams.delete('wstoken');
    searchParams.set('token', moodleToken);

    return {
      path: `${parsed.pathname}?${searchParams.toString()}`,
      filename: extractSafeFilename(parsed.pathname),
    };
  }

  async downloadFile(
    moodleToken: string,
    fileUrl: string,
  ): Promise<MoodleDownloadedFile> {
    if (!moodleToken) {
      throw new BadRequestException('Token is not provided');
    }

    const { path, filename } = this.resolveDownloadTarget(fileUrl, moodleToken);

    let response: Response;

    try {
      response = await this.moodleClient.fetch(path, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new RequestTimeoutException('Moodle file download timeout');
      }

      throw new InternalServerErrorException('Download failed');
    }

    if (!response.ok) {
      throw new InternalServerErrorException('Download failed');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const moodleError = isMoodleJsonError(contentType, buffer);

    if (moodleError !== null) {
      throw new BadRequestException(moodleError);
    }

    return { buffer, contentType, filename };
  }

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
