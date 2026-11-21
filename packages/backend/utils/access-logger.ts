import type { Request, RequestHandler, Response } from 'express';
import morgan from 'morgan';

const CALENDAR_FEED_TOKEN_PATTERN =
  /(\/timetable\/calendar\/feed(?:\/|%2f))([^?\s#]+)/gi;

function redactRequestUrl(url: string): string {
  return url.replace(CALENDAR_FEED_TOKEN_PATTERN, '$1[REDACTED]');
}

morgan.token<Request, Response>('redacted-url', (request) =>
  redactRequestUrl(request.originalUrl || request.url),
);

export function createAccessLogger(
  stream?: morgan.StreamOptions,
): RequestHandler {
  return morgan<Request, Response>(
    ':method :redacted-url :status :response-time ms - :res[content-length]',
    { stream },
  );
}
