import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { buildMoodleParams } from '../../utils/moodle-params-builder';

export interface MoodleException {
  exception: string;
  errorcode: string;
  message: string;
  debuginfo?: string;
}

function isMoodleException(data: unknown): data is MoodleException {
  return typeof data === 'object' && data !== null && 'exception' in data;
}

@Injectable()
export class MoodleClientService {
  private readonly baseUrl =
    process.env.MOODLE_BASEURL || 'https://moodle.karazin.ua';
  private readonly timeout = process.env.MOODLE_TIMEOUT || '15000';
  private readonly logger = new Logger(MoodleClientService.name);

  constructor() {
    if (!this.baseUrl.startsWith('https://')) {
      throw new Error('MOODLE_BASEURL must be a secure URL (https://)');
    }
  }

  async client<T = unknown>(
    wsfunction: string,
    moodleToken?: string,
    moodleId?: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const timeout = Number(this.timeout);

    if (!Number.isFinite(timeout) || timeout <= 0) {
      throw new Error('MOODLE_TIMEOUT must be a positive finite number');
    }

    const url = new URL(`${this.baseUrl}/webservice/rest/server.php`);

    url.searchParams.set('wstoken', moodleToken ?? '');
    url.searchParams.set('wsfunction', wsfunction);
    url.searchParams.set('moodlewsrestformat', 'json');
    const combinedParams = {
      ...(moodleId ? { userid: moodleId } : {}),
      ...params,
    };
    const queryPairs = buildMoodleParams(combinedParams);

    queryPairs.forEach(([key, val]) => {
      url.searchParams.append(key, val);
    });
    this.logger.debug(
      `Sending request to Moodle [${wsfunction}] with params: ${JSON.stringify(params)}`,
    );

    let data: T | MoodleException;

    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(timeout),
        redirect: 'error',
      });

      data = (await response.json()) as T | MoodleException;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new RequestTimeoutException('Moodle request timeout');
      }

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Unknown exception',
      );
    }

    if (isMoodleException(data)) {
      this.logger.error(
        `Moodle Exception [${wsfunction}]: ${data.message} (code: ${data.errorcode})`,
        data.debuginfo ?? '',
      );
      throw new BadRequestException(data.message);
    }

    return data;
  }
}
