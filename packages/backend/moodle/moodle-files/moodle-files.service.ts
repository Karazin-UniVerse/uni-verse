import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  PayloadTooLargeException,
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
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_PLUGINFILE_PREFIXES = [
  '/webservice/pluginfile.php/',
  '/pluginfile.php/',
];

function extractSafeFilename(pathname: string): string {
  const rawSegment = pathname.split('/').at(-1) ?? '';

  if (!rawSegment) {
    return 'attachment';
  }

  const decoded = decodeURIComponent(rawSegment);
  const sanitized = decoded.replace(/[\\/\r\n"\0]/g, '_').trim();

  return sanitized || 'attachment';
}

function stripBasePath(pathname: string, basePath: string): string | null {
  if (!basePath) {
    return pathname;
  }

  return pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length)
    : null;
}

function isMoodleJsonError(contentType: string, buffer: Buffer): string | null {
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    const parsed = JSON.parse(buffer.toString('utf8')) as unknown;

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    if (
      typeof record.exception === 'string' &&
      record.exception.length > 0 &&
      typeof record.errorcode === 'string' &&
      record.errorcode.length > 0 &&
      typeof record.message === 'string' &&
      record.message.length > 0
    ) {
      return record.message;
    }
  } catch {
    // Non-JSON payload labeled as JSON: treat as binary download
  }

  return null;
}

async function readBoundedResponseBuffer(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const contentLength = Number(response.headers.get('content-length'));

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new PayloadTooLargeException(
      'Downloaded file exceeds maximum allowed size',
    );
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.byteLength > maxBytes) {
      throw new PayloadTooLargeException(
        'Downloaded file exceeds maximum allowed size',
      );
    }

    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new PayloadTooLargeException(
        'Downloaded file exceeds maximum allowed size',
      );
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, totalBytes);
}

@Injectable()
export class MoodleFilesService {
  constructor(private readonly moodleClient: MoodleClientService) {}

  private resolveDownloadTarget(
    rawUrl: string,
    moodleToken: string,
  ): { path: string; filename: string } {
    const moodleUrl = new URL(this.moodleClient.getBaseUrl());
    const basePath = moodleUrl.pathname.replace(/\/+$/, '');

    let parsed: URL;

    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid file URL');
    }

    if (
      parsed.protocol !== 'https:' ||
      parsed.origin !== moodleUrl.origin ||
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

    const relativePathname = stripBasePath(parsed.pathname, basePath);
    const relativeDecodedPathname = stripBasePath(decodedPathname, basePath);
    const hasTraversalSegment =
      relativeDecodedPathname !== null &&
      relativeDecodedPathname.split(/[\\/]/).includes('..');
    const isAllowedPath =
      relativePathname !== null &&
      relativeDecodedPathname !== null &&
      !hasTraversalSegment &&
      ALLOWED_PLUGINFILE_PREFIXES.some(
        (prefix) =>
          relativePathname.startsWith(prefix) &&
          relativeDecodedPathname.startsWith(prefix),
      );

    if (!isAllowedPath) {
      throw new BadRequestException('File URL path is not allowed');
    }

    const searchParams = new URLSearchParams(parsed.search);

    searchParams.delete('token');
    searchParams.delete('wstoken');
    searchParams.set('token', moodleToken);

    return {
      path: `${relativePathname}?${searchParams.toString()}`,
      filename: extractSafeFilename(relativePathname),
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

    const buffer = await readBoundedResponseBuffer(
      response,
      MAX_DOWNLOAD_BYTES,
    );
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
