import type { Request, RequestHandler, Response } from 'express';
import morgan from 'morgan';

export function createAccessLogger(
  stream?: morgan.StreamOptions,
): RequestHandler {
  return morgan<Request, Response>('dev', {
    stream,
    skip: (request) => /^\/timetable\/calendar\/feed\//i.test(request.path),
  });
}
