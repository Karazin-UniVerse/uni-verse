import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  RequestTimeoutException,
} from '@nestjs/common';
import { buildMoodleParams } from '../../utils/moodle-params-builder';
import { Logger } from '@nestjs/common';
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
  private readonly baseurl = process.env.MOODLE_BASEURL || '';
  private readonly timeout = process.env.MOODLE_TIMEOUT;
  private readonly logger = new Logger(MoodleClientService.name);

  constructor() {
    if (!this.baseurl) {
      throw new Error('MOODLE_BASEURL environment variable is not set');
    }
    if (!this.baseurl.startsWith('https://')) {
      throw new Error('MOODLE_BASEURL must be a secure URL (https://)');
    }
    if (!this.timeout) {
      throw new Error('MOODLE_TIMEOUT environment variable is not set');
    }
  }
  async client<T = unknown>(
    wsfunction: string,
    moodleToken?: string,
    moodleId?: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const timeout = Number(this.timeout) || 5000;
    if (isNaN(timeout) || (timeout <= 0 && !isFinite(timeout))) {
      throw new Error('MOODLE_TIMEOUT must be a positive finite number ');
    }

    const url = new URL(`${this.baseurl}/webservice/rest/server.php`);
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
    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(timeout),
      });
      const data = (await response.json()) as T | MoodleException;
      if (isMoodleException(data)) {
        this.logger.error(
          `Moodle Exception [${wsfunction}]: ${data.message} (code: ${data.errorcode})`,
          data.debuginfo ?? '',
        );
        throw new BadRequestException(data.message);
      }

      return data;
    } catch (e) {
      if (e instanceof Error && e.name === 'TimeoutError') {
        throw new RequestTimeoutException('Moodle request timeout');
      }
      throw new InternalServerErrorException(
        e instanceof Error ? e.message : 'Unknown exception',
      );
    }
  }
}
