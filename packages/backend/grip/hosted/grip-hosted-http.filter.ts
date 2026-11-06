import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { GripConfigException } from '../grip.config';

@Catch(HttpException)
export class GripHostedHttpFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof GripConfigException) {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response
        .status(403)
        .json({
          statusCode: 403,
          message: 'Hosted Grip configuration unavailable',
        });

      return;
    }

    const body = exception.getResponse();

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');

    if (
      exception.getStatus() === 429 &&
      typeof body === 'object' &&
      'retryAfter' in body &&
      typeof body.retryAfter === 'number' &&
      Number.isFinite(body.retryAfter)
    ) {
      response.setHeader(
        'Retry-After',
        Math.max(1, Math.ceil(body.retryAfter)),
      );
    }

    response
      .status(exception.getStatus())
      .json(
        typeof body === 'string'
          ? { statusCode: exception.getStatus(), message: body }
          : body,
      );
  }
}
